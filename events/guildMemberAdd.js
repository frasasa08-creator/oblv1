const { Events, EmbedBuilder } = require('discord.js');
const { createWelcomeEmbed, createWelcomeImage } = require('../utils/welcomeUtils');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client, pool) {
        try {
            // ==================== SISTEMA WELCOME ====================
            await handleWelcomeSystem(member, pool);

            // ==================== LOG TO DATABASE ====================
            await saveMemberJoinToDatabase(member, pool);

        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};

// ==================== FUNZIONE SISTEMA WELCOME ====================
async function handleWelcomeSystem(member, pool) {
    try {
        // Get welcome settings from database
        const result = await pool.query(
            'SELECT * FROM welcome_config WHERE guild_id = ?',
            [member.guild.id]
        );

        if (result.rows.length === 0 || !result.rows[0].welcome_channel) {
            return;
        }

        const settings = result.rows[0];
        const welcomeChannel = member.guild.channels.cache.get(settings.welcome_channel);
        if (!welcomeChannel) return;

        const welcomeMode = settings.welcome_mode || 'image'; // 'image' or 'embed'

        // Creiamo l'embed usando l'utility che supporta placeholder e configurazioni custom del sito
        const welcomeData = await createWelcomeEmbed(member.user, member.guild.memberCount, settings);

        if (welcomeMode === 'embed') {
            await welcomeChannel.send(welcomeData);
        } else {
            // Send image with text
            try {
                const imageAttachment = await createWelcomeImage(member.user, member.guild, settings);
                await welcomeChannel.send({ 
                    embeds: welcomeData.embeds, 
                    files: [imageAttachment] 
                });
            } catch (error) {
                console.error('Error creating welcome image, falling back to embed:', error);
                await welcomeChannel.send(welcomeData);
            }
        }
    } catch (error) {
        console.error('Error in welcome system:', error);
    }
}

// ==================== SAVE MEMBER JOIN TO DATABASE ====================
async function saveMemberJoinToDatabase(member, pool) {
    try {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const isSuspicious = accountAge < 7 * 24 * 60 * 60 * 1000; // Less than 7 days

        const query = `
            INSERT INTO server_logs (guild_id, log_type, message, details, user_id, user_tag)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await pool.query(query, [
            member.guild.id,
            'member',
            `User ${member.user.tag} joined the server`,
            `Account Age: ${Math.floor(accountAge / (1000 * 60 * 60 * 24))} days | Suspicious: ${isSuspicious ? 'Yes' : 'No'}`,
            member.user.id,
            member.user.tag
        ]);

        console.log(`✅ Member join logged to database for ${member.user.tag}`);
    } catch (error) {
        console.error('Error saving member join to database:', error);
    }
}
