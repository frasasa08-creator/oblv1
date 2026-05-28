const { Events } = require('discord.js');
const { saveTicketMessage } = require('../utils/ticketUtils');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignora i messaggi del bot
        if (message.author.bot) return;

        // Salva il messaggio se è in un canale ticket
        await saveTicketMessage(message);
    },
};