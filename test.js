const { generateLogImage } = require('./utils/logImageGenerator');
const fs = require('fs');
const path = require('path');

async function runTests() {
    console.log('🧪 Testing FIXED Nano Banano Pro Log Generator\n');

    const tests = [
        {
            name: 'User Banned',
            template: 'userbanned',
            data: {
                bannedUser: 'ToxicUser#1234',
                byAdmin: 'Moderator#9999',
                reason: 'Repeated harassment in general chat',
                duration: 'Permanent'
            }
        },
        {
            name: 'User Kicked',
            template: 'userkicked',
            data: {
                kickedUser: 'Spammer#5678',
                byAdmin: 'Admin#1111',
                reason: 'Mass emoji spam',
                duration: 'N/A'
            }
        },
        {
            name: 'Member Muted',
            template: 'membermuted',
            data: {
                mutedUser: 'NoisyUser#9012',
                byMod: 'Mod#2222',
                reason: 'Mic spam in VC',
                duration: '1 hour'
            }
        },
        {
            name: 'Message Deleted',
            template: 'messagedeleted',
            data: {
                originalUser: 'DeletedUser#3456',
                byMod: 'Admin#3333',
                content: 'Inappropriate content removed',
                location: '#general'
            }
        },
        {
            name: 'Channel Updated',
            template: 'channelupdated',
            data: {
                channel: '#announcements',
                byAdmin: 'Owner#0001',
                action: 'slowmode: 0s → 5s'
            }
        },
        {
            name: 'Roles Updated',
            template: 'rolesupdated',
            data: {
                user: 'Member#7890',
                byAdmin: 'Admin#4444',
                rolesAdded: 'VIP, Nitro Booster',
                rolesRemoved: 'Newbie'
            }
        },
        {
            name: 'Message Edited',
            template: 'messageedited',
            data: {
                user: 'Author#3333'
            }
        }
    ];

    const outputDir = path.join(__dirname, 'test_output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    for (const test of tests) {
        try {
            const buffer = await generateLogImage(test.template, test.data);
            const filePath = path.join(outputDir, `test_${test.template}.png`);
            fs.writeFileSync(filePath, buffer);
            console.log(`✅ ${test.name.padEnd(20)} → test_${test.template}.png`);
        } catch (err) {
            console.error(`❌ ${test.name.padEnd(20)} → ${err.message}`);
        }
    }

    console.log(`\n📁 Test images saved to: ${outputDir}`);
}

runTests().catch(console.error);