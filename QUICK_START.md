# BossBot Quick Start Guide

## 🚀 Get BossBot Running in 5 Minutes

### Step 1: Configure Your .env File

Edit your `.env` file with these values:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
GUILD_ID=your_guild_id_here
BOT_NAME=BossBot
PORT=3000
```

**Where to find these values:**
- **DISCORD_TOKEN:** Discord Developer Portal → Bot → Token
- **CLIENT_ID:** Discord Developer Portal → General Information → Application ID
- **DISCORD_CLIENT_SECRET:** Discord Developer Portal → OAuth2 → Client Secret
- **GUILD_ID:** Right-click your server → Copy ID (enable Developer Mode in Discord)

### Step 2: Deploy Commands

This registers all slash commands with Discord:

```bash
npm run deploy-commands
```

**Expected output:**
```
✅ Loaded command: allowedroles
✅ Loaded command: clear
✅ Loaded command: forcecloseticket
...
✅ Successfully reloaded 15 application (/) commands.
```

### Step 3: Start the Bot

```bash
npm start
```

**Expected output:**
```
🔧 Initializing SQLite database...
✅ SQLite database initialized successfully
✅ Loaded command: allowedroles
...
✅ Loaded event: guildAuditLogEntryCreate
🎉 BossBot Web Server started on port 3000
✅ BossBot is ready! Logged in as YourBot#1234
📊 Servers: 1
👥 Users: 10
🎉 BossBot is now online and ready to serve!
```

### Step 4: Access Web Panel

Open your browser and go to:
```
http://localhost:3000
```

### Step 5: Configure Welcome System

1. In the web panel, select your server
2. Go to "Welcome System"
3. Configure:
   - Welcome Channel
   - Welcome Log Channel
   - Quit Log Channel
   - Welcome Image URL (optional)

### Step 6: Configure Ticket System

1. In the web panel, go to "Ticket System"
2. Configure:
   - Ticket Log Channel
   - Panel Title
   - Panel Description
   - Ticket Options (add as many as you want)

### Step 7: Test Everything

**Test Welcome System:**
```bash
/test_welcome
```

**Test Ticket System:**
```bash
/ticket_panel
```

**Test Bot Status:**
```bash
/setstatus
```

**View Server Info:**
```bash
/server-info
```

## 🎯 Common Commands

### Bot Configuration
- `/setstatus` - Set bot status
- `/server-info` - Show server information
- `/server-status` - Show server status

### Welcome System
- `/setup_welcome` - Configure welcome system
- `/test_welcome` - Test welcome image

### Ticket System
- `/ticket_panel` - Create ticket panel

### Moderation
- `/setlogs` - Configure log channels
- `/logs` - View logs
- `/clear` - Clear messages

### Roles
- `/role-add` - Add role to user
- `/role-remove` - Remove role from user
- `/role-list` - List all roles

### Other
- `/message` - Send message as bot
- `/terminal` - Execute terminal commands
- `/setup_verify` - Setup verification system

## 🔧 Troubleshooting

### Commands Not Showing
```bash
npm run deploy-commands
```

### Bot Not Starting
- Check your `.env` file
- Verify your Discord token
- Make sure Node.js is installed

### Welcome Not Working
- Configure welcome channels in web panel
- Check bot permissions
- Verify database is created

### Rate Limit Errors
- Wait 1 minute between configuration changes
- Make multiple changes at once

## 📊 Web Panel Features

### Dashboard
- Real-time statistics
- Server overview
- Quick actions

### Bot Configuration
- Change bot name
- Update bot avatar
- Set bot status

### Welcome System
- Configure welcome channels
- Set welcome images
- Manage join/leave logs

### Ticket System
- Create ticket panels
- Configure ticket options
- Set log channels

### Embed Creator
- Design custom embeds
- Set colors and images
- Send to any channel

### Server Logs
- View all moderation actions
- Filter by log type
- Search by user

### Server Management
- View all connected servers
- Server statistics
- Member overview

## 🎉 You're Ready!

BossBot is now configured and ready to use:

- ✅ Database created automatically
- ✅ Commands deployed to Discord
- ✅ Web panel accessible
- ✅ Welcome system configured
- ✅ Ticket system configured

**Enjoy using BossBot!** 🚀

## 📞 Need Help?

- Check [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
- Review [FIXES_SUMMARY.md](FIXES_SUMMARY.md)
- Check console output for errors
- Verify your configuration

---

**BossBot** - Your complete Discord server management solution!
