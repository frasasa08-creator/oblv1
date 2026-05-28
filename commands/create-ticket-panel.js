// Create Ticket Panel from Database Configuration
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-ticket-panel')
        .setDescription('Create a ticket panel from web panel configuration'),

    async execute(interaction, pool) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Get ticket configuration from database
            const result = await pool.query(
                'SELECT * FROM ticket_config WHERE guild_id = ?',
                [interaction.guildId]
            );

            if (result.rows.length === 0) {
                return await interaction.editReply({
                    content: '❌ No ticket configuration found. Please configure the ticket system in the web panel first.',
                    ephemeral: true
                });
            }

            const config = result.rows[0];
            const options = JSON.parse(config.options || '[]');

            if (options.length === 0) {
                return await interaction.editReply({
                    content: '❌ No ticket options configured. Please add ticket options in the web panel first.',
                    ephemeral: true
                });
            }

            // Create select menu options
            const selectOptions = options.map((opt, index) => ({
                label: opt.label.substring(0, 100),
                value: `ticket_${index}`,
                description: opt.label.substring(0, 100),
                emoji: opt.emoji || '🎫'
            }));

            // Create the select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('Select a ticket type...')
                .addOptions(selectOptions);

            // Create action row
            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(config.title || '🎫 Support Tickets')
                .setDescription(config.description || 'Select a ticket type below to create a support ticket.')
                .setColor(config.embed_color ? parseInt(config.embed_color.replace('#', ''), 16) : 0x5865F2);

            if (config.show_timestamp) {
                embed.setTimestamp();
            }

            if (config.footer_text) {
                embed.setFooter({ text: config.footer_text });
            }

            if (config.panel_image) {
                embed.setImage(config.panel_image);
            }

            // Send to the channel where command was used
            await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });

            await interaction.editReply({
                content: '✅ Ticket panel created successfully!',
                ephemeral: true
            });

        } catch (error) {
            console.error('Error creating ticket panel:', error);
            await interaction.editReply({
                content: '❌ Error creating ticket panel. Please try again.',
                ephemeral: true
            });
        }
    }
};
