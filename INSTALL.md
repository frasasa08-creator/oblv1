# BossBot Installation Guide

## Quick Start

### Prerequisites
- Node.js v16 or higher
- PostgreSQL database
- Discord Bot Token

### Installation Steps

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd BossBot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
BOT_NAME=BossBot
PORT=3000
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_SSL=true
```

4. **Setup the database**
```bash
psql -h your_host -U your_user -d your_database -f schema.sql
```

5. **Start the bot**
```bash
npm start
```

Or use the startup script:
```bash
./start.sh
```

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

### Production Deployment

Using PM2:
```bash
npm run setup
```

### Access the Web Panel

Once the bot is running, access the web control panel at:
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
6. Go to the "OAuth2" section and generate an invite link with the following scopes:
   - bot
   - applications.commands
7. Add the bot to your server with the following permissions:
   - Administrator (recommended) or specific permissions listed in README.md

## Database Setup

### PostgreSQL Setup

1. Create a database:
```sql
CREATE DATABASE bossbot;
```

2. Create a user:
```sql
CREATE USER bossbot_user WITH PASSWORD 'your_password';
```

3. Grant privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE bossbot TO bossbot_user;
```

4. Run the schema:
```bash
psql -h localhost -U bossbot_user -d bossbot -f schema.sql
```

### Using Aiven or other cloud PostgreSQL

Update your `.env` file with the connection details provided by your cloud provider.

## Troubleshooting

### Bot won't start
- Check that your `.env` file is properly configured
- Verify your Discord bot token is correct
- Ensure your database is accessible

### Web panel not accessible
- Check that the PORT is not already in use
- Verify your firewall settings
- Check the bot logs for errors

### Database connection errors
- Verify your database credentials
- Check that your database is running
- Ensure SSL is configured correctly if required

### Commands not working
- Make sure you've deployed the commands to Discord
- Check that the bot has the necessary permissions
- Verify the bot is in the server

## Support

For issues and questions, please open an issue on the repository.

## Next Steps

1. Configure your welcome system via the web panel
2. Set up ticket panels
3. Configure log channels
4. Customize your bot appearance

Enjoy using BossBot! 🎉
