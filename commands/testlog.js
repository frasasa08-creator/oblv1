const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateLogImage } = require('../utils/logImageGenerator');
const { pool } = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testlog')
        .setDescription('Test log image generation')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Log type')
                .setRequired(true)
                .addChoices(
                    { name: 'Moderation', value: 'moderation' },
                    { name: 'Role', value: 'role' },
                    { name: 'Channel', value: 'channel' },
                    { name: 'Message', value: 'message' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        const logType = interaction.options.getString('type');

        try {
            console.log(`🧪 Testing log image generation for type: ${logType}`);

            // Generate test log image
            const logImage = await generateLogImage({
                type: logType,
                action: `TEST ${logType.toUpperCase()} LOG`,
                user: {
                    tag: interaction.user.tag,
                    username: interaction.user.username,
                    id: interaction.user.id,
                    avatarURL: interaction.user.displayAvatarURL({ size: 128 })
                },
                moderator: {
                    tag: interaction.user.tag,
                    username: interaction.user.username,
                    id: interaction.user.id,
                    avatarURL: interaction.user.displayAvatarURL({ size: 128 })
                },
                reason: 'This is a test log message',
                details: 'Testing the log image generation system',
                timestamp: new Date()
            });

            // Send the image
            await interaction.editReply({
                content: `✅ Test log image generated for ${logType} type!`,
                files: [logImage]
            });

            console.log(`✅ Test log image sent successfully`);

        } catch (error) {
            console.error('Error in testlog command:', error);
            await interaction.editReply({
                content: `❌ Error generating test log: ${error.message}`
            });
        }
    }
};
