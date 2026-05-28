# BossBot Local Database Guide

## 🎉 Using Local SQLite Database

BossBot now uses **SQLite** by default - a local file-based database that requires no separate database server!

### ✅ Advantages of SQLite

- **No setup required** - Database file is created automatically
- **No server needed** - Runs entirely from a single file
- **Easy backup** - Just copy the `bossbot.db` file
- **Perfect for development** - Simple and reliable
- **Cross-platform** - Works on Windows, Mac, and Linux

### 📁 Database File

The database is stored as: `bossbot.db` in the BossBot directory.

### 🔧 How It Works

1. **Automatic Creation**: The database file is created automatically when you first start the bot
2. **No Configuration**: No need to set up PostgreSQL or any database server
3. **Easy Backup**: Simply copy the `bossbot.db` file to backup your data
4. **Portability**: Move the database file anywhere and it will work

### 🚀 Quick Start

1. **Install dependencies** (if not already done):
```cmd
npm install
```

2. **Configure your .env file**:
```cmd
copy .env.example .env
```

Edit `.env` and add your Discord bot token:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
BOT_NAME=BossBot
PORT=3000
```

3. **Start the bot**:
```cmd
npm start
```

The `bossbot.db` file will be created automatically!

### 📊 Database Tables

The database contains these tables:

- **welcome_config** - Welcome system settings
- **ticket_config** - Ticket system settings  
- **server_logs** - All server activity logs
- **bot_config** - Bot configuration storage

### 💾 Backup & Restore

**Backup your database:**
```cmd
copy bossbot.db bossbot-backup.db
```

**Restore from backup:**
```cmd
copy bossbot-backup.db bossbot.db
```

### 🔍 View Database Contents

You can use any SQLite browser to view your database:

**Recommended tools:**
- **DB Browser for SQLite** (Windows/Mac/Linux) - https://sqlitebrowser.org/
- **VS Code SQLite extension** - Search "SQLite" in VS Code extensions
- **DBeaver** - Universal database tool

### 📈 Performance

SQLite is perfect for:
- Development and testing
- Small to medium Discord servers
- Single-bot deployments
- Local hosting

For very large deployments (100+ servers), consider PostgreSQL.

### 🔄 Switching to PostgreSQL (Optional)

If you need PostgreSQL for larger deployments:

1. Install PostgreSQL
2. Update your `.env` file with PostgreSQL credentials
3. Modify `database.js` to use PostgreSQL instead of SQLite

### 🛠️ Troubleshooting

**Database file not created:**
- Make sure you have write permissions in the BossBot directory
- Check that the bot started successfully

**Database locked error:**
- This is normal with SQLite - the database handles concurrent access automatically
- If persistent, restart the bot

**Corrupted database:**
- Restore from your backup
- Delete `bossbot.db` and `bossbot.db-wal` files to start fresh

### 📝 Database Schema

```sql
-- Welcome Configuration
CREATE TABLE welcome_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT UNIQUE NOT NULL,
    welcome_channel TEXT,
    welcome_log_channel TEXT,
    quit_log_channel TEXT,
    welcome_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Configuration
CREATE TABLE ticket_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT UNIQUE NOT NULL,
    log_channel TEXT,
    title TEXT,
    description TEXT,
    options TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guild-Specific Bot Configuration
CREATE TABLE guild_bot_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT UNIQUE NOT NULL,
    nickname TEXT,
    guild_avatar TEXT,
    status_text TEXT,
    status_type TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Server Logs
CREATE TABLE server_logs (
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
);

-- Bot Configuration
CREATE TABLE bot_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 🎯 Next Steps

1. Start the bot and let it create the database
2. Configure your welcome system via the web panel
3. Set up ticket panels
4. Monitor logs in the web panel

---

**BossBot** - Simple, powerful, and easy to use! 🚀
