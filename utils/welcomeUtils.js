const { EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

/**
 * Crea l'embed di benvenuto
 */
async function createWelcomeEmbed(user, memberCount, config) {
    try {
        // Formatta il numero del membro con suffisso (1st, 2nd, 3rd, etc.)
        const getNumberWithSuffix = (number) => {
            if (number % 100 >= 11 && number % 100 <= 13) return number + 'th';
            switch (number % 10) {
                case 1: return number + 'st';
                case 2: return number + 'nd';
                case 3: return number + 'rd';
                default: return number + 'th';
            }
        };

        const formattedMemberCount = getNumberWithSuffix(memberCount);

        // Sostituzione segnaposti nel titolo e descrizione
        const title = (config.embed_title || 'WELCOME')
            .replace(/{user}/g, user.username)
            .replace(/{count}/g, formattedMemberCount);

        const description = (config.embed_description || `Benvenuto ${user} negli Oblivion, sei il ${formattedMemberCount} membro!`)
            .replace(/{user}/g, user.toString())
            .replace(/{count}/g, formattedMemberCount)
            .replace(/\\n/g, '\n');

        // Crea l'embed
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(config.embed_color ? parseInt(config.embed_color.replace('#', ''), 16) : 0xFFFFFF);

        const welcomeImageUrl = config.welcome_image;
        const embedThumbnailUrl = config.embed_thumbnail;

        console.log('DEBUG createWelcomeEmbed: welcomeImageUrl (before set):', welcomeImageUrl, 'type:', typeof welcomeImageUrl);
        if (welcomeImageUrl) {
            embed.setImage(String(welcomeImageUrl)); // Converte esplicitamente a stringa primitiva
        }
        console.log('DEBUG createWelcomeEmbed: embedThumbnailUrl (before set):', embedThumbnailUrl, 'type:', typeof embedThumbnailUrl);
        if (embedThumbnailUrl) {
            embed.setThumbnail(String(embedThumbnailUrl)); // Converte esplicitamente a stringa primitiva
        }

            //.setTimestamp();

        return { embeds: [embed] };
        
    } catch (error) {
        console.error('Errore creazione embed welcome:', error);
        throw error;
    }
}

/**
 * Crea l'immagine di benvenuto
 */
async function createWelcomeImage(user, guild, settings) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Carica immagine di sfondo
    try {
        const backgroundImage = await loadImage(settings.welcome_image || 'https://i.imgur.com/Gpx7Fpg.png');
        ctx.drawImage(backgroundImage, 0, 0, 800, 400);
    } catch (error) {
        ctx.fillStyle = '#2c2f33';
        ctx.fillRect(0, 0, 800, 400);
    }

    // Gestione Avatar (supporta mock user per anteprima)
    const avatarUrl = typeof user.displayAvatarURL === 'function' 
        ? user.displayAvatarURL({ extension: 'png', size: 256 })
        : (user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png');

    const avatar = await loadImage(avatarUrl);
    const avatarSize = 150;
    const avatarX = 400; 
    const avatarY = 150; 
    const borderColor = settings.avatar_border_color || '#FFFFFF';
    const borderWidth = settings.avatar_border_width || 5;

    // Bordo Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();

    // Avatar Circolare
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();

    // Testo di benvenuto
    let welcomeText = settings.welcome_text || `Welcome {username} to the server!`;
    welcomeText = welcomeText.replace(/{username}|{user}/g, user.username || 'User');
    welcomeText = welcomeText.replace(/{mention}/g, user.id ? `<@${user.id}>` : '@User');
    welcomeText = welcomeText.replace(/{server}/g, guild.name || 'Server');
    welcomeText = welcomeText.replace(/{member_count}/g, (guild.memberCount || 0).toString());

    const textColor = settings.text_color || '#FFFFFF';
    const textSize = parseInt(settings.text_size) || 40;

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

    if (settings.show_member_count) {
        ctx.save();
        ctx.font = '20px Arial';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Member #${guild.memberCount || 0}`, 400, 360);
        ctx.restore();
    }

    return { attachment: canvas.toBuffer('image/png'), name: 'welcome.png' };
}

module.exports = {
    createWelcomeEmbed,
    createWelcomeImage
};
