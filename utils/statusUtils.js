const { EmbedBuilder } = require('discord.js');
const { pool } = require('../database.js');

/**
 * Sistema di heartbeat - verifica se il bot è online
 */
async function initializeStatusSystem(client) {
    try {
        console.log('🫀 Inizializzazione sistema status...');
        
        // Prima aggiorna tutti gli status a "online"
        await updateBotStatus(client, 'online', 'Sistema avviato');
        
        // Avvia il sistema di heartbeat
        startHeartbeat(client);
        
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema status:', error);
    }
}

/**
 * Sistema di heartbeat che si auto-ripara
 */
function startHeartbeat(client) {
    // Heartbeat ogni 2 minuti
    setInterval(async () => {
        try {
            await updateStatusPeriodically(client);
            console.log('💓 Heartbeat inviato');
        } catch (error) {
            console.error('❌ Errore heartbeat:', error);
        }
    }, 2 * 60 * 1000); // 2 minuti
}

/**
 * Aggiorna lo status del bot
 */
async function updateBotStatus(client, status = 'online', reason = '') {
    try {
        console.log(`🔄 Aggiornamento status: ${status}`);
        
        const result = await pool.query('SELECT guild_id, status_channel_id, status_message_id FROM bot_status');
        
        for (const row of result.rows) {
            try {
                await updateSingleGuildStatus(client, row, status, reason);
            } catch (guildError) {
                console.error(`❌ Errore guild ${row.guild_id}:`, guildError.message);
            }
        }

    } catch (error) {
        console.error('❌ Errore aggiornamento status globale:', error);
    }
}

/**
 * Aggiorna status per un singolo server
 */
async function updateSingleGuildStatus(client, row, status, reason) {
    const guild = client.guilds.cache.get(row.guild_id);
    if (!guild) return;

    const channel = guild.channels.cache.get(row.status_channel_id);
    if (!channel) return;

    const statusConfig = getStatusConfig(status, reason, guild, client);
    const embed = new EmbedBuilder()
        .setTitle(`🤖 Status Bot - ${statusConfig.title}`)
        .setDescription(statusConfig.description)
        .addFields(...statusConfig.fields)
        .setColor(statusConfig.color)
        .setTimestamp();

    await updateOrCreateMessage(channel, row.status_message_id, embed, row.guild_id);
}

/**
 * Configurazione per i diversi stati
 */
