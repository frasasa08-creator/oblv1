const { Events, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { createWelcomeEmbed } = require('../utils/welcomeUtils');

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
                const imageAttachment = await createWelcomeImage(member, settings);
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

async function createWelcomeImage(member, settings) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Load background image
    try {
        const backgroundImage = await loadImage(settings.welcome_image || 'https://i.imgur.com/Gpx7Fpg.png');
        ctx.drawImage(backgroundImage, 0, 0, 800, 400);
    } catch (error) {
        ctx.fillStyle = '#2c2f33';
        ctx.fillRect(0, 0, 800, 400);
    }

    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatarSize = 150;
    const avatarX = 400; // Center horizontally
    const avatarY = 150; // Position
    const borderColor = settings.avatar_border_color || '#FFFFFF';
    const borderWidth = settings.avatar_border_width || 5;

    // Draw avatar border
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();

    // Draw avatar circle
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();

    // Draw welcome text with placeholder support
    let welcomeText = settings.welcome_text || `Welcome {username} to the server!`;
    // Replace placeholders
    welcomeText = welcomeText.replace(/{username}/g, member.user.username);
    welcomeText = welcomeText.replace(/{user}/g, member.user.username);
    welcomeText = welcomeText.replace(/{mention}/g, `<@${member.user.id}>`);
    welcomeText = welcomeText.replace(/{server}/g, member.guild.name);
    welcomeText = welcomeText.replace(/{member_count}/g, member.guild.memberCount.toString());

    const textColor = settings.text_color || '#FFFFFF';
    const textSize = settings.text_size || 40;

    ctx.save();
    ctx.font = `bold ${textSize}px Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(welcomeText, 400, 320);
    ctx.restore();

    // Draw member count only if enabled
    if (settings.show_member_count) {
        ctx.save();
        ctx.font = '20px Arial';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.fillText(`Member #${member.guild.memberCount}`, 400, 360);
        ctx.restore();
    }

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    return {
        attachment: buffer,
        name: 'welcome.png'
    };
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
