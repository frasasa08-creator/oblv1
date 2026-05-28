# BossBot Ticket System Guide

## 🎫 How to Create a Ticket Panel

### Method 1: Using the Web Panel (Recommended)

#### Step 1: Configure Ticket System
1. Go to the web panel: `https://oblv1.onrender.com`
2. Select your server from the dropdown
3. Navigate to "Ticket System" section
4. Fill in the configuration:
   - **Ticket Log Channel**: Select where ticket transcripts will be saved
   - **Panel Title**: Enter the title for your ticket panel (e.g., "🎫 Support Tickets")
   - **Panel Description**: Enter a description (e.g., "Select a ticket type below to create a support ticket")
   - **Ticket Options**: Add as many ticket types as you want:
     - **Option Label**: The name of the ticket type (e.g., "General Support")
     - **Emoji**: The emoji for the option (e.g., "💬")
     - Click "Add Option" to add more ticket types

#### Step 2: Save Configuration
Click the "Save Ticket Config" button to save your configuration to the database.

#### Step 3: Create the Ticket Panel
1. In the "Create Ticket Panel" section below the form:
   - **Target Channel**: Select the channel where you want the ticket panel to appear
2. Click the "Create Ticket Panel" button
3. The ticket panel will be created in the selected channel!

### Method 2: Using Discord Commands

#### Step 1: Use the `/ticket_panel` Command
1. In Discord, type `/ticket_panel`
2. Fill in the options:
   - **Ticket Log Channel**: Select where ticket transcripts will be saved
   - **Title**: Enter the panel title
   - **Description**: Enter the panel description
   - **Options**: Add your ticket options

#### Step 2: The Panel is Created Automatically
The ticket panel will be created in the channel where you used the command.

### Method 3: Using the `/create-ticket-panel` Command

#### Step 1: Configure via Web Panel First
Use the web panel to configure your ticket system (as shown in Method 1, Steps 1-2).

#### Step 2: Create Panel in Discord
1. In Discord, type `/create-ticket-panel`
2. The command will read your saved configuration and create the panel in the current channel.

## 📋 What Happens When You Create a Ticket Panel

### The Panel Appearance
- **Title**: Your configured title
- **Description**: Your configured description
- **Dropdown Menu**: A select menu with all your ticket options
- **Emojis**: Each option shows its emoji

### User Experience
When users interact with the ticket panel:
1. They click on the dropdown menu
2. They select a ticket type
3. A new ticket channel is created
4. They can communicate with support staff
5. When closed, a transcript is saved to the log channel

## 🎨 Customization Options

### Panel Title
- Use emojis: `🎫 Support Tickets`
- Keep it short and descriptive
- Maximum 100 characters

### Panel Description
- Explain what the tickets are for
- Use `\n` for line breaks
- Keep it clear and helpful

### Ticket Options
- **Label**: What the ticket is for (e.g., "General Support", "Bug Report")
- **Emoji**: Visual identifier (e.g., 💬, 🐛, 📝)
- **Unlimited Options**: Add as many as you need!

### Common Ticket Types
- 💬 General Support
- 🐛 Bug Report
- 📝 Feature Request
- 🔒 Account Issues
- 💳 Billing Support
- 🎮 Game Support
- 📚 Documentation Help

## 🔧 Advanced Configuration

### Multiple Ticket Panels
You can create multiple ticket panels for different purposes:
1. Configure different settings for each panel
2. Create panels in different channels
3. Each panel can have its own options

### Custom Channel Names
The bot automatically creates ticket channels with names like:
- `ticket-username-1234`
- `support-username-5678`

### Transcript Storage
All ticket conversations are saved to your configured log channel as HTML files.

## 📊 Managing Tickets

### View Ticket Logs
1. Go to the web panel
2. Select your server
3. Navigate to "Server Logs"
4. Filter by "ticket" type

### Close Tickets
- Use the `/forcecloseticket` command
- Or use the close button in the ticket channel (if implemented)

### View Active Tickets
- Check the ticket channels in your server
- Look for channels starting with "ticket-"

## 🎯 Best Practices

### Panel Design
- **Keep it simple**: Don't overwhelm users with too many options
- **Use clear labels**: Make it obvious what each ticket type is for
- **Add emojis**: Makes it more visually appealing
- **Test it**: Try creating a test ticket first

### Channel Organization
- Create a dedicated "Tickets" category
- Put the ticket panel in a visible channel
- Keep ticket channels organized

### Staff Training
- Make sure staff know how to handle tickets
- Establish response time expectations
- Create standard responses for common issues

## 🔍 Troubleshooting

### Panel Not Created
- Make sure you saved the configuration first
- Check that you selected a target channel
- Verify the bot has permission to create channels

### Options Not Showing
- Make sure you added at least one ticket option
- Check that the configuration was saved successfully
- Try recreating the panel

### Tickets Not Working
- Verify the bot has "Manage Channels" permission
- Check that the log channel is configured
- Make sure the bot can access the ticket channels

### Rate Limiting
- If you get rate limit errors, wait a few minutes
- Don't create multiple panels at once
- Space out your configuration changes

## 📝 Example Configurations

### Basic Support Panel
```
Title: 🎫 Support Tickets
Description: Select a ticket type below to get help from our support team.
Options:
- 💬 General Support
- 🐛 Bug Report
- 📝 Feature Request
```

### Gaming Server Panel
```
Title: 🎮 Game Support
Description: Need help with our games? Select a category below.
Options:
- 🎮 Game Issues
- 💳 Account Problems
- 🏆 Tournament Support
- 📚 Rules Questions
```

### Business Panel
```
Title: 💼 Customer Service
Description: How can we help you today?
Options:
- 📞 General Inquiries
- 💳 Billing Support
- 🔒 Account Security
- 📦 Order Status
- 📞 Technical Support
```

## 🎉 You're Ready!

Now you know how to:
- ✅ Configure ticket system via web panel
- ✅ Create ticket panels in Discord
- ✅ Customize ticket options
- ✅ Manage tickets effectively

**Start creating your ticket panels today!** 🚀

---

**BossBot** - Making server management easy!
