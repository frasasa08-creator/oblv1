const { Events, AuditLogEvent } = require('discord.js');
const { resolveLogChannel, saveServerLog, sendLogEmbed, truncate } = require('../utils/logUtils');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (!message.guild) return;

        const guild = message.guild;
        const authorId = message.author?.id || 'unknown';
        const authorTag = message.author?.tag || 'Unknown User';
        if (message.author?.bot) return;
        const channelName = message.channel?.name ? `#${message.channel.name}` : 'Unknown';
        const content = truncate(message.content || '(no text content)', 900);

        let deletedById = null;
        let deletedByTag = 'Unknown';
        try {
            const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 6 });
            const entry = logs.entries.find(e =>
                e.targetId === authorId &&
                e.extra?.channel?.id === message.channel.id &&
                Date.now() - e.createdTimestamp < 10000
            );
            if (entry) {
                deletedById = entry.executorId;
                deletedByTag = entry.executor?.tag || 'Unknown';
            }
        } catch (_) {}

        const details = `Author: ${authorTag} (${authorId || 'N/A'}) | Deleted By: ${deletedByTag} (${deletedById || 'N/A'}) | Channel: ${channelName} (${message.channel?.id || 'N/A'}) | Message ID: ${message.id} | Content: ${content}`;

        await saveServerLog({
            guildId: guild.id,
            logType: 'messagedeleted',
            message: `Message deleted in ${channelName}`,
            details,
            userId: authorId,
            userTag: authorTag,
            moderatorId: deletedById,
            moderatorTag: deletedByTag
        });

        const logChannel = await resolveLogChannel(guild, 'message_log_channel_id');
        await sendLogEmbed(logChannel, 'Message Deleted', [
            { name: 'Author', value: `${authorTag} (${authorId || 'N/A'})` },
            { name: 'Deleted By', value: `${deletedByTag} (${deletedById || 'N/A'})` },
            { name: 'Channel', value: `${channelName} (${message.channel?.id || 'N/A'})` },
            { name: 'Content', value: content }
        ], 0x95A5A6);
    }
};
