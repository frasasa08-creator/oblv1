const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        const botName = process.env.BOT_NAME || 'BossBot';
        console.log(`✅ ${botName} is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Servers: ${client.guilds.cache.size}`);
        console.log(`👥 Users: ${client.users.cache.size}`);

        // Set bot activity
        client.user.setActivity('Managing servers', { type: 'WATCHING' });

        console.log(`🎉 ${botName} is now online and ready to serve!`);
    },
};
