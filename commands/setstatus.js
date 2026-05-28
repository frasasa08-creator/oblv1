const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { pool } = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Imposta il canale per lo status del bot')
        .addChannelOption(option =>
            option
                .setName('canale')
                .setDescription('Canale dove verrà mostrato lo status del bot')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const channel = interaction.options.getChannel('canale');

            // Crea il messaggio di status iniziale
            const { EmbedBuilder } = require('discord.js');
            const statusEmbed = new EmbedBuilder()
                .setTitle('🤖 Status Bot')
                .setDescription('**🟢 ONLINE**\nIl bot è attivo e funzionante')
                .addFields(
                    { name: '🕒 Ultimo avvio', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '🏠 Server', value: interaction.guild.name, inline: true },
                    { name: '📊 Ping', value: 'Calcolando...', inline: true }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            const statusMessage = await channel.send({ embeds: [statusEmbed] });

            // Salva nel database
            await pool.query(`
                INSERT INTO bot_status (guild_id, status_channel_id, status_message_id)
                VALUES (?, ?, ?)
                ON CONFLICT (guild_id)
                DO UPDATE SET
                    status_channel_id = excluded.status_channel_id,
                    status_message_id = excluded.status_message_id,
                    updated_at = datetime('now')
            `, [interaction.guild.id, channel.id, statusMessage.id]);


            await interaction.editReply({
                content: `✅ Canale status impostato a ${channel.toString()}!`
            });

            console.log(`✅ Status channel impostato per ${interaction.guild.name}`);

        } catch (error) {
            console.error('Errore comando setstatus:', error);
            await interaction.editReply({
                content: `❌ Errore durante la configurazione: ${error.message}`
            });
        }
    },
};