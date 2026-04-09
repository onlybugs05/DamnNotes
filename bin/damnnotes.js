#!/usr/bin/env node

const { startServer } = require('../server/index');

async function main() {
    console.log("========================================");
    console.log("🛡️  Starting DamnNotes Secure Server  🛡️");
    console.log("========================================");
    
    try {
        const port = await startServer();
        
        console.log(`\n✅ Local server securely bound to 127.0.0.1:${port}`);
        console.log(`\nLaunch complete! Cmd/Ctrl-Click the link below to open your bug bounty workspace:`);
        console.log(`http://localhost:${port}\n`);
        
    } catch (e) {
        console.error("Failed to start server:", e);
    }
}

main();
