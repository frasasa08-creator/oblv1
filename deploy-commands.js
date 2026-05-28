// Deploy Commands to Discord
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [];
const commandFiles = [
    './commands/allowedroles.js',
    './commands/clear.js',
    './commands/forcecloseticket.js',
    './commands/logs.js',
    './commands/message.js',
    './commands/role-add.js',
    './commands/role-list.js',
    './commands/role-remove.js',
    './commands/server-info.js',
    './commands/server-status.js',
    './commands/setlogs.js',
    './commands/setstatus.js',
    './commands/setup_verify.js',
    './commands/setup_welcome.js',
    './commands/terminal.js',
    './commands/ticket_panel.js',
    './commands/create-ticket-panel.js'
];

for (const file of commandFiles) {
    try {
        const command = require(file);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        }
    } catch (error) {
        console.error(`❌ Error loading command ${file}:`, error);
    }
}

// Deploy commands
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
