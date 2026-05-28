// BossBot - Discord Bot Advanced with Web Control Panel
const { Client, GatewayIntentBits, Collection, REST, Routes, PermissionFlagsBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

// Import SQLite database
const { pool } = require('./database');
const { createWelcomeImage } = require('./utils/welcomeUtils');

// Import authentication middleware
const passport = require('passport');
const session = require('express-session');
const DiscordStrategy = require('passport-discord').Strategy;

// Bot configuration
const BOT_NAME = process.env.BOT_NAME || 'BossBot';
const BOT_VERSION = '1.0.0';
const BOT_OWNER_ID = process.env.BOT_OWNER_ID || '';

// Rate limiting for bot configuration changes
const configCooldowns = new Map();
const CONFIG_COOLDOWN = 60000; // 1 minute cooldown
const panelRateLimit = new Map();
const PANEL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PANEL_RATE_LIMIT_MAX = 80;

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
});

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  Warning: Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client, pool));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client, pool));
    }
    console.log(`✅ Loaded event: ${event.name}`);
}

// Web server setup
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'bossbot-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Discord OAuth2 Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'https://oblv1.onrender.com/auth/discord/callback',
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Save or update user session in database
        const existingSession = await pool.query(
            'SELECT * FROM user_sessions WHERE user_id = ?',
            [profile.id]
        );

        if (existingSession.rows.length > 0) {
            // Update existing session
            await pool.query(
                `UPDATE user_sessions SET
                    username = ?,
                    discriminator = ?,
                    avatar = ?,
                    access_token = ?,
                    refresh_token = ?,
                    expires_at = datetime('now', '+7 days'),
                    updated_at = datetime('now')
                WHERE user_id = ?`,
                [profile.username, profile.discriminator, profile.avatar, accessToken, refreshToken, profile.id]
            );
        } else {
            // Create new session
            await pool.query(
                `INSERT INTO user_sessions (user_id, username, discriminator, avatar, access_token, refresh_token, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+7 days'))`,
                [profile.id, profile.username, profile.discriminator, profile.avatar, accessToken, refreshToken]
            );
        }

        return done(null, profile);
    } catch (error) {
        console.error('Error saving user session:', error);
        return done(error, null);
    }
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_sessions WHERE user_id = ?',
            [id]
        );

        if (result.rows.length > 0) {
            const session = result.rows[0];
            done(null, {
                id: session.user_id,
                username: session.username,
                discriminator: session.discriminator,
                avatar: session.avatar
            });
        } else {
            done(null, null);
        }
    } catch (error) {
        done(error, null);
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Make client and pool available to routes
app.locals.client = client;
app.locals.pool = pool;

// Authentication middleware
function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Please login first' });
    }
    next();
}

function requireBotOwner(req, res, next) {
    if (!BOT_OWNER_ID) {
        return res.status(503).json({
            error: 'Owner not configured',
            message: 'BOT_OWNER_ID is not set on server environment.'
        });
    }
    if (!req.user?.id || req.user.id !== BOT_OWNER_ID) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Owner access required.'
        });
    }
    next();
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getClientFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const secChUa = req.headers['sec-ch-ua'] || '';
    const secPlatform = req.headers['sec-ch-ua-platform'] || '';
    const source = `${userAgent}|${acceptLanguage}|${secChUa}|${secPlatform}`;
    return crypto.createHash('sha256').update(source).digest('hex');
}

function ipv4ToInt(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null;
    return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
}

function isIpInCidr(ip, cidr) {
    if (!cidr || !cidr.includes('/')) return false;
    const [rangeIp, maskBitsRaw] = cidr.split('/');
    const maskBits = Number(maskBitsRaw);
    if (Number.isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;

    const ipInt = ipv4ToInt(ip);
    const rangeInt = ipv4ToInt(rangeIp);
    if (ipInt === null || rangeInt === null) return false;

    const mask = maskBits === 0 ? 0 : ((0xffffffff << (32 - maskBits)) >>> 0);
    return (ipInt & mask) === (rangeInt & mask);
}

async function userCanManageGuild(userId, guildId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId).catch(() => null);
        return Boolean(member && (
            member.permissions.has(PermissionFlagsBits.Administrator) ||
            member.permissions.has(PermissionFlagsBits.ManageGuild)
        ));
    } catch (_) {
        return false;
    }
}