function getStatusConfig(status, reason, guild, client) {
    const baseFields = [
        { name: '🕒 Ultimo aggiornamento', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: '🏠 Server', value: guild.name, inline: true },
        { name: '📊 Ping', value: `${client.ws.ping}ms`, inline: true }
    ];

    switch (status) {
        case 'online':
            return {
                title: '🟢 ONLINE',
                description: 'Il bot è attivo e funzionante',
                color: 0x00FF00,
                fields: [
                    ...baseFields,
                    { name: '👥 Utenti', value: guild.memberCount.toString(), inline: true },
                    { name: '💾 Memoria', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`, inline: true }
                ]
            };
        
        case 'offline':
            return {
                title: '🔴 OFFLINE',
                description: reason || 'Il bot è offline',
                color: 0xFF0000,
                fields: [
                    { name: '🕒 Ultimo stato', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '🏠 Server', value: guild.name, inline: true },
                    { name: '📝 Motivo', value: reason || 'Disconnessione', inline: true }
                ]
            };
        
        case 'restarting':
            return {
                title: '🟡 RIAVVIO',
                description: 'Il bot si sta riavviando',
                color: 0xFFFF00,
                fields: baseFields
            };

        case 'error':
            return {
                title: '🟠 ERRORE',
                description: 'Il bot ha riscontrato un problema',
                color: 0xFFA500,
                fields: [
                    ...baseFields,
                    { name: '⚠️ Problema', value: reason || 'Errore sconosciuto', inline: false }
                ]
            };
    }
}

/**
 * Aggiorna o crea il messaggio di status
 */
async function updateOrCreateMessage(channel, messageId, embed, guildId) {
    try {
        const message = await channel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
    } catch (messageError) {
        if (messageError.code === 10008) { // Unknown Message
            console.log(`📝 Creazione nuovo messaggio status per ${guildId}`);
            const newMessage = await channel.send({ embeds: [embed] });
            
            // Aggiorna il database con il nuovo message_id
            await pool.query(
                'UPDATE bot_status SET status_message_id = ? WHERE guild_id = ?',
                [newMessage.id, guildId]
            );
        } else {
            throw messageError;
        }
    }
}

/**
 * Aggiorna informazioni periodiche
 */
async function updateStatusPeriodically(client) {
    try {
        const result = await pool.query('SELECT guild_id, status_channel_id, status_message_id FROM bot_status');
        
        for (const row of result.rows) {
            try {
                const guild = client.guilds.cache.get(row.guild_id);
                if (!guild) continue;

                const channel = guild.channels.cache.get(row.status_channel_id);
                if (!channel) continue;

                const uptime = process.uptime();
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor(uptime / 3600) % 24;
                const minutes = Math.floor(uptime / 60) % 60;

                const embed = new EmbedBuilder()
                    .setTitle('🤖 Status Bot - 🟢 ONLINE')
                    .setDescription('Il bot è attivo e funzionante')
                    .addFields(
                        { name: '🕒 Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
                        { name: '🏠 Server', value: guild.name, inline: true },
                        { name: '📊 Ping', value: `${client.ws.ping}ms`, inline: true },
                        { name: '👥 Utenti', value: guild.memberCount.toString(), inline: true },
                        { name: '💾 Memoria', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`, inline: true },
                        { name: '💓 Stato', value: 'Sistema attivo', inline: true }
                    )
                    .setColor(0x00FF00)
                    .setTimestamp();

                await updateOrCreateMessage(channel, row.status_message_id, embed, row.guild_id);

            } catch (guildError) {
                console.error(`❌ Errore aggiornamento periodico per ${row.guild_id}:`, guildError.message);
            }
        }

    } catch (error) {
        console.error('❌ Errore aggiornamento periodico:', error);
    }
}

/**
 * Rileva se il bot era crashato all'avvio
 */
async function detectPreviousCrash(client) {
    try {
        const result = await pool.query('SELECT guild_id, status_channel_id, status_message_id FROM bot_status');
        
        for (const row of result.rows) {
            try {
                const guild = client.guilds.cache.get(row.guild_id);
                if (!guild) continue;

                const channel = guild.channels.cache.get(row.status_channel_id);
                if (!channel) continue;

                // Prova a recuperare l'ultimo messaggio di status
                try {
                    const lastMessage = await channel.messages.fetch(row.status_message_id);
                    const lastEmbed = lastMessage.embeds[0];
                    
                    if (lastEmbed && lastEmbed.title && lastEmbed.title.includes('ONLINE')) {
                        // Se l'ultimo stato era ONLINE, significa che c'è stato un crash
                        console.log(`⚠️ Rilevato crash precedente in ${guild.name}`);
                        
                        const crashEmbed = new EmbedBuilder()
                            .setTitle('🤖 Status Bot - 🟠 CRASH RILEVATO')
                            .setDescription('Il bot è stato riavviato dopo un arresto imprevisto')
                            .addFields(
                                { name: '🕒 Crash rilevato', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                                { name: '🏠 Server', value: guild.name, inline: true },
                                { name: '🔄 Stato', value: 'Sistema ripristinato', inline: true }
                            )
                            .setColor(0xFFA500)
                            .setTimestamp();

                        await lastMessage.edit({ embeds: [crashEmbed] });
                    }
                } catch (messageError) {
                    // Ignora se il messaggio non esiste
                }

            } catch (guildError) {
                console.error(`❌ Errore detection crash per ${row.guild_id}:`, guildError.message);
            }
        }

    } catch (error) {
        console.error('❌ Errore detection crash:', error);
    }
}

module.exports = {
    initializeStatusSystem,
    updateBotStatus,
    updateStatusPeriodically,
    detectPreviousCrash
};
