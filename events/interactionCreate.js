const { Events, InteractionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, ChannelType, ModalBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client, pool) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction, pool);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            }
        }
        // Handle select menu interactions (for ticket panel)
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'ticket_select') {
                await handleTicketSelect(interaction, client, pool);
            }
        }
        // Handle button interactions (for ticket close/claim/edit)
        else if (interaction.isButton()) {
            if (interaction.customId === 'ticket_close') {
                await handleTicketClose(interaction, client, pool);
            } else if (interaction.customId === 'ticket_claim') {
                await handleTicketClaim(interaction, pool);
            } else if (interaction.customId === 'ticket_edit') {
                await handleTicketEdit(interaction, client, pool);
            }
        }
        // Handle modal submit (for ticket edit)
        else if (interaction.type === InteractionType.ModalSubmit) {
            if (interaction.customId === 'ticket_edit_modal') {
                await handleTicketEditModal(interaction, client, pool);
            }
        }
    },
};

// Handle ticket select menu interaction
async function handleTicketSelect(interaction, client, pool) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Get ticket configuration
        const result = await pool.query(
            'SELECT * FROM ticket_config WHERE guild_id = ?',
            [interaction.guildId]
        );

        if (result.rows.length === 0) {
            return await interaction.editReply({
                content: '❌ No ticket configuration found.',
                ephemeral: true
            });
        }

        const config = result.rows[0];
        const options = JSON.parse(config.options || '[]');

        // Get the selected option
        const selectedIndex = parseInt(interaction.values[0].replace('ticket_', ''));
        const selectedOption = options[selectedIndex];

        if (!selectedOption) {
            return await interaction.editReply({
                content: '❌ Invalid ticket option.',
                ephemeral: true
            });
        }

        // Check for orphaned tickets (tickets with status 'open' but channel doesn't exist)
        const openTickets = await pool.query(
            'SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = ?',
            [interaction.guildId, interaction.user.id, 'open']
        );

        let hasValidOpenTicket = false;
        let validOpenTicket = null;

        for (const ticket of openTickets.rows) {
            const channelExists = interaction.guild.channels.cache.get(ticket.channel_id);
            if (!channelExists) {
                // Clean up orphaned ticket
                console.log(`Cleaning up orphaned ticket: ${ticket.id}`);
                await pool.query(
                    'UPDATE tickets SET status = ?, closed_at = datetime(\'now\'), close_reason = ? WHERE id = ?',
                    ['closed', 'Orphaned ticket - channel deleted', ticket.id]
                );
            } else {
                hasValidOpenTicket = true;
                validOpenTicket = ticket;
            }
        }

        if (hasValidOpenTicket && validOpenTicket) {
            const existingChannel = interaction.guild.channels.cache.get(validOpenTicket.channel_id);
            return await interaction.editReply({
                content: `❌ You already have an open ticket: ${existingChannel ? existingChannel.toString() : 'Unknown channel'}`,
                ephemeral: true
            });
        }

        // Create or find category for this ticket option
        const categoryName = selectedOption.label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        let category = interaction.guild.channels.cache.find(ch =>
            ch.type === ChannelType.GuildCategory && ch.name === categoryName
        );

        if (!category) {
            category = await interaction.guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
            console.log(`✅ Created category: ${categoryName}`);
        }

        // Create ticket channel with format: name_options-user_id
        const ticketName = `${selectedOption.label.replace(/[^a-zA-Z0-9]/g, '-')}-${interaction.user.username}`;
        const ticketChannel = await interaction.guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.ManageMessages
                    ]
                }
            ]
        });

        // Save ticket to database
        await pool.query(
            'INSERT INTO tickets (guild_id, user_id, channel_id, ticket_type, status, channel_name, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [interaction.guildId, interaction.user.id, ticketChannel.id, selectedOption.label, 'open', ticketName, categoryName]
        );

        // Create ticket embed with buttons
        const embed = new EmbedBuilder()
            .setTitle(`${selectedOption.emoji} ${selectedOption.label}`)
            .setDescription(`Thank you for creating a ticket! Our support team will be with you shortly.`)
            .addFields(
                { name: '👤 User', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🆔 User ID', value: interaction.user.id, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setColor(config.embed_color ? parseInt(config.embed_color.replace('#', ''), 16) : 0x5865F2)
            .setTimestamp()
            .setFooter({ text: config.footer_text || `Ticket created by ${interaction.user.tag}` });

        if (config.panel_image) {
            embed.setImage(config.panel_image);
        }

        // Create action row with buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('🔒 Claim Ticket')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_edit')
                    .setLabel('✏️ Edit Ticket')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('❌ Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({
            content: `<@${interaction.user.id}>`,
            embeds: [embed],
            components: [row]
        });

        // Send confirmation to user
        await interaction.editReply({
            content: `✅ Your ticket has been created in ${ticketChannel}!`,
            ephemeral: true
        });

        console.log(`✅ Ticket created: ${ticketName} for ${interaction.user.tag}`);

    } catch (error) {
        console.error('Error handling ticket select:', error);
        await interaction.editReply({
            content: '❌ There was an error creating your ticket. Please try again.',
            ephemeral: true
        });
    }
}

