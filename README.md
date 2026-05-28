# BossBot - Advanced Discord Bot with Web Control Panel

BossBot is a comprehensive Discord bot with a powerful web-based control panel for complete server and bot management.

## 🚀 Features

### Web Control Panel
- **Dashboard**: Real-time bot statistics and server overview
- **Bot Configuration**: Per-server nickname, guild avatar, and status management
- **Welcome System**: Configure welcome messages and channels
- **Ticket System**: Create and manage ticket panels
- **Embed Creator**: Design and send custom embeds
- **Server Logs**: View all moderation and activity logs
- **Server Management**: Manage multiple Discord servers

### Discord Bot Features
- **Welcome System**: Custom welcome images with user avatars
- **Ticket System**: Advanced ticket panels with transcripts
- **Moderation Logs**: Track bans, kicks, timeouts, and role changes
- **Member Tracking**: Monitor joins, leaves, and suspicious accounts
- **Message Logging**: Track deleted and edited messages
- **Role Management**: Add, remove, and list roles
- **Server Info**: Display server statistics and status

## 📋 Requirements

- Node.js v16 or higher
- Discord Bot Token
- Discord Application Client ID and Secret

**No database server required!** BossBot uses SQLite - a local file-based database.

## 🛠️ Installation

### Quick Start (Any Platform)

```bash
# Clone or navigate to BossBot directory
cd BossBot

# Install dependencies
npm install

# Configure environment
cp .env.example .env  # Linux/Mac
# or
copy .env.example .env  # Windows

# Edit .env with your Discord bot token
# Then start the bot
npm start
```

### Windows Users

See [WINDOWS_SETUP.md](WINDOWS_SETUP.md) for detailed Windows instructions.

### Linux/Mac Users

```bash
cd BossBot
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

Or use the startup script:
```bash
./start.sh
```

## 🎮 Usage

### Web Panel
Access the web control panel at `http://localhost:3000`

### Discord Commands
- `/setup_welcome` - Configure welcome system
- `/test_welcome` - Test welcome image
- `/ticket_panel` - Create ticket panel
- `/setlogs` - Configure log channels
- `/setstatus` - Set bot status
- `/server-info` - Display server information
- `/server-status` - Show server status
- `/role-add` - Add role to user
- `/role-remove` - Remove role from user
- `/role-list` - List all roles
- `/clear` - Clear messages
- `/logs` - View logs
- `/message` - Send message as bot
- `/terminal` - Execute terminal commands
- `/setup_verify` - Setup verification system

## 📁 Project Structure

```
BossBot/
├── commands/          # Discord slash commands
├── events/           # Discord event handlers
├── utils/            # Utility functions
├── config/           # Configuration files
├── models/           # Database models
├── public/           # Web panel static files
│   ├── css/         # Stylesheets
│   └── js/          # JavaScript
├── views/            # Web panel HTML templates
├── logs/             # Log files
├── index.js          # Main bot file
├── database.js       # SQLite database configuration
├── bossbot.db        # SQLite database file (created automatically)
├── package.json      # Dependencies
├── .env.example      # Environment variables template
├── .gitignore        # Git ignore patterns
├── start.sh          # Linux/Mac startup script
├── start.bat         # Windows startup script
├── README.md         # This file
├── INSTALL.md        # Installation guide
├── WINDOWS_SETUP.md  # Windows setup guide
└── LOCAL_DATABASE_GUIDE.md # SQLite database guide
```

## 🔧 Configuration

### Environment Variables

Edit `.env` file with your configuration:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
BOT_NAME=BossBot

# Web Server Configuration
PORT=3000
SESSION_SECRET=your_session_secret_here

# Database Configuration (SQLite - Local File Database)
# The bot uses SQLite by default - no database server needed!
# Database file will be created automatically: bossbot.db
```

### Bot Permissions

The bot requires the following permissions:
- Manage Channels
- Manage Messages
- Manage Roles
- Kick Members
- Ban Members
- View Audit Log
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Add Reactions

### Intents

The bot uses the following Discord intents:
- Guilds
- GuildMembers
- GuildMessages
- MessageContent
- GuildModeration
- GuildMessageReactions
- GuildPresences

## 💾 Database

BossBot uses **SQLite** by default - a local file-based database that requires no separate database server.

### Database File
- Location: `bossbot.db` in the BossBot directory
- Created automatically on first run
- Easy to backup (just copy the file)

### Database Tables
- `welcome_config` - Welcome system settings
- `ticket_config` - Ticket system settings
- `server_logs` - All server activity logs
- `guild_bot_config` - Per-server bot identity settings
- `bot_config` - Bot configuration storage

For more details, see [LOCAL_DATABASE_GUIDE.md](LOCAL_DATABASE_GUIDE.md).

## 🌐 Deployment

### Using PM2

```bash
npm run setup
```

### PM2 Commands

```bash
npm run restart   # Restart the bot
npm run stop      # Stop the bot
npm run logs      # View logs
```

## 📊 Web Panel Features

### Dashboard
- Real-time statistics
- Server overview
- Quick actions
- Recent activity

### Bot Configuration
- Change bot name
- Update bot avatar
- Set custom status
- Configure activity type

### Welcome System
- Configure welcome channels
- Set welcome image
- Manage join/leave logs

### Ticket System
- Create ticket panels
- Configure ticket options
- Set log channels
- Custom panel design

### Embed Creator
- Design custom embeds
- Set colors and images
- Add fields and footers
- Send to any channel

### Server Logs
- View all moderation actions
- Filter by log type
- Search by user
- Export logs

### Server Management
- View all connected servers
- Server statistics
- Member overview
- Channel management

## 🔒 Security

- All sensitive data stored in environment variables
- Local SQLite database (no external database server needed)
- Session management with secure cookies
- Rate limiting on API endpoints
- Input validation and sanitization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Database info: See [LOCAL_DATABASE_GUIDE.md](LOCAL_DATABASE_GUIDE.md)
- Windows users: See [WINDOWS_SETUP.md](WINDOWS_SETUP.md)
- General issues: See [INSTALL.md](INSTALL.md)
- Open an issue on the repository

## 🎉 Credits

- Built with Discord.js
- Web panel with Express.js
- Database with SQLite
- Inspired by various Discord bot projects

---

**BossBot** - Your complete Discord server management solution
