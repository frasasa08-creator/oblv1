const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { pool } = require('../database.js');

// Funzione per controllare i permessi
async function checkPermissions(interaction) {
    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    const result = await pool.query(
        'SELECT settings FROM guild_settings WHERE guild_id = ?',
        [interaction.guild.id]
    );

    if (result.rows.length === 0) {
        return false;
    }

    const settings = result.rows[0].settings || {};
    const allowedRoles = settings.allowed_roles || [];
    const userRoles = interaction.member.roles.cache;
    return allowedRoles.some(roleId => userRoles.has(roleId));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('Configura i canali di log del server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Imposta il canale per le welcome images')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per le welcome images')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcomelog')
                .setDescription('Imposta il canale per i log degli arrivi')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per i log arrivi')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('quitlog')
                .setDescription('Imposta il canale per i log delle uscite')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per i log uscite')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('modlog')
                .setDescription('Imposta il canale per i log di moderazione')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per i log moderazione (kick, ban, timeout)')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        // AGGIUNGI QUESTI NUOVI SUBCOMMANDS
        .addSubcommand(subcommand =>
            subcommand
                .setName('rolelog')
                .setDescription('Imposta il canale per i log dei ruoli')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per i log ruoli (creazione/modifica/eliminazione)')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channellog')
                .setDescription('Imposta il canale per i log dei canali')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per i log canali (creazione/modifica/eliminazione)')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('messagelog')
                .setDescription('Imposta il canale per i log dei messaggi')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per i log messaggi (eliminazioni)')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ticketlog')
                .setDescription('Imposta il canale per i log dei ticket')
                .addChannelOption(option =>
                    option
                        .setName('canale')
                        .setDescription('Canale per i log ticket')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcomeimage')
                .setDescription('Imposta l\'immagine di sfondo per il welcome')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('URL dell\'immagine di sfondo')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Mostra la configurazione attuale dei log')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            // Controllo permessi
            const hasPermission = await checkPermissions(interaction);
            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ Non hai i permessi necessari per utilizzare questo comando.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'show') {
                // Mostra configurazione attuale
                const result = await pool.query(
                    'SELECT welcome_channel_id, welcome_log_channel_id, quit_log_channel_id, moderation_log_channel_id, role_log_channel_id, channel_log_channel_id, message_log_channel_id, ticket_log_channel_id, welcome_image_url, settings FROM guild_settings WHERE guild_id = ?',
                    [interaction.guild.id]
                );

                if (result.rows.length === 0) {
                    return await interaction.editReply({
                        content: '❌ Nessuna configurazione trovata per questo server!'
                    });
                }

                const config = result.rows[0];
                const settings = config.settings || {};
                const allowedRolesCount = settings.allowed_roles ? settings.allowed_roles.length : 0;

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Configurazione Logs')
                    .setDescription('Configurazione attuale dei canali di log:')
                    .addFields(
                        { 
                            name: '🖼️ Welcome Image', 
                            value: config.welcome_channel_id ? `<#${config.welcome_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '🖼️ URL Immagine Welcome', 
                            value: config.welcome_image_url ? `[🔗 Link](${config.welcome_image_url})` : '❌ Non impostata', 
                            inline: true 
                        },
                        { 
                            name: '📥 Log Arrivi', 
                            value: config.welcome_log_channel_id ? `<#${config.welcome_log_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '📤 Log Uscite', 
                            value: config.quit_log_channel_id ? `<#${config.quit_log_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '🛡️ Log Moderazione', 
                            value: config.moderation_log_channel_id ? `<#${config.moderation_log_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '🏷️ Log Ruoli', 
                            value: config.role_log_channel_id ? `<#${config.role_log_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '📁 Log Canali', 
                            value: config.channel_log_channel_id ? `<#${config.channel_log_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '🗑️ Log Messaggi', 
                            value: config.message_log_channel_id ? `<#${config.message_log_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '🎫 Log Ticket', 
                            value: config.ticket_log_channel_id ? `<#${config.ticket_log_channel_id}>` : '❌ Non impostato', 
                            inline: true 
                        },
                        { 
                            name: '👥 Ruoli Autorizzati', 
                            value: allowedRolesCount > 0 ? `${allowedRolesCount} ruolo(i)` : 'Nessun ruolo specificato', 
                            inline: false 
                        }
                    )
                    .setColor(0x0099FF)
                    .setTimestamp();

                if (config.welcome_image_url) {
                    embed.setImage(config.welcome_image_url);
                }

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (subcommand === 'welcomeimage') {
                const imageUrl = interaction.options.getString('url');
                
                try {
                    new URL(imageUrl);
                } catch {
                    return await interaction.editReply({
                        content: '❌ Inserisci un URL valido per l\'immagine!'
                    });
                }

                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                const isImageUrl = imageExtensions.some(ext => imageUrl.toLowerCase().includes(ext));
                
                if (!isImageUrl) {
                    return await interaction.editReply({
                        content: '❌ L\'URL deve puntare a un\'immagine (jpg, png, gif, webp)!'
                    });
                }

                await pool.query(`
                    INSERT INTO guild_settings (guild_id, welcome_image_url)
                    VALUES (?, ?)
                    ON CONFLICT (guild_id)
                    DO UPDATE SET welcome_image_url = ?, updated_at = datetime('now')
                `, [interaction.guild.id, imageUrl, imageUrl]);

                await interaction.editReply({
                    content: `✅ Immagine welcome impostata!\n**URL:** ${imageUrl}`
                });

                console.log(`✅ Immagine welcome aggiornata per il server ${interaction.guild.name}`);
                return;
            }

            const channel = interaction.options.getChannel('canale');
            let fieldName = '';
            let description = '';

            switch (subcommand) {
                case 'welcome':
                    fieldName = 'welcome_channel_id';
                    description = `🖼️ Canale welcome image impostato a ${channel.toString()}`;
                    break;
                case 'welcomelog':
                    fieldName = 'welcome_log_channel_id';
                    description = `📥 Canale log arrivi impostato a ${channel.toString()}`;
                    break;
                case 'quitlog':
                    fieldName = 'quit_log_channel_id';
                    description = `📤 Canale log uscite impostato a ${channel.toString()}`;
                    break;
                case 'modlog':
                    fieldName = 'moderation_log_channel_id';
                    description = `🛡️ Canale log moderazione impostato a ${channel.toString()}`;
                    break;
                // AGGIUNGI QUESTI NUOVI CASI
                case 'rolelog':
                    fieldName = 'role_log_channel_id';
                    description = `🏷️ Canale log ruoli impostato a ${channel.toString()}`;
                    break;
                case 'channellog':
                    fieldName = 'channel_log_channel_id';
                    description = `📁 Canale log canali impostato a ${channel.toString()}`;
                    break;
                case 'messagelog':
                    fieldName = 'message_log_channel_id';
                    description = `🗑️ Canale log messaggi impostato a ${channel.toString()}`;
                    break;
                case 'ticketlog':
                    fieldName = 'ticket_log_channel_id';
                    description = `🎫 Canale log ticket impostato a ${channel.toString()}`;
                    break;
            }

            await pool.query(`
                INSERT INTO guild_settings (guild_id, ${fieldName})
                VALUES (?, ?)
                ON CONFLICT (guild_id)
                DO UPDATE SET ${fieldName} = ?, updated_at = datetime('now')
            `, [interaction.guild.id, channel.id, channel.id]);

            await interaction.editReply({
                content: `✅ ${description}`
            });

            console.log(`✅ Configurazione ${fieldName} aggiornata per il server ${interaction.guild.name}`);

        } catch (error) {
            console.error('Errore comando setlogs:', error);
            await interaction.editReply({
                content: `❌ Errore durante la configurazione: ${error.message}`
            });
        }
    },
};