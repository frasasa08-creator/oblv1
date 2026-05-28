const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

const TARGET_WIDTH = 950;
const TARGET_HEIGHT = 265;

// PRECISE positions - values start RIGHT AFTER each label ends
const TEMPLATES = {
    userbanned: {
        file: 'userbanned.png',
        fields: {
            bannedUser:     { x: 515, y: 135, maxWidth: 200 },
            byAdmin:        { x: 730, y: 135, maxWidth: 200 },
            reason:         { x: 465, y: 190, maxWidth: 250 },
            duration:       { x: 720, y: 190, maxWidth: 200 }
        }
    },
    userkicked: {
        file: 'userkicked.png',
        fields: {
            kickedUser:     { x: 515, y: 135, maxWidth: 200 },
            byAdmin:        { x: 730, y: 135, maxWidth: 200 },
            reason:         { x: 465, y: 190, maxWidth: 250 },
            duration:       { x: 720, y: 190, maxWidth: 200 }
        }
    },
    membermuted: {
        file: 'membermuted.png',
        fields: {
            mutedUser:      { x: 515, y: 135, maxWidth: 200 },
            byMod:          { x: 720, y: 135, maxWidth: 200 },
            reason:         { x: 465, y: 190, maxWidth: 250 },
            duration:       { x: 720, y: 190, maxWidth: 200 }
        }
    },
    channelupdated: {
        file: 'channelupdated.png',
        fields: {
            channel:        { x: 465, y: 135, maxWidth: 250 },
            byAdmin:        { x: 730, y: 135, maxWidth: 200 },
            action:         { x: 465, y: 190, maxWidth: 470 }
        }
    },
    rolesupdated: {
        file: 'rolesuptated.png',
        fields: {
            user:           { x: 455, y: 135, maxWidth: 260 },
            byAdmin:        { x: 730, y: 135, maxWidth: 200 },
            rolesAdded:     { x: 515, y: 190, maxWidth: 250 },
            rolesRemoved:   { x: 780, y: 190, maxWidth: 150 }
        }
    }
};

const TEXT_CONFIG = {
    valueFont: 'bold 17px "Inter", "Segoe UI", "Roboto", sans-serif',
    valueColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowBlur: 2,
    shadowOffset: 1
};

async function generateLogImage(templateName, data, templateDir = './templates') {
    const config = TEMPLATES[templateName];
    if (!config) throw new Error(`Unknown template: ${templateName}`);

    const canvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
    const ctx = canvas.getContext('2d');

    const templatePath = path.join(templateDir, config.file);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }
    
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    ctx.font = TEXT_CONFIG.valueFont;
    ctx.fillStyle = TEXT_CONFIG.valueColor;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (const [key, field] of Object.entries(config.fields)) {
        const value = data[key];
        if (value === undefined || value === null || value === '') continue;

        const text = String(value);
        const displayText = truncateText(ctx, text, field.maxWidth);

        ctx.shadowColor = TEXT_CONFIG.shadowColor;
        ctx.shadowBlur = TEXT_CONFIG.shadowBlur;
        ctx.shadowOffsetX = TEXT_CONFIG.shadowOffset;
        ctx.shadowOffsetY = TEXT_CONFIG.shadowOffset;
        
        ctx.fillText(displayText, field.x, field.y);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    return canvas.toBuffer('image/png');
}

function truncateText(ctx, text, maxWidth) {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;

    let truncated = text;
    while (truncated.length > 0) {
        truncated = truncated.slice(0, -1);
        const test = truncated + '...';
        if (ctx.measureText(test).width <= maxWidth) return test;
    }
    return '...';
}

async function sendLogImage(channel, templateName, data, options = {}) {
    const buffer = await generateLogImage(templateName, data, options.templateDir);
    const fileName = `${templateName}_log.png`;
    const attachment = { attachment: buffer, name: fileName };

    const embed = {
        color: options.color || 0x2B2D31,
        image: { url: `attachment://${fileName}` },
        timestamp: new Date().toISOString()
    };

    if (options.footer) embed.footer = { text: options.footer };

    return channel.send({ embeds: [embed], files: [attachment] });
}

function formatUser(user) {
    if (!user) return 'Unknown';
    return user.tag || user.username || 'Unknown';
}

function formatRole(role) {
    if (!role) return 'None';
    return role.name || role.toString() || 'Unknown';
}

function formatDuration(ms) {
    if (!ms) return 'Permanent';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    generateLogImage,
    sendLogImage,
    formatUser,
    formatRole,
    formatDuration,
    TEMPLATES,
    TARGET_WIDTH,
    TARGET_HEIGHT
};