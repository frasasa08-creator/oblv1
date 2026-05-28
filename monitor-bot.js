// Simple monitor script for BossBot
const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 BossBot Monitor Started');

let botProcess;

function startBot() {
    console.log('🚀 Starting BossBot...');
    botProcess = spawn('node', ['index.js'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    botProcess.on('error', (err) => {
        console.error('❌ Failed to start bot:', err);
    });

    botProcess.on('exit', (code) => {
        console.log(`📊 Bot exited with code ${code}`);
        if (code !== 0) {
            console.log('🔄 Restarting in 5 seconds...');
            setTimeout(startBot, 5000);
        }
    });
}

startBot();

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (botProcess) {
        botProcess.kill();
    }
    process.exit(0);
});
