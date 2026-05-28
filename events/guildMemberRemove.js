const { Events, AuditLogEvent } = require('discord.js');
const { resolveLogChannel, saveServerLog, sendLogEmbed } = require('../utils/logUtils');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberBanAdd
        }).catch(() => null);
        const banLog = fetchedLogs?.entries.first();
        const wasBanned = banLog && banLog.targetId === member.id &&
            (Date.now() - banLog.createdTimestamp) < 5000;

        const kickLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberKick
        }).catch(() => null);
        const kickLog = kickLogs?.entries.first();
        const wasKicked = kickLog && kickLog.targetId === member.id &&
            (Date.now() - kickLog.createdTimestamp) < 5000;

        try {
            if (wasBanned) {
                // Handled by guildAuditLogEntryCreate, skip here
                return;
            } else if (wasKicked) {
                // Handled by guildAuditLogEntryCreate, skip here  
                return;
            } else {
                await saveServerLog({
                    guildId: member.guild.id,
                    logType: 'memberleft',
                    message: `${member.user.tag} left the server`,
                    details: `User: ${member.user.tag} (${member.user.id})`,
                    userId: member.user.id,
                    userTag: member.user.tag
                });
                const logChannel = await resolveLogChannel(member.guild, 'moderation_log_channel_id');
                await sendLogEmbed(logChannel, 'User Left', [
                    { name: 'User', value: `${member.user.tag} (${member.user.id})` },
                    { name: 'Action', value: 'Left server voluntarily' }
                ], 0x7F8C8D);
            }
        } catch (error) {
            console.error('[MemberRemove] Error:', error);
        }
    }
};