// Handle ticket claim
async function handleTicketClaim(interaction, pool) {
    try {
        await interaction.deferReply();

        // Get ticket from database
        const result = await pool.query(
            'SELECT * FROM tickets WHERE channel_id = ? AND status = ?',
            [interaction.channelId, 'open']
        );

        if (result.rows.length === 0) {
            return await interaction.editReply({
                content: '❌ This ticket is not open or does not exist.',
                ephemeral: true
            });
        }

        const ticket = result.rows[0];

        // Update ticket with claim info
        await pool.query(
            'UPDATE tickets SET claimed_by = ? WHERE id = ?',
            [interaction.user.id, ticket.id]
        );

        // Update embed
        const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket Claimed')
            .setDescription(`This ticket has been claimed by <@${interaction.user.id}>`)
            .addFields(
                { name: '👤 Original User', value: `<@${ticket.user_id}>`, inline: true },
                { name: '🛡️ Claimed By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setColor(0x00FF00)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        console.log(`✅ Ticket claimed by ${interaction.user.tag}`);

    } catch (error) {
        console.error('Error handling ticket claim:', error);
        await interaction.editReply({
            content: '❌ There was an error claiming this ticket.',
            ephemeral: true
        });
    }
}

// Handle ticket close
async function handleTicketClose(interaction, client, pool) {
    try {
        await interaction.deferReply();

        // Get ticket from database
        const result = await pool.query(
            'SELECT * FROM tickets WHERE channel_id = ? AND status = ?',
            [interaction.channelId, 'open']
        );

        if (result.rows.length === 0) {
            return await interaction.editReply({
                content: '❌ This ticket is not open or does not exist.',
                ephemeral: true
            });
        }

        const ticket = result.rows[0];

        // Get ticket configuration for log channel
        const configResult = await pool.query(
            'SELECT * FROM ticket_config WHERE guild_id = ?',
            [interaction.guildId]
        );

        const config = configResult.rows[0];
        const logChannelId = config?.log_channel;

        // Create transcript
        const transcript = await createTranscript(interaction.channel);

        // Update ticket status
        await pool.query(
            'UPDATE tickets SET status = ?, closed_at = ?, close_reason = ? WHERE id = ?',
            ['closed', new Date().toISOString(), 'Closed by staff', ticket.id]
        );

        // Send transcript to log channel
        if (logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const transcriptEmbed = new EmbedBuilder()
                    .setTitle('📋 Ticket Transcript')
                    .setDescription(`Ticket for <@${ticket.user_id}> has been closed.`)
                    .addFields(
                        { name: '🎫 Ticket Type', value: ticket.ticket_type, inline: true },
                        { name: '👤 User', value: `<@${ticket.user_id}>`, inline: true },
                        { name: '🛡️ Closed By', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📅 Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();

                await logChannel.send({
                    embeds: [transcriptEmbed],
                    files: [{ attachment: transcript, name: `transcript-${ticket.channel_name}.txt` }]
                });
            }
        }

        // Send transcript to user via DM
        try {
            const user = await client.users.fetch(ticket.user_id);
            const dmEmbed = new EmbedBuilder()
                .setTitle('📋 Your Ticket Has Been Closed')
                .setDescription(`Your ticket "${ticket.ticket_type}" has been closed.`)
                .addFields(
                    { name: '🎫 Ticket Type', value: ticket.ticket_type, inline: true },
                    { name: '📅 Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setColor(0xFF0000)
                .setTimestamp();

            await user.send({
                embeds: [dmEmbed],
                files: [{ attachment: transcript, name: `transcript-${ticket.channel_name}.txt` }]
            });
        } catch (dmError) {
            console.error('Could not send DM to user:', dmError);
        }

        // Close the channel
        await interaction.channel.delete('Ticket closed');

        console.log(`✅ Ticket closed: ${ticket.channel_name}`);

    } catch (error) {
        console.error('Error handling ticket close:', error);
        await interaction.editReply({
            content: '❌ There was an error closing this ticket.',
            ephemeral: true
        });
    }
}

// Create transcript from channel messages (using .gg-oblivion style)
async function createTranscript(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const sortedMessages = Array.from(messages.values()).reverse();
        const guild = channel.guild;

        if (sortedMessages.length === 0) {
            return Buffer.from(`TRANSCRIPT - ${channel.name}\nNo messages found in this ticket.`, 'utf-8');
        }

        let transcriptLines = [];
        transcriptLines.push('='.repeat(50));
        transcriptLines.push(`TRANSCRIPT - ${channel.name}`);
        transcriptLines.push(`Guild: ${guild.name}`);
        transcriptLines.push(`Created: ${new Date().toISOString()}`);
        transcriptLines.push('='.repeat(50));
        transcriptLines.push('');

        for (const message of sortedMessages) {
            const timestamp = new Date(message.createdTimestamp).toLocaleString();
            const author = message.author ? message.author.tag : 'Unknown';
            const authorId = message.author ? message.author.id : 'Unknown';
            let content = message.content || '[No content]';

            // Process mentions
            content = content.replace(/<@!?(\d+)>/g, (match, userId) => {
                const user = guild.client.users.cache.get(userId);
                return user ? `@${user.username}` : '@UnknownUser';
            });
            content = content.replace(/<@&(\d+)>/g, (match, roleId) => {
                const role = guild.roles.cache.get(roleId);
                return role ? `@${role.name}` : '@UnknownRole';
            });
            content = content.replace(/<#(\d+)>/g, (match, channelId) => {
                const ch = guild.channels.cache.get(channelId);
                return ch ? `#${ch.name}` : '#unknown';
            });

            transcriptLines.push(`[${timestamp}] ${author} (ID: ${authorId}):`);
            transcriptLines.push(content);
            transcriptLines.push('');

            if (message.attachments && message.attachments.size > 0) {
                transcriptLines.push(`[Attachments: ${message.attachments.size}]`);
                message.attachments.forEach(attachment => {
                    transcriptLines.push(`- ${attachment.name} (${attachment.url})`);
                });
                transcriptLines.push('');
            }

            if (message.embeds && message.embeds.length > 0) {
                transcriptLines.push(`[Embed: ${message.embeds.length}]`);
                message.embeds.forEach((embed, index) => {
                    if (embed.title) transcriptLines.push(`  Title: ${embed.title}`);
                    if (embed.description) transcriptLines.push(`  Description: ${embed.description.substring(0, 200)}...`);
                    if (embed.fields && embed.fields.length > 0) {
                        transcriptLines.push(`  Fields: ${embed.fields.length}`);
                    }
                });
                transcriptLines.push('');
            }
        }

        transcriptLines.push('='.repeat(50));
        transcriptLines.push('END OF TRANSCRIPT');
        transcriptLines.push('='.repeat(50));

        return Buffer.from(transcriptLines.join('\n'), 'utf-8');
    } catch (error) {
        console.error('Error creating transcript:', error);
        return Buffer.from(`TRANSCRIPT - ${channel.name}\nError generating transcript: ${error.message}`, 'utf-8');
    }
}

// Handle ticket edit
async function handleTicketEdit(interaction, client, pool) {
    try {
        // Check if user has permission (admin or allowed roles)
        const hasPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasPermission) {
            const result = await pool.query(
                'SELECT settings FROM guild_settings WHERE guild_id = ?',
                [interaction.guildId]
            );

            if (result.rows.length === 0) {
                return await interaction.reply({
                    content: '❌ You don\'t have permission to edit tickets.',
                    ephemeral: true
                });
            }

            const settings = result.rows[0].settings || {};
            const allowedRoles = settings.allowed_roles || [];
            const userRoles = interaction.member.roles.cache;

            if (!allowedRoles.some(roleId => userRoles.has(roleId))) {
                return await interaction.reply({
                    content: '❌ You don\'t have permission to edit tickets.',
                    ephemeral: true
                });
            }
        }

        // Get ticket from database
        const result = await pool.query(
            'SELECT * FROM tickets WHERE channel_id = ? AND status = ?',
            [interaction.channelId, 'open']
        );

        if (result.rows.length === 0) {
            return await interaction.reply({
                content: '❌ This ticket is not open or does not exist.',
                ephemeral: true
            });
        }

        const ticket = result.rows[0];

        // Create edit modal
        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

        const modal = new ModalBuilder()
            .setCustomId('ticket_edit_modal')
            .setTitle('Edit Ticket');

        const categoryInput = new TextInputBuilder()
            .setCustomId('ticket_category')
            .setLabel('Category Name')
            .setPlaceholder('Enter new category name')
            .setValue(ticket.ticket_type)
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const claimedByInput = new TextInputBuilder()
            .setCustomId('ticket_claimed_by')
            .setLabel('Claimed By (User ID or @mention)')
            .setPlaceholder('Enter user ID or mention')
            .setValue(ticket.claimed_by || '')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const firstActionRow = new ActionRowBuilder().addComponents(categoryInput);
        const secondActionRow = new ActionRowBuilder().addComponents(claimedByInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);

        // Store ticket info for modal submit
        client.activeTicketEdits = client.activeTicketEdits || new Map();
        client.activeTicketEdits.set(interaction.user.id, {
            ticketId: ticket.id,
            channelId: ticket.channel_id,
            guildId: interaction.guildId
        });

    } catch (error) {
        console.error('Error handling ticket edit:', error);
        await interaction.reply({
            content: '❌ There was an error opening the edit menu.',
            ephemeral: true
        });
    }
}

// Handle modal submit for ticket edit
async function handleTicketEditModal(interaction, client, pool) {
    try {
        const ticketInfo = client.activeTicketEdits.get(interaction.user.id);
        if (!ticketInfo) {
            return await interaction.reply({
                content: '❌ Session expired. Please try again.',
                ephemeral: true
            });
        }

        const category = interaction.fields.getTextInputValue('ticket_category');
        const claimedByInput = interaction.fields.getTextInputValue('ticket_claimed_by');

        // Get current ticket
        const result = await pool.query(
            'SELECT * FROM tickets WHERE id = ?',
            [ticketInfo.ticketId]
        );

        if (result.rows.length === 0) {
            return await interaction.reply({
                content: '❌ Ticket not found.',
                ephemeral: true
            });
        }

        const ticket = result.rows[0];
        const guild = await client.guilds.fetch(ticketInfo.guildId);
        const channel = guild.channels.cache.get(ticketInfo.channelId);

        let changes = [];

        // Update category if changed
        if (category && category !== ticket.ticket_type) {
            // Create or find new category
            const categoryName = category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            let newCategory = guild.channels.cache.find(ch =>
                ch.type === ChannelType.GuildCategory && ch.name === categoryName
            );

            if (!newCategory) {
                newCategory = await guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });
            }

            // Move channel to new category
            await channel.setParent(newCategory.id);

            // Update database
            await pool.query(
                'UPDATE tickets SET ticket_type = ? WHERE id = ?',
                [category, ticket.id]
            );

            changes.push(`Category changed to "${category}"`);
        }

        // Update claimed by if changed
        if (claimedByInput && claimedByInput !== ticket.claimed_by) {
            // Parse user ID from mention or raw ID
            let userId = claimedByInput;
            const mentionMatch = claimedByInput.match(/<@!?(\d+)>/);
            if (mentionMatch) {
                userId = mentionMatch[1];
            }

            await pool.query(
                'UPDATE tickets SET claimed_by = ? WHERE id = ?',
                [userId, ticket.id]
            );

            changes.push(`Claimed by changed to <@${userId}>`);
        }

        if (changes.length === 0) {
            return await interaction.reply({
                content: '⚠️ No changes were made.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `✅ Ticket updated:\n${changes.join('\n')}`,
            ephemeral: true
        });

        // Clear the session
        client.activeTicketEdits.delete(interaction.user.id);

    } catch (error) {
        console.error('Error handling ticket edit modal:', error);
        await interaction.reply({
            content: '❌ There was an error updating the ticket.',
            ephemeral: true
        });
    }
}