async function auditPanelAction(req, action, statusCode, details = '', explicitGuildId = null) {
    if (!req.user?.id) return;
    try {
        const guildId = explicitGuildId || req.params.guildId || req.params.id || req.body?.guildId || null;
        const ip = getClientIp(req);
        const fingerprint = getClientFingerprint(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const username = req.user.username
            ? `${req.user.username}${req.user.discriminator ? `#${req.user.discriminator}` : ''}`
            : req.user.id;

        await pool.query(
            `INSERT INTO panel_security_audit
             (guild_id, user_id, username, ip, fingerprint, user_agent, action, endpoint, method, status_code, details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [guildId, req.user.id, username, ip, fingerprint, userAgent, action, req.path, req.method, statusCode, details]
        );
    } catch (error) {
        console.warn('Panel audit logging failed:', error.message);
    }
}

async function panelSecurityGuard(req, res, next) {
    const ip = getClientIp(req);
    const fingerprint = getClientFingerprint(req);
    const guildId = req.params.guildId || req.params.id || req.body?.guildId || req.query?.guildId || null;

    const rateKey = `${req.user?.id || 'anon'}:${ip}`;
    const now = Date.now();
    const rateEntry = panelRateLimit.get(rateKey) || { count: 0, resetAt: now + PANEL_RATE_LIMIT_WINDOW_MS };
    if (now > rateEntry.resetAt) {
        rateEntry.count = 0;
        rateEntry.resetAt = now + PANEL_RATE_LIMIT_WINDOW_MS;
    }
    rateEntry.count += 1;
    panelRateLimit.set(rateKey, rateEntry);

    if (rateEntry.count > PANEL_RATE_LIMIT_MAX) {
        await auditPanelAction(req, 'rate_limited', 429, `Rate limit exceeded from IP ${ip}`, guildId);
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests from your IP. Please wait 1 minute.'
        });
    }

    if (!guildId) return next();

    try {
        const blocksResult = await pool.query(
            `SELECT id, block_type, block_value, reason, expires_at
             FROM panel_security_blocks
             WHERE guild_id = ?
             AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))`,
            [guildId]
        );

        const blocked = blocksResult.rows.find(row => {
            if (row.block_type === 'ip') return row.block_value === ip;
            if (row.block_type === 'fingerprint') return row.block_value === fingerprint;
            if (row.block_type === 'subnet') return isIpInCidr(ip, row.block_value);
            return false;
        });

        if (blocked) {
            await auditPanelAction(
                req,
                'blocked_request',
                403,
                `Blocked by ${blocked.block_type}:${blocked.block_value}. Reason: ${blocked.reason || 'No reason'}`,
                guildId
            );
            return res.status(403).json({
                error: 'Access blocked',
                message: blocked.reason || 'Your access has been blocked by panel security policy.'
            });
        }
    } catch (error) {
        console.warn('Security guard check failed:', error.message);
    }

    next();
}

// Authentication routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/login?error=true' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            isBotOwner: Boolean(BOT_OWNER_ID && req.user?.id === BOT_OWNER_ID),
            user: req.user
        });
    } else {
        res.json({
            authenticated: false,
            isBotOwner: false,
            user: null
        });
    }
});

// Web routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        bot: {
            name: BOT_NAME,
            version: BOT_VERSION,
            uptime: client.uptime,
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            ping: client.ws.ping
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/guilds', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const userId = req.user.id;
        const guilds = client.guilds.cache;
        const userGuilds = [];

        for (const guild of guilds.values()) {
            try {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member && (member.permissions.has(PermissionFlagsBits.Administrator) ||
                    member.permissions.has(PermissionFlagsBits.ManageGuild))) {
                    userGuilds.push({
                        id: guild.id,
                        name: guild.name,
                        icon: guild.iconURL(),
                        memberCount: guild.memberCount,
                        owner: guild.ownerId,
                        permissions: member.permissions.bitfield.toString()
                    });
                }
            } catch (error) {
                // User not in this guild or error fetching member
                continue;
            }
        }

        res.json(userGuilds);
    } catch (error) {
        console.error('Error fetching user guilds:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/guild/:id', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const guild = await client.guilds.fetch(req.params.id);
        const channels = guild.channels.cache.map(ch => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            parentId: ch.parentId
        }));
        const roles = guild.roles.cache.map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            position: role.position
        }));
        const members = await guild.members.fetch();

        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount,
            ownerId: guild.ownerId,
            channels,
            roles,
            members: members.size
        });
    } catch (error) {
        res.status(404).json({ error: 'Guild not found' });
    }
});

// Bot configuration endpoints with rate limiting
app.post('/api/bot/config', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const { guildId, name, avatar, status } = req.body;
        
        // DEBUG: Vediamo cosa arriva dal pannello web
        console.log('📩 Richiesta ricevuta al bot:', { guildId, name, status: status?.activity });

        const cooldownKey = req.ip || 'default';

        // Check cooldown
        if (configCooldowns.has(cooldownKey)) {
            const remainingTime = configCooldowns.get(cooldownKey) - Date.now();
            if (remainingTime > 0) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `Please wait ${Math.ceil(remainingTime / 1000)} seconds before changing bot configuration again`
                });
            }
        }

        // Set cooldown
        configCooldowns.set(cooldownKey, Date.now() + CONFIG_COOLDOWN);

        const changes = [];
        const activityType = status?.type || 'PLAYING';
        const activityTypes = {
            'PLAYING': 0,
            'STREAMING': 1,
            'LISTENING': 2,
            'WATCHING': 3,
            'COMPETING': 5
        };
        const type = activityTypes[activityType] || 0;

        // Se guildId è presente, facciamo SOLO modifiche per quel server specifico
        if (guildId && guildId !== 'global') {
            console.log(`🔎 Tentativo di aggiornamento per il server ID: ${guildId}`);
            // PER-SERVER CONFIGURATION (Identity within a specific guild)
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                console.error(`❌ Server non trovato per ID: ${guildId}`);
                return res.status(404).json({ error: 'Guild not found' });
            }

            const me = await guild.members.fetchMe().catch(() => null);
            if (!me) return res.status(404).json({ error: 'Bot member not found in guild' });

            // 1. Set Nickname (Per-Server Name) - Prevents Global Username Rate Limits
            if (name) {
                try {
                    await me.setNickname(name);
                    changes.push('server nickname');
                    console.log(`✅ [SERVER: ${guild.name}] Nickname aggiornato a: ${name}`);
                } catch (error) {
                    console.error(`❌ Errore Nickname in ${guild.name}:`, error.message);
                    changes.push(`nickname failed: ${error.message}`);
                }
            }

            // 2. Set Guild Avatar (Requires Server Boost Level 2)
            if (avatar) {
                try {
                    await me.setAvatar(avatar);
                    changes.push('server avatar');
                    console.log(`✅ [SERVER: ${guild.name}] Avatar server aggiornato`);
                } catch (error) {
                    console.warn(`⚠️ Errore Avatar Server (${guild.name}): ${error.message} (Richiede Boost Livello 2)`);
                    changes.push('server avatar failed (requires boost Lvl 2)');
                }
            }

            // Update guild-specific config in SQLite
            await pool.query(
                `INSERT INTO guild_bot_config (guild_id, nickname, guild_avatar, status_text, status_type)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(guild_id) DO UPDATE SET
                    nickname = excluded.nickname,
                    guild_avatar = excluded.guild_avatar,
                    status_text = excluded.status_text,
                    status_type = excluded.status_type,
                    updated_at = datetime('now')`,
                [guildId, name, avatar, status?.activity, activityType]
            );
        } else {
            console.log('🌐 Nessun guildId trovato, procedo con la CONFIGURAZIONE GLOBALE...');
            if (name) {
                try {
                    await client.user.setUsername(name);
                    changes.push('global name');
                    console.log(`✅ Nome globale aggiornato a: ${name}`);
                } catch (error) {
                    if (error.code === 50035) {
                        console.warn(`⚠️ Rate limit globale per il nome: ${error.message}`);
                        changes.push('global name (rate limited by Discord)');
                    } else throw error;
                }
            }

            if (avatar) {
                try {
                    await client.user.setAvatar(avatar);
                    changes.push('global avatar');
                    console.log(`✅ Avatar globale aggiornato`);
                } catch (error) {
                    console.error(`❌ Errore Avatar globale:`, error.message);
                    changes.push('global avatar (failed)');
                }
            }

            // Global Presence Update (Only if no guildId is specified)
            if (status?.activity) {
                try {
                    await client.user.setActivity(status.activity, { type });
                    changes.push('global status');
                    console.log(`✅ Status globale aggiornato: ${status.activity}`);
                } catch (error) {
                    console.error(`❌ Errore Status:`, error.message);
                    changes.push('status (failed)');
                }
            }
        }

        res.json({
            success: true,
            message: 'Bot configuration updated',
            changes: changes
        });
        await auditPanelAction(req, 'bot_config_update', 200, `Updated: ${changes.join(', ') || 'none'}`);
    } catch (error) {
        console.error('Error updating bot config:', error);
        await auditPanelAction(req, 'bot_config_update', 500, error.message);
        res.status(500).json({
            error: error.message,
            message: 'Failed to update bot configuration. Please try again later.'
        });
    }
});

// Welcome system endpoints
app.post('/api/welcome/config', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const { 
            guildId, welcomeChannel, welcomeLogChannel, quitLogChannel, 
            welcomeImage, welcomeMode, welcomeText, textColor, textSize, 
            avatarBorderColor, avatarBorderWidth, showMemberCount,
            embedTitle, embedDescription, embedColor, embedThumbnail 
        } = req.body;

        const query = `
            INSERT INTO welcome_config (
                guild_id, welcome_channel, welcome_log_channel, quit_log_channel, 
                welcome_image, welcome_mode, welcome_text, text_color, text_size, 
                avatar_border_color, avatar_border_width, show_member_count,
                embed_title, embed_description, embed_color, embed_thumbnail
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET
                welcome_channel = excluded.welcome_channel,
                welcome_log_channel = excluded.welcome_log_channel,
                quit_log_channel = excluded.quit_log_channel,
                welcome_image = excluded.welcome_image,
                welcome_mode = excluded.welcome_mode,
                welcome_text = excluded.welcome_text,
                text_color = excluded.text_color,
                text_size = excluded.text_size,
                avatar_border_color = excluded.avatar_border_color,
                avatar_border_width = excluded.avatar_border_width,
                show_member_count = excluded.show_member_count,
                embed_title = excluded.embed_title,
                embed_description = excluded.embed_description,
                embed_color = excluded.embed_color,
                embed_thumbnail = excluded.embed_thumbnail
        `;

        // Sanitizzazione dei dati prima del salvataggio
        const finalSize = parseInt(textSize) > 0 ? parseInt(textSize) : 40;
        const finalTextColor = textColor && textColor !== '' ? textColor : '#FFFFFF';
        const finalEmbedColor = embedColor && embedColor !== '' ? embedColor : '#FFFFFF';

        await pool.query(query, [
            guildId, welcomeChannel, welcomeLogChannel, quitLogChannel,
            welcomeImage, welcomeMode, welcomeText, finalTextColor, finalSize,
            avatarBorderColor, avatarBorderWidth, showMemberCount,
            embedTitle, embedDescription, finalEmbedColor, embedThumbnail
        ]);

        res.json({ success: true, message: 'Welcome configuration updated' });
        await auditPanelAction(req, 'welcome_config_update', 200, 'Welcome configuration saved', guildId);
    } catch (error) {
        await auditPanelAction(req, 'welcome_config_update', 500, error.message, req.body?.guildId || null);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/welcome/preview', requireAuth, async (req, res) => {
    try {
        const { welcomeImage, welcomeText, textColor, textSize, avatarBorderColor, avatarBorderWidth, showMemberCount } = req.body;
        
        const mockUser = { username: 'Username', avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png' };
        const mockGuild = { name: 'Server Name', memberCount: 123 };
        
        const settings = {
            welcome_image: welcomeImage,
            welcome_text: welcomeText,
            text_color: textColor,
            text_size: parseInt(textSize) || 40,
            avatar_border_color: avatarBorderColor,
            avatar_border_width: parseInt(avatarBorderWidth) || 5,
            show_member_count: showMemberCount === true || showMemberCount === 'true'
        };

        const image = await createWelcomeImage(mockUser, mockGuild, settings);
        res.set('Content-Type', 'image/png');
        res.send(image.attachment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/welcome/config/:guildId', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM welcome_config WHERE guild_id = ?',
            [req.params.guildId]
        );

        if (result.rows.length === 0) {
            res.json({ configured: false });
        } else {
            res.json({ configured: true, ...result.rows[0] });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ticket system endpoints
app.post('/api/ticket/config', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const { guildId, logChannel, title, description, color, image, footer, showTimestamp, options } = req.body;

        const query = `
            INSERT INTO ticket_config (guild_id, log_channel, title, description, embed_color, panel_image, footer_text, show_timestamp, options)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET
                log_channel = ?,
                title = ?,
                description = ?,
                embed_color = ?,
                panel_image = ?,
                footer_text = ?,
                show_timestamp = ?,
                options = ?
        `;

        await pool.query(query, [guildId, logChannel, title, description, color, image, footer, showTimestamp, JSON.stringify(options),
                              logChannel, title, description, color, image, footer, showTimestamp, JSON.stringify(options)]);

        res.json({ success: true, message: 'Ticket configuration updated' });
        await auditPanelAction(req, 'ticket_config_update', 200, 'Ticket configuration saved', guildId);
    } catch (error) {
        await auditPanelAction(req, 'ticket_config_update', 500, error.message, req.body?.guildId || null);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ticket/config/:guildId', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM ticket_config WHERE guild_id = ?',
            [req.params.guildId]
        );

        if (result.rows.length === 0) {
            res.json({ configured: false });
        } else {
            res.json({ configured: true, ...result.rows[0], options: JSON.parse(result.rows[0].options) });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create ticket panel endpoint
app.post('/api/ticket/create-panel', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const { guildId, channelId } = req.body;

        // Get ticket configuration from database
        const result = await pool.query(
            'SELECT * FROM ticket_config WHERE guild_id = ?',
            [guildId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No ticket configuration found' });
        }

        const config = result.rows[0];
        const options = JSON.parse(config.options || '[]');

        if (options.length === 0) {
            return res.status(400).json({ error: 'No ticket options configured' });
        }

        // Get guild and channel
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);

        // Create select menu options
        const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

        // Funzione per convertire :nome: nel formato Discord <:nome:id>
        const resolveEmojis = (text, guild) => {
            if (!text) return text;
            return text.replace(/:(\w+):/g, (match, name) => {
                const emoji = guild.emojis.cache.find(e => e.name === name);
                return emoji ? emoji.toString() : match;
            });
        };

        const selectOptions = options.map((opt, index) => {
            let emojiData = opt.emoji || '🎫';
            
            // Risolviamo prima il formato :nome: se presente
            emojiData = resolveEmojis(emojiData, guild);

            // Verifica se l'emoji è nel formato Discord <:nome:id> o <a:nome:id>
            const customEmojiMatch = emojiData.match(/<?(?:a)?:?\w+:(\d+)>?/);
            if (customEmojiMatch) {
                // Se è un'emoji custom, estraiamo solo l'ID numerico
                emojiData = customEmojiMatch[1];
            }

            return {
                label: opt.label.substring(0, 100),
                value: `ticket_${index}`,
                description: opt.label.substring(0, 100),
                emoji: emojiData
            };
        });

        // Create the select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Select a ticket type...')
            .addOptions(selectOptions);

        // Create action row
        const row = new ActionRowBuilder().addComponents(selectMenu);

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(resolveEmojis(config.title || '🎫 Support Tickets', guild))
            .setDescription(resolveEmojis(config.description || 'Select a ticket type below to create a support ticket.', guild))
            .setColor(config.embed_color ? parseInt(config.embed_color.replace('#', ''), 16) : 0x5865F2);

        if (config.show_timestamp) {
            embed.setTimestamp();
        }

        if (config.footer_text) {
            embed.setFooter({ text: config.footer_text });
        }

        if (config.panel_image) {
            embed.setImage(config.panel_image);
        }

        // Send to the channel
        await channel.send({
            embeds: [embed],
            components: [row]
        });

        res.json({ success: true, message: 'Ticket panel created successfully' });
        await auditPanelAction(req, 'ticket_panel_create', 200, `Created panel in channel ${channelId}`, guildId);
    } catch (error) {
        console.error('Error creating ticket panel:', error);
        await auditPanelAction(req, 'ticket_panel_create', 500, error.message, req.body?.guildId || null);
        res.status(500).json({ error: error.message });
    }
});

// Logs endpoints
app.get('/api/logs/:guildId', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const { type, limit = 50 } = req.query;

        let query = 'SELECT * FROM server_logs WHERE guild_id = ?';
        const params = [req.params.guildId];

        if (type) {
            query += ' AND log_type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const result = await pool.query(query, params);
        res.json({
            viewerIp: req.ip,
            logs: result.rows
        });
        await auditPanelAction(req, 'logs_view', 200, `Loaded ${result.rows.length} logs`, req.params.guildId);
    } catch (error) {
        console.error('Error fetching logs:', error);
        await auditPanelAction(req, 'logs_view', 500, error.message, req.params.guildId);
        res.status(500).json({ error: error.message });
    }
});

// Logs search endpoint
app.get('/api/logs/:guildId/search', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const { keyword, userId, type, startDate, endDate, limit = 50 } = req.query;

        let query = 'SELECT * FROM server_logs WHERE guild_id = ?';
        const params = [req.params.guildId];

        if (keyword) {
            query += ' AND (message LIKE ? OR details LIKE ? OR user_tag LIKE ?)';
            const keywordPattern = `%${keyword}%`;
            params.push(keywordPattern, keywordPattern, keywordPattern);
        }

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        if (type) {
            query += ' AND log_type = ?';
            params.push(type);
        }

        if (startDate) {
            query += ' AND created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND created_at <= ?';
            params.push(endDate + ' 23:59:59');
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const result = await pool.query(query, params);
        res.json({
            viewerIp: req.ip,
            logs: result.rows
        });
        await auditPanelAction(req, 'logs_search', 200, `Loaded ${result.rows.length} logs`, req.params.guildId);
    } catch (error) {
        await auditPanelAction(req, 'logs_search', 500, error.message, req.params.guildId);
        res.status(500).json({ error: error.message });
    }
});

// Panel security endpoints
app.get('/api/security/:guildId/overview', requireAuth, requireBotOwner, panelSecurityGuard, async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const hasPermission = await userCanManageGuild(req.user.id, guildId);
        if (!hasPermission) {
            await auditPanelAction(req, 'security_overview_denied', 403, 'User lacks ManageGuild permission', guildId);
            return res.status(403).json({ error: 'Forbidden', message: 'Missing permission for this guild.' });
        }

        const blocks = await pool.query(
            `SELECT id, block_type, block_value, reason, created_by, expires_at, created_at
             FROM panel_security_blocks
             WHERE guild_id = ?
             ORDER BY created_at DESC`,
            [guildId]
        );

        const recentAudit = await pool.query(
            `SELECT id, user_id, username, ip, fingerprint, action, endpoint, method, status_code, details, created_at
             FROM panel_security_audit
             WHERE guild_id = ?
             ORDER BY created_at DESC
             LIMIT 200`,
            [guildId]
        );

        await auditPanelAction(req, 'security_overview_view', 200, 'Fetched security overview', guildId);
        res.json({
            viewerIp: getClientIp(req),
            viewerFingerprint: getClientFingerprint(req),
            blocks: blocks.rows,
            recentAudit: recentAudit.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/security/:guildId/block', requireAuth, requireBotOwner, panelSecurityGuard, async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const hasPermission = await userCanManageGuild(req.user.id, guildId);
        if (!hasPermission) {
            await auditPanelAction(req, 'security_block_denied', 403, 'User lacks ManageGuild permission', guildId);
            return res.status(403).json({ error: 'Forbidden', message: 'Missing permission for this guild.' });
        }

        const { blockType, value, reason, durationMinutes } = req.body;
        const allowedTypes = new Set(['ip', 'subnet', 'fingerprint']);
        if (!allowedTypes.has(blockType) || !value) {
            return res.status(400).json({
                error: 'Invalid payload',
                message: 'blockType must be ip, subnet, or fingerprint, and value is required.'
            });
        }

        const safeDuration = Number(durationMinutes);
        const expiresAt = Number.isFinite(safeDuration) && safeDuration > 0
            ? new Date(Date.now() + safeDuration * 60000).toISOString()
            : null;

        await pool.query(
            `INSERT INTO panel_security_blocks (guild_id, block_type, block_value, reason, created_by, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [guildId, blockType, value, reason || null, req.user.id, expiresAt]
        );

        await auditPanelAction(
            req,
            'security_block_created',
            200,
            `Created ${blockType} block for ${value}. Duration: ${durationMinutes || 'permanent'} minutes`,
            guildId
        );

        res.json({
            success: true,
            message: 'Security block created',
            block: { blockType, value, reason: reason || null, expiresAt }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/security/:guildId/block/:blockId', requireAuth, requireBotOwner, panelSecurityGuard, async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const blockId = req.params.blockId;
        const hasPermission = await userCanManageGuild(req.user.id, guildId);
        if (!hasPermission) {
            await auditPanelAction(req, 'security_unblock_denied', 403, 'User lacks ManageGuild permission', guildId);
            return res.status(403).json({ error: 'Forbidden', message: 'Missing permission for this guild.' });
        }

        const targetRow = await pool.query(
            'SELECT * FROM panel_security_blocks WHERE id = ? AND guild_id = ?',
            [blockId, guildId]
        );
        if (targetRow.rows.length === 0) {
            return res.status(404).json({ error: 'Not found', message: 'Security block not found.' });
        }

        await pool.query('DELETE FROM panel_security_blocks WHERE id = ? AND guild_id = ?', [blockId, guildId]);
        const removed = targetRow.rows[0];

        await auditPanelAction(
            req,
            'security_block_removed',
            200,
            `Removed ${removed.block_type} block for ${removed.block_value}`,
            guildId
        );

        res.json({ success: true, message: 'Security block removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/security/:guildId/audit', requireAuth, requireBotOwner, panelSecurityGuard, async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
        const hasPermission = await userCanManageGuild(req.user.id, guildId);
        if (!hasPermission) {
            await auditPanelAction(req, 'security_audit_denied', 403, 'User lacks ManageGuild permission', guildId);
            return res.status(403).json({ error: 'Forbidden', message: 'Missing permission for this guild.' });
        }

        const result = await pool.query(
            `SELECT id, user_id, username, ip, fingerprint, user_agent, action, endpoint, method, status_code, details, created_at
             FROM panel_security_audit
             WHERE guild_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [guildId, limit]
        );

        await auditPanelAction(req, 'security_audit_view', 200, `Fetched ${limit} security audit rows`, guildId);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Embed creator endpoint
app.post('/api/embed/create', requireAuth, panelSecurityGuard, async (req, res) => {
    try {
        const { guildId, channelId, embed } = req.body;

        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);

        const { EmbedBuilder } = require('discord.js');
        const newEmbed = new EmbedBuilder()
            .setTitle(embed.title)
            .setDescription(embed.description)
            .setColor(embed.color || 0x5865F2);

        if (embed.fields) {
            newEmbed.addFields(embed.fields);
        }

        if (embed.footer) {
            newEmbed.setFooter({ text: embed.footer });
        }

        if (embed.thumbnail) {
            newEmbed.setThumbnail(embed.thumbnail);
        }

        if (embed.image) {
            newEmbed.setImage(embed.image);
        }

        await channel.send({ embeds: [newEmbed] });

        res.json({ success: true, message: 'Embed sent successfully' });
        await auditPanelAction(req, 'embed_create', 200, `Embed sent to channel ${channelId}`, guildId);
    } catch (error) {
        await auditPanelAction(req, 'embed_create', 500, error.message, req.body?.guildId || null);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🎉 ${BOT_NAME} Web Server started on port ${PORT}`);

    // Sistema Keep-Alive per Render (evita lo shutdown automatico dopo 15 min)
    const publicUrl = process.env.RENDER_EXTERNAL_URL;
    if (publicUrl) {
        console.log(`📡 Rilevato URL pubblico: ${publicUrl}. Avvio auto-ping ogni 13 minuti.`);
        setInterval(() => {
            https.get(`${publicUrl}/ping`, (res) => {
                console.log(`💓 Keep-alive: segnale inviato con successo (Status: ${res.statusCode})`);
            }).on('error', (err) => {
                console.error('❌ Errore durante il Keep-alive:', err.message);
            });
        }, 13 * 60 * 1000); // 13 minuti
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

module.exports = { client, pool };
