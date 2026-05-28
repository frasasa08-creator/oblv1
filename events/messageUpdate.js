const { Events } = require('discord.js');
const { resolveLogChannel, saveServerLog, sendLogEmbed, truncate } = require('../utils/logUtils');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (oldMessage.partial) {
            try { await oldMessage.fetch(); } catch (_) {}
        }
        if (newMessage.partial) {
            try { await newMessage.fetch(); } catch (_) {}
        }
        if (!newMessage.guild) return;
        if (newMessage.author?.bot) return;
        if ((oldMessage.content || '') === (newMessage.content || '')) return;

        const guild = newMessage.guild;
        const channelName = newMessage.channel?.name ? `#${newMessage.channel.name}` : 'Unknown';
        const oldContent = truncate(oldMessage.content || '(empty)', 900);
        const newContent = truncate(newMessage.content || '(empty)', 900);

        const details = `Edited By: ${newMessage.author.tag} (${newMessage.author.id}) | Channel: ${channelName} (${newMessage.channel.id}) | Message ID: ${newMessage.id} | Before: ${oldContent} | After: ${newContent}`;

        await saveServerLog({
            guildId: guild.id,
            logType: 'messageedited',
            message: `Message edited in ${channelName}`,
            details,
            userId: newMessage.author.id,
            userTag: newMessage.author.tag
        });

        const logChannel = await resolveLogChannel(guild, 'message_log_channel_id');
        await sendLogEmbed(logChannel, 'Message Edited', [
            { name: 'Edited By', value: `${newMessage.author.tag} (${newMessage.author.id})` },
            { name: 'Channel', value: `${channelName} (${newMessage.channel.id})` },
            { name: 'Before', value: oldContent },
            { name: 'After', value: newContent }
        ], 0x3498DB);
    }
};
