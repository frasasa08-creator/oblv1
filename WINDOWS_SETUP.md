# BossBot Windows Setup Guide

## Quick Start for Windows

### Prerequisites
- Node.js v16 or higher (Download from https://nodejs.org/)
- Discord Bot Token

**No database server required!** BossBot uses SQLite - a local file-based database.

### Installation Steps

1. **Open Command Prompt or PowerShell**
   Navigate to the BossBot directory:
   ```cmd
   cd C:\Users\FoxOS_User\Desktop\DS\BossBot
   ```

2. **Install dependencies**
   ```cmd
   npm install
   ```

3. **Configure environment variables**
   ```cmd
   copy .env.example .env
   ```

4. **Edit .env file**
   Open `.env` in a text editor (Notepad, VS Code, etc.) and configure:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_bot_client_id_here
   DISCORD_CLIENT_SECRET=your_discord_client_secret_here
   BOT_NAME=BossBot
   PORT=3000
   ```

   **Note:** No database configuration needed! SQLite database is created automatically.

5. **Start the bot**
   
   **Option 1: Using npm**
   ```cmd
   npm start
   ```

   **Option 2: Using the startup script**
   ```cmd
   start.bat
   ```

   **Option 3: Using PM2 (for production)**
   ```cmd
   npm run setup
   ```

### Development Mode

For development with auto-reload:
```cmd
npm run dev
   ```

### Access the Web Panel

Once the bot is running, open your browser and navigate to:
```
http://localhost:3000
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token to your `.env` file
5. Enable the following intents:
   - Guild Members
   - Guild Messages
   - Message Content
   - Guild Moderation
   - Guild Message Reactions
   - Guild Presences
6. Go to the "OAuth2" section and generate an invite link with:
   - Scope: bot, applications.commands
   - Permissions: Administrator (recommended)

## Database Information

BossBot uses **SQLite** - a local file-based database that requires no separate database server.

### Database File
- Location: `bossbot.db` in the BossBot directory
- Created automatically on first run
- Easy to backup (just copy the file)

### Backup Your Database
```cmd
copy bossbot.db bossbot-backup.db
   ```

### Restore from Backup
```cmd
copy bossbot-backup.db bossbot.db
   ```

For more database information, see [LOCAL_DATABASE_GUIDE.md](LOCAL_DATABASE_GUIDE.md).

## Troubleshooting

### Bot won't start
- Check that your `.env` file is properly configured
- Verify your Discord bot token is correct
- Ensure Node.js is installed: `node --version`

### Web panel not accessible
- Check that port 3000 is not already in use
- Verify your firewall settings
- Check the bot logs for errors

### Database issues
- The database file is created automatically
- If corrupted, delete `bossbot.db` and restart the bot
- Backup your database regularly by copying the file

### Commands not working
- Make sure you've invited the bot to your server
- Check that the bot has necessary permissions
- Verify the bot is online

## PM2 Commands (Windows)

```cmd
npm run setup     # Start with PM2
npm run restart   # Restart the bot
npm run stop      # Stop the bot
npm run logs      # View logs
```

## Useful Commands

```cmd
node --version    # Check Node.js version
npm --version     # Check npm version
npm list          # List installed packages
npm audit         # Check for vulnerabilities
```

## Next Steps

1. Configure your welcome system via the web panel
2. Set up ticket panels
3. Configure log channels
4. Customize your bot appearance

## Support

For issues and questions:
- Database info: See [LOCAL_DATABASE_GUIDE.md](LOCAL_DATABASE_GUIDE.md)
- General issues: See [INSTALL.md](INSTALL.md)
- Open an issue on the repository

Enjoy using BossBot! 🎉
