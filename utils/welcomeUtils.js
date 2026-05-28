const { EmbedBuilder } = require('discord.js');

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

        if (config.welcome_image) embed.setImage(config.welcome_image);
        if (config.embed_thumbnail) embed.setThumbnail(config.embed_thumbnail);

            //.setTimestamp();

        return { embeds: [embed] };
        
    } catch (error) {
        console.error('Errore creazione embed welcome:', error);
        throw error;
    }
}

module.exports = {
    createWelcomeEmbed
};
