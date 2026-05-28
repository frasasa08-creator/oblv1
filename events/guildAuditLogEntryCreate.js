const { Events, AuditLogEvent } = require('discord.js');
const { resolveLogChannel, saveServerLog, sendLogEmbed } = require('../utils/logUtils');

module.exports = {
    name: Events.GuildAuditLogEntryCreate,
    async execute(auditLogEntry, guild) {
        const { action, executorId, targetId, reason, changes = [] } = auditLogEntry;
        const executor = executorId ? await guild.client.users.fetch(executorId).catch(() => null) : null;
        const target = targetId ? await guild.client.users.fetch(targetId).catch(() => null) : null;
        const executorTag = executor?.tag || 'Unknown';
        const targetTag = target?.tag || 'Unknown';
        const baseReason = reason || 'No reason provided';

        try {
            switch (action) {
                case AuditLogEvent.MemberBanAdd: {
                    const logChannel = await resolveLogChannel(guild, 'moderation_log_channel_id');
                    const details = `Banned User: ${targetTag} (${targetId || 'N/A'}) | By: ${executorTag} (${executorId || 'N/A'}) | Reason: ${baseReason} | Duration: Permanent`;
                    await saveServerLog({
                        guildId: guild.id,
                        logType: 'userbanned',
                        message: `${targetTag} was banned`,
                        details,
                        userId: targetId,
                        userTag: targetTag,
                        moderatorId: executorId,
                        moderatorTag: executorTag
                    });
                    await sendLogEmbed(logChannel, 'User Banned', [
                        { name: 'Banned User', value: `${targetTag} (${targetId || 'N/A'})` },
                        { name: 'Banned By', value: `${executorTag} (${executorId || 'N/A'})` },
                        { name: 'Reason', value: baseReason },
                        { name: 'Duration', value: 'Permanent' }
                    ], 0xE74C3C);
                    break;
                }

                case AuditLogEvent.MemberKick: {
                    const logChannel = await resolveLogChannel(guild, 'moderation_log_channel_id');
                    const details = `Kicked User: ${targetTag} (${targetId || 'N/A'}) | By: ${executorTag} (${executorId || 'N/A'}) | Reason: ${baseReason}`;
                    await saveServerLog({
                        guildId: guild.id,
                        logType: 'userkicked',
                        message: `${targetTag} was kicked`,
                        details,
                        userId: targetId,
                        userTag: targetTag,
                        moderatorId: executorId,
                        moderatorTag: executorTag
                    });
                    await sendLogEmbed(logChannel, 'User Kicked', [
                        { name: 'Kicked User', value: `${targetTag} (${targetId || 'N/A'})` },
                        { name: 'Kicked By', value: `${executorTag} (${executorId || 'N/A'})` },
                        { name: 'Reason', value: baseReason }
                    ], 0xE67E22);
                    break;
                }

                case AuditLogEvent.MemberUpdate: {
                    const timeoutChange = changes.find(c => c.key === 'communication_disabled_until');
                    if (!timeoutChange) break;
                    const newTimeout = timeoutChange.new ? new Date(timeoutChange.new) : null;
                    const oldTimeout = timeoutChange.old ? new Date(timeoutChange.old) : null;

                    if (newTimeout && (!oldTimeout || newTimeout > oldTimeout)) {
                        const logChannel = await resolveLogChannel(guild, 'moderation_log_channel_id');
                        const durationMs = newTimeout.getTime() - Date.now();
                        const durationText = durationMs > 0
                            ? `${Math.ceil(durationMs / 60000)} minutes (until <t:${Math.floor(newTimeout.getTime() / 1000)}:F>)`
                            : `until <t:${Math.floor(newTimeout.getTime() / 1000)}:F>`;
                        const details = `Muted User: ${targetTag} (${targetId || 'N/A'}) | By: ${executorTag} (${executorId || 'N/A'}) | Reason: ${baseReason} | Duration: ${durationText}`;
                        await saveServerLog({
                            guildId: guild.id,
                            logType: 'membermuted',
                            message: `${targetTag} was muted (timeout)`,
                            details,
                            userId: targetId,
                            userTag: targetTag,
                            moderatorId: executorId,
                            moderatorTag: executorTag
                        });
                        await sendLogEmbed(logChannel, 'Member Muted', [
                            { name: 'Muted User', value: `${targetTag} (${targetId || 'N/A'})` },
                            { name: 'Muted By', value: `${executorTag} (${executorId || 'N/A'})` },
                            { name: 'Reason', value: baseReason },
                            { name: 'Duration', value: durationText }
                        ], 0xF39C12);
                    }
                    break;
                }

                case AuditLogEvent.ChannelUpdate: {
                    const logChannel = await resolveLogChannel(guild, 'channel_log_channel_id');
                    const channel = guild.channels.cache.get(targetId);
                    const formattedChanges = changes
                        .map(c => `${c.key}: ${JSON.stringify(c.old ?? 'N/A')} -> ${JSON.stringify(c.new ?? 'N/A')}`)
                        .join(' | ');
                    await saveServerLog({
                        guildId: guild.id,
                        logType: 'channelupdated',
                        message: `Channel updated: ${channel ? `#${channel.name}` : targetId}`,
                        details: `Channel: ${channel ? `#${channel.name}` : 'Unknown'} (${targetId || 'N/A'}) | By: ${executorTag} (${executorId || 'N/A'}) | Action: ${formattedChanges || 'No detailed changes'}`,
                        moderatorId: executorId,
                        moderatorTag: executorTag
                    });
                    await sendLogEmbed(logChannel, 'Channel Updated', [
                        { name: 'Channel', value: `${channel ? `#${channel.name}` : 'Unknown'} (${targetId || 'N/A'})` },
                        { name: 'Updated By', value: `${executorTag} (${executorId || 'N/A'})` },
                        { name: 'Action', value: formattedChanges || 'No detailed changes' }
                    ], 0x1ABC9C);
                    break;
                }

                case AuditLogEvent.MemberRoleUpdate: {
                    const logChannel = await resolveLogChannel(guild, 'role_log_channel_id');
                    const addedRoles = changes
                        .filter(c => c.key === '$add')
                        .flatMap(c => (c.new || []).map(r => r.name))
                        .join(', ') || 'None';
                    const removedRoles = changes
                        .filter(c => c.key === '$remove')
                        .flatMap(c => (c.new || []).map(r => r.name))
                        .join(', ') || 'None';
                    await saveServerLog({
                        guildId: guild.id,
                        logType: 'rolesupdated',
                        message: `Roles updated for ${targetTag}`,
                        details: `User: ${targetTag} (${targetId || 'N/A'}) | By: ${executorTag} (${executorId || 'N/A'}) | Added: ${addedRoles} | Removed: ${removedRoles}`,
                        userId: targetId,
                        userTag: targetTag,
                        moderatorId: executorId,
                        moderatorTag: executorTag
                    });
                    await sendLogEmbed(logChannel, 'Roles Updated', [
                        { name: 'User', value: `${targetTag} (${targetId || 'N/A'})` },
                        { name: 'Updated By', value: `${executorTag} (${executorId || 'N/A'})` },
                        { name: 'Roles Added', value: addedRoles },
                        { name: 'Roles Removed', value: removedRoles }
                    ], 0x9B59B6);
                    break;
                }
                default:
                    break;
            }
        } catch (error) {
            console.error(`[AuditLog] Error processing ${action}:`, error);
        }
    }
};