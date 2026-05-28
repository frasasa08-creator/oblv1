const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { pool } = require('../database.js');

// Funzione per controllare i permessi
async function checkPermissions(interaction) {
    // Se l'utente è amministratore, permetti sempre
    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    // Recupera i ruoli autorizzati dal database
    const result = await pool.query(
        'SELECT settings FROM guild_settings WHERE guild_id = ?',
        [interaction.guild.id]
    );

    if (result.rows.length === 0) {
        return false; // Nessuna configurazione, solo admin
    }

    const settings = result.rows[0].settings || {};
    const allowedRoles = settings.allowed_roles || [];

    // Controlla se l'utente ha almeno uno dei ruoli autorizzati
    const userRoles = interaction.member.roles.cache;
    return allowedRoles.some(roleId => userRoles.has(roleId));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket_panel')
        .setDescription('Crea un pannello ticket personalizzato')
        .addChannelOption(option =>
            option.setName('ticket_log_channel')
                .setDescription('Canale per i log dei ticket')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Titolo del pannello ticket')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Descrizione del pannello (usa \\n per andare a capo)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Opzioni del menu (formato: emoji|nome|categoria,emoji2|nome2|categoria2)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Colore dell\'embed (hex, es: #ff0000)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL immagine per l\'embed')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Controllo permessi
            const hasPermission = await checkPermissions(interaction);
            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ Non hai i permessi necessari per utilizzare questo comando.',
                    flags: 64
                });
            }

            // Verifica se l'interazione è ancora valida PRIMA di deferReply
            if (interaction.deferred || interaction.replied) {
                console.log('⚠️ Interazione già processata, skipping...');
                return;
            }

            await interaction.deferReply({ flags: 64 });

            const ticketLogChannel = interaction.options.getChannel('ticket_log_channel');
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description').replace(/\\n/g, '\n');
            const color = interaction.options.getString('color') || '#0099ff';
            const image = interaction.options.getString('image');
            const optionsString = interaction.options.getString('options');

            // Parsing delle opzioni
            const optionsParsed = [];
            const optionsArray = optionsString.split(',');
            
            for (let i = 0; i < optionsArray.length; i++) {
                const parts = optionsArray[i].trim().split('|');
                if (parts.length !== 3) {
                    return await interaction.editReply({
                        content: `❌ Formato opzioni non valido! Usa: emoji|nome|categoria\nErrore nell'opzione ${i + 1}: ${optionsArray[i]}`
                    });
                }

                const [emoji, name, category] = parts;
                optionsParsed.push({
                    emoji: emoji.trim(),
                    name: name.trim(),
                    category: category.trim(),
                    value: `ticket_${i}`
                });
            }

            // Validazione colore
            const hexColorRegex = /^#[0-9A-F]{6}$/i;
            if (!hexColorRegex.test(color)) {
                return await interaction.editReply({
                    content: '❌ Colore non valido! Usa il formato hex: #ff0000'
                });
            }

            // Salva le configurazioni nel database
            await pool.query(`
                INSERT INTO guild_settings (guild_id, ticket_log_channel_id, settings)
                VALUES (?, ?, ?)
                ON CONFLICT (guild_id)
                DO UPDATE SET
                    ticket_log_channel_id = ?,
                    settings = ?,
                    updated_at = datetime('now')
            `, [
                interaction.guild.id,
                ticketLogChannel.id,
                JSON.stringify({ ticket_options: optionsParsed }),
                ticketLogChannel.id,
                JSON.stringify({ ticket_options: optionsParsed })
            ]);

            // Crea l'embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                //.setTimestamp()
                .setFooter({ 
                    text: 'Powered by @sasa1111',
                    iconURL: interaction.guild.iconURL() 
                });

            if (image) {
                embed.setImage(image);
            }

            // Crea il menu select
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('🎟 Scegli una opzione...')
                .setMinValues(1)
                .setMaxValues(1);

            // Aggiungi le opzioni al menu
            for (const option of optionsParsed) {
                selectMenu.addOptions({
                    label: option.name,
                    value: option.value,
                    emoji: option.emoji,
                    description: option.name
                });
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Invia il pannello
            await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });

            await interaction.editReply({
                content: '✅ Pannello ticket creato con successo!'
            });

        } catch (error) {
            console.error('Errore creazione ticket panel:', error);
            console.error('Stack trace:', error.stack);
            
            if (error.code === 10062) {
                console.log('⚠️ Interazione scaduta durante la creazione del panel');
                return;
            }
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: `❌ Errore durante la creazione del pannello ticket: ${error.message}`,
                        flags: 64
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content: `❌ Errore durante la creazione del pannello ticket: ${error.message}`
                    });
                }
            } catch (replyError) {
                console.error('Errore anche nel reply di fallback:', replyError.message);
            }
        }
    },
};
