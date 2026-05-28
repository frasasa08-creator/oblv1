// SQLite Database Configuration for BossBot
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, 'bossbot.db');

// Initialize database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
function initializeDatabase() {
    console.log('🔧 Initializing SQLite database...');

    // Welcome System Configuration
    db.exec(`
        CREATE TABLE IF NOT EXISTS welcome_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT UNIQUE NOT NULL,
            welcome_channel TEXT,
            welcome_log_channel TEXT,
            quit_log_channel TEXT,
            welcome_image TEXT,
            welcome_text TEXT,
            avatar_border_color TEXT,
            avatar_border_width INTEGER,
            avatar_position TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Add new columns to welcome_config if they don't exist
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN welcome_text TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN avatar_border_color TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN avatar_border_width INTEGER`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN avatar_position TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN welcome_mode TEXT DEFAULT 'image'`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN text_color TEXT DEFAULT '#FFFFFF'`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN text_size INTEGER DEFAULT 40`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE welcome_config ADD COLUMN show_member_count INTEGER DEFAULT 0`);
    } catch (e) {
        // Column already exists
    }

    // Ticket System Configuration
    db.exec(`
        CREATE TABLE IF NOT EXISTS ticket_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT UNIQUE NOT NULL,
            log_channel TEXT,
            title TEXT,
            description TEXT,
            options TEXT,
            embed_color TEXT,
            panel_image TEXT,
            footer_text TEXT,
            show_timestamp INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Add new columns to ticket_config if they don't exist
    try {
        db.exec(`ALTER TABLE ticket_config ADD COLUMN embed_color TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE ticket_config ADD COLUMN panel_image TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE ticket_config ADD COLUMN footer_text TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE ticket_config ADD COLUMN show_timestamp INTEGER`);
    } catch (e) {
        // Column already exists
    }

    // Server Logs
    db.exec(`
        CREATE TABLE IF NOT EXISTS server_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            log_type TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT,
            user_id TEXT,
            user_tag TEXT,
            moderator_id TEXT,
            moderator_tag TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Panel security blocks (IP/subnet/fingerprint)
    db.exec(`
        CREATE TABLE IF NOT EXISTS panel_security_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            block_type TEXT NOT NULL,
            block_value TEXT NOT NULL,
            reason TEXT,
            created_by TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Panel security audit (access/admin actions)
    db.exec(`
        CREATE TABLE IF NOT EXISTS panel_security_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT,
            user_id TEXT,
            username TEXT,
            ip TEXT,
            fingerprint TEXT,
            user_agent TEXT,
            action TEXT NOT NULL,
            endpoint TEXT,
            method TEXT,
            status_code INTEGER,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_server_logs_guild_id ON server_logs(guild_id);
        CREATE INDEX IF NOT EXISTS idx_server_logs_log_type ON server_logs(log_type);
        CREATE INDEX IF NOT EXISTS idx_server_logs_created_at ON server_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_panel_security_blocks_guild_id ON panel_security_blocks(guild_id);
        CREATE INDEX IF NOT EXISTS idx_panel_security_blocks_type ON panel_security_blocks(block_type);
        CREATE INDEX IF NOT EXISTS idx_panel_security_blocks_value ON panel_security_blocks(block_value);
        CREATE INDEX IF NOT EXISTS idx_panel_security_blocks_expires_at ON panel_security_blocks(expires_at);
        CREATE INDEX IF NOT EXISTS idx_panel_security_audit_guild_id ON panel_security_audit(guild_id);
        CREATE INDEX IF NOT EXISTS idx_panel_security_audit_user_id ON panel_security_audit(user_id);
        CREATE INDEX IF NOT EXISTS idx_panel_security_audit_ip ON panel_security_audit(ip);
        CREATE INDEX IF NOT EXISTS idx_panel_security_audit_created_at ON panel_security_audit(created_at DESC);
    `);

    // Bot Configuration
    db.exec(`
        CREATE TABLE IF NOT EXISTS bot_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tickets System
    db.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            ticket_type TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            channel_name TEXT,
            claimed_by TEXT,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            close_reason TEXT
        )
    `);

    // Add claimed_by column if it doesn't exist
    try {
        db.exec(`ALTER TABLE tickets ADD COLUMN claimed_by TEXT`);
    } catch (e) {
        // Column already exists
    }

    // Add category column if it doesn't exist
    try {
        db.exec(`ALTER TABLE tickets ADD COLUMN category TEXT`);
    } catch (e) {
        // Column already exists
    }

    // Ticket Messages
    db.exec(`
        CREATE TABLE IF NOT EXISTS ticket_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        )
    `);

    // Guild Settings
    db.exec(`
        CREATE TABLE IF NOT EXISTS guild_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT UNIQUE NOT NULL,
            settings TEXT,
            ticket_log_channel_id TEXT,
            welcome_channel_id TEXT,
            welcome_log_channel_id TEXT,
            quit_log_channel_id TEXT,
            moderation_log_channel_id TEXT,
            role_log_channel_id TEXT,
            channel_log_channel_id TEXT,
            message_log_channel_id TEXT,
            welcome_image_url TEXT,
            welcome_embed_color INTEGER DEFAULT 16777215,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Add new columns to guild_settings if they don't exist
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN welcome_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN welcome_log_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN quit_log_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN moderation_log_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN role_log_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN channel_log_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN message_log_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN welcome_image_url TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN welcome_embed_color INTEGER DEFAULT 16777215`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_channel_id TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_roles TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_embed_title TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_embed_description TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_embed_image TEXT`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_embed_color INTEGER DEFAULT 0x0099FF`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_button_text TEXT DEFAULT 'Verifica'`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_button_style TEXT DEFAULT 'primary'`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN verify_message_id TEXT`);
    } catch (e) {
        // Column already exists
    }

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets(guild_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
        CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
    `);

    // Persistent Roles
    db.exec(`
        CREATE TABLE IF NOT EXISTS persistent_roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            assigned_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, guild_id, role_id)
        )
    `);

    // Create indexes for persistent_roles
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_persistent_roles_user_id ON persistent_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_persistent_roles_guild_id ON persistent_roles(guild_id);
    `);

    // Bot Status
    db.exec(`
        CREATE TABLE IF NOT EXISTS bot_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT UNIQUE NOT NULL,
            status_channel_id TEXT NOT NULL,
            status_message_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User Sessions for OAuth2
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            username TEXT,
            discriminator TEXT,
            avatar TEXT,
            access_token TEXT,
            refresh_token TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for user_sessions
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);

    // Insert default bot configuration
    const insertConfig = db.prepare(`
        INSERT OR IGNORE INTO bot_config (key, value) VALUES (?, ?)
    `);

    insertConfig.run('bot_name', 'BossBot');
    insertConfig.run('bot_status', 'Online');
    insertConfig.run('bot_activity_type', 'PLAYING');

    console.log('✅ SQLite database initialized successfully');
}

// Initialize database on module load
initializeDatabase();

// Helper functions for common operations
const dbHelpers = {
    // Query helper (SELECT)
    query: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            return stmt.all(params); // Pass params as array, not spread
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // Execute helper (INSERT, UPDATE, DELETE)
    execute: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            return stmt.run(params); // Pass params as array, not spread
        } catch (error) {
            console.error('Database execute error:', error);
            throw error;
        }
    },

    // Get single row
    get: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            return stmt.get(params); // Pass params as array, not spread
        } catch (error) {
            console.error('Database get error:', error);
            throw error;
        }
    }
};

// Create a pool-like interface for compatibility with PostgreSQL code
const pool = {
    query: async (text, params) => {
        try {
            // Handle SELECT queries
            if (text.trim().toUpperCase().startsWith('SELECT')) {
                const rows = dbHelpers.query(text, params);
                return { rows };
            }
            // Handle INSERT/UPDATE/DELETE queries
            else {
                const result = dbHelpers.execute(text, params);
                return { rows: [] };
            }
        } catch (error) {
            console.error('Pool query error:', error);
            throw error;
        }
    }
};

// Export database instance and helpers
module.exports = { db, pool, dbHelpers };

// Close database connection on process exit
process.on('SIGINT', () => {
    console.log('🔌 Closing database connection...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🔌 Closing database connection...');
    db.close();
    process.exit(0);
});
