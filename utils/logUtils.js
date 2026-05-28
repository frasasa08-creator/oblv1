const { EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

function truncate(text, max = 1000) {
    if (!text) return 'N/A';
    const safe = String(text);
    return safe.length > max ? `${safe.slice(0, max - 3)}...` : safe;
}

async function saveServerLog({
    guildId,
    logType,
    message,
    details = '',
    userId = null,
    userTag = null,
    moderatorId = null,
    moderatorTag = null
}) {
    await pool.query(
        `INSERT INTO server_logs (guild_id, log_type, message, details, user_id, user_tag, moderator_id, moderator_tag)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [guildId, logType, truncate(message, 1500), truncate(details, 3500), userId, userTag, moderatorId, moderatorTag]
    );
}

async function resolveLogChannel(guild, preferredColumn) {
    const result = await pool.query(
        `SELECT moderation_log_channel_id, role_log_channel_id, channel_log_channel_id, message_log_channel_id
         FROM guild_settings WHERE guild_id = ?`,
        [guild.id]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const channelId = row[preferredColumn] || row.moderation_log_channel_id;
    if (!channelId) return null;
    return guild.channels.cache.get(channelId) || null;
}

async function sendLogEmbed(channel, title, fields, color = 0x5865F2) {
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp();

    for (const field of fields) {
        if (!field) continue;
        embed.addFields({
            name: field.name,
            value: truncate(field.value, 1024),
            inline: Boolean(field.inline)
        });
    }

    await channel.send({ embeds: [embed] });
}

module.exports = {
    truncate,
    saveServerLog,
    resolveLogChannel,
    sendLogEmbed
};
