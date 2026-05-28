# BossBot Troubleshooting Guide

## 🔧 Common Issues and Solutions

### Issue: Commands Not Showing Up

**Problem:** The bot shows old commands instead of the new ones.

**Solution:** You need to deploy the slash commands to Discord.

```bash
npm run deploy-commands
```

**What this does:**
- Registers all slash commands with Discord
- Updates the command list for your server
- Ensures new commands are available

**Note:** You need your `GUILD_ID` in your `.env` file for this to work.

### Issue: Welcome System Not Working

**Problem:** Welcome messages aren't being sent when users join.

**Solution:** Check the following:

1. **Configure welcome channels via web panel:**
   - Go to `http://localhost:3000`
   - Select your server
   - Go to "Welcome System" section
   - Set the welcome channel and log channels

2. **Check bot permissions:**
   - Make sure the bot has "Send Messages" permission
   - Make sure the bot can access the welcome channel

3. **Check database:**
   - The SQLite database (`bossbot.db`) should be created automatically
   - Verify the welcome_config table has your server's settings

### Issue: Rate Limiting Errors

**Problem:** Bot configuration changes fail with rate limit errors.

**Solution:** The bot now has built-in rate limiting:

- **Cooldown:** 1 minute between configuration changes
- **Automatic handling:** The bot will tell you when to wait
- **Partial updates:** Some changes may succeed while others are rate-limited

**Tips:**
- Wait for the cooldown period before trying again
- Make multiple changes at once instead of one at a time
- Check the response for which changes succeeded

### Issue: Status Activity Not Showing

**Problem:** Bot status/activity doesn't update or shows errors.

**Solution:** Status updates can be tricky:

1. **Wait a few minutes:** Discord may take time to update the status
2. **Check the activity type:** Make sure you're using a valid type:
   - PLAYING
   - WATCHING
   - LISTENING
   - STREAMING
   - COMPETING

3. **Try different activities:** Some activities may not work as expected

4. **Check bot logs:** Look for any error messages in the console

### Issue: Database Errors

**Problem:** "Too many parameter values were provided" or other database errors.

**Solution:** These have been fixed in the latest version:

1. **Restart the bot:**
   ```bash
   npm start
   ```

2. **Check database file:**
   - Make sure `bossbot.db` exists
   - If corrupted, delete it and restart (will recreate automatically)

3. **Verify SQLite installation:**
   ```bash
   npm list better-sqlite3
   ```

### Issue: Logs Not Working

**Problem:** Server logs aren't being saved or displayed.

**Solution:** Check the following:

1. **Configure log channels:**
   - Use `/setlogs` command in Discord
   - Or configure via web panel

2. **Check database:**
   - Verify `server_logs` table exists
   - Check that logs are being saved

3. **View logs in web panel:**
   - Go to `http://localhost:3000`
   - Select your server
   - Go to "Server Logs" section

### Issue: Ticket System Not Working

**Problem:** Ticket panels aren't being created or tickets aren't working.

**Solution:** 

1. **Configure ticket system:**
   - Use `/ticket_panel` command in Discord
   - Or configure via web panel

2. **Check bot permissions:**
   - Make sure bot has "Manage Channels" permission
   - Make sure bot can create channels

3. **Verify log channel:**
   - Set a log channel for ticket transcripts

### Issue: Web Panel Not Accessible

**Problem:** Can't access `http://localhost:3000`

**Solution:**

1. **Check if bot is running:**
   ```bash
   npm start
   ```

2. **Check port:**
   - Make sure port 3000 isn't already in use
   - Change PORT in `.env` if needed

3. **Check firewall:**
   - Make sure port 3000 isn't blocked

### Issue: Bot Not Starting

**Problem:** Bot fails to start or shows errors.

**Solution:**

1. **Check .env file:**
   - Make sure `DISCORD_TOKEN` is set correctly
   - Make sure `CLIENT_ID` is set
   - Make sure `GUILD_ID` is set (for command deployment)

2. **Check dependencies:**
   ```bash
   npm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   ```
   Should be v16 or higher.

4. **Check error logs:**
   - Look at the console output for specific errors
   - Check the `logs/` directory for log files

## 🚀 Quick Fix Commands

### Reset Everything
```bash
# Stop the bot
npm run stop

# Delete database (will recreate on start)
rm bossbot.db

# Restart the bot
npm start

# Deploy commands
npm run deploy-commands
```

### Update Commands Only
```bash
npm run deploy-commands
```

### Check Bot Status
```bash
# View logs
npm run logs

# Check if running
pm2 status
```

## 📋 Configuration Checklist

Make sure your `.env` file has:

```env
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
GUILD_ID=your_guild_id_here
BOT_NAME=BossBot
PORT=3000
```

## 🔍 Debug Mode

For detailed debugging, you can add this to your `.env`:

```env
DEBUG=*
NODE_ENV=development
```

## 📞 Getting Help

If you're still having issues:

1. Check the console output for specific error messages
2. Review the logs in the `logs/` directory
3. Make sure all dependencies are installed
4. Verify your Discord bot token is correct
5. Check that the bot has proper permissions

## 🎯 Common Mistakes

1. **Forgot to deploy commands:** Run `npm run deploy-commands`
2. **Wrong bot token:** Double-check your `.env` file
3. **Missing permissions:** Make sure bot has admin permissions
4. **Port already in use:** Change PORT in `.env` or stop other services
5. **Database locked:** This is normal with SQLite, just wait a moment

---

**BossBot** - We're here to help! 🚀
