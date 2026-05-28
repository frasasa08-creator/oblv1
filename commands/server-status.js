// commands/server-status.js
const { SlashCommandBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-status')
        .setDescription('Mostra lo stato del server e del bot'),

    async execute(interaction) {
        // ✅ SOLO TU PUOI USARLO
        const OWNER_IDS = ['1140218068417650823'];
        
        if (!OWNER_IDS.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: '❌ **Accesso Negato**\nSolo il proprietario può vedere lo status.',
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        // 📊 Informazioni sistema
        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: {
                total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
                free: Math.round(os.freemem() / 1024 / 1024 / 1024),
                used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024)
            },
            uptime: Math.round(os.uptime() / 60 / 60),
            load: os.loadavg()
        };

        // 📊 Informazioni bot
        const botInfo = {
            guilds: interaction.client.guilds.cache.size,
            users: interaction.client.users.cache.size,
            ping: interaction.client.ws.ping,
            uptime: Math.round(process.uptime() / 60 / 60),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        };

        const embed = {
            title: '🖥️ Status Server & Bot',
            color: 0x00ff00,
            fields: [
                {
                    name: '📟 SISTEMA',
                    value: `**OS**: ${systemInfo.platform} ${systemInfo.arch}\n` +
                           `**CPU**: ${systemInfo.cpus} core | Load: ${systemInfo.load[0].toFixed(2)}\n` +
                           `**RAM**: ${systemInfo.memory.used}GB/${systemInfo.memory.total}GB (${Math.round((systemInfo.memory.used / systemInfo.memory.total) * 100)}%)\n` +
                           `**Uptime**: ${systemInfo.uptime}h`,
                    inline: false
                },
                {
                    name: '🤖 BOT',
                    value: `**Server**: ${botInfo.guilds}\n` +
                           `**Utenti**: ${botInfo.users}\n` +
                           `**Ping**: ${botInfo.ping}ms\n` +
                           `**Uptime**: ${botInfo.uptime}h\n` +
                           `**RAM Bot**: ${botInfo.memory}MB`,
                    inline: false
                },
                {
                    name: '🌐 RENDER',
                    value: `**URL**: ${process.env.RENDER_EXTERNAL_URL || 'N/A'}\n` +
                           `**Porta**: ${process.env.PORT || 3000}\n` +
                           `**Ambiente**: ${process.env.NODE_ENV || 'development'}`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString()
        };

        interaction.editReply({ embeds: [embed] });
    }
};
