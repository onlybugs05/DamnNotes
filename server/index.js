/**
 * DamnNotes - Enterprise Intelligence Workspace
 * Copyright (c) 2026 onlybugs05. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL. UNAUTHORIZED SHARING IS PROHIBITED.
 */
const express = require('express');
const expressWs = require('express-ws');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
// Node-pty is removed
const { spawn } = require('child_process');

const app = express();
expressWs(app); // Extend express app with express-ws

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

const workingDir = process.cwd();
const safeRoot = fs.realpathSync(workingDir);

// Secure by relying strictly on 127.0.0.1 binding

// Safe path resolver to prevent directory traversal
const getSecurePath = (filePath) => {
    if (!filePath) throw new Error('File path required');

    const resolvedPath = path.resolve(safeRoot, filePath);
    let canonicalPath;

    if (fs.existsSync(resolvedPath)) {
        canonicalPath = fs.realpathSync.native(resolvedPath);
    } else {
        const parentDir = path.dirname(resolvedPath);
        const canonicalParent = fs.realpathSync.native(parentDir);
        canonicalPath = path.join(canonicalParent, path.basename(resolvedPath));
    }

    // Must strictly stay within safeRoot
    if (!canonicalPath.startsWith(safeRoot + path.sep) && canonicalPath !== safeRoot) {
        throw new Error('Forbidden traversal');
    }
    return canonicalPath;
};

// WebSocket connection for terminal
app.ws('/api/terminal', (ws, req) => {

    // Spawn a bash process detached to prevent tty input SIGTTIN suspension on host
    const shell = spawn('bash', ['-i'], {
        env: process.env,
        cwd: workingDir,
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    shell.stdout.on('data', (data) => {
        ws.send(data.toString());
    });

    shell.stderr.on('data', (data) => {
        ws.send(data.toString());
    });

    ws.on('message', (msg) => {
        shell.stdin.write(msg);
    });

    ws.on('close', () => {
        shell.kill();
    });
});

// Serve the static React client files
// Static files can be served without explicit auth, but we should secure index.html to avoid leaking presence, 
// though binding to 127.0.0.1 makes it decently safe.
app.use(express.static(path.join(__dirname, '../client/dist')));

// API Routes (Localhost only)
app.get('/api/files', (req, res) => {
    try {
        const readDirectory = (dir) => {
            const files = fs.readdirSync(dir);
            const structure = [];

            for (const file of files) {
                if (file.startsWith('.') || file === 'node_modules') continue;

                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                const relativePath = path.relative(workingDir, fullPath);

                if (stat.isDirectory()) {
                    structure.push({
                        name: file,
                        path: relativePath,
                        isDirectory: true,
                        children: readDirectory(fullPath)
                    });
                } else {
                    structure.push({
                        name: file,
                        path: relativePath,
                        isDirectory: false
                    });
                }
            }
            return structure.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
        };

        const structure = readDirectory(workingDir);
        res.json(structure);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read directory' });
    }
});

app.get('/api/file', (req, res) => {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    try {
        const fullPath = getSecurePath(filePath);
        
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            res.json({ content });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to read file' });
    }
});

app.post('/api/file', (req, res) => {
    const { filePath, isDirectory } = req.body;
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    try {
        const fullPath = getSecurePath(filePath);

        if (isDirectory) {
            fs.mkdirSync(fullPath, { recursive: true });
        } else {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, '# New Note\n\n');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create' });
    }
});

app.put('/api/file', (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    try {
        const fullPath = getSecurePath(filePath);
        
        fs.writeFileSync(fullPath, content);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save' });
    }
});

app.delete('/api/file', (req, res) => {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    try {
        const fullPath = getSecurePath(filePath);
        
        if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });

        const canonicalPath = fs.realpathSync.native(fullPath);
        if (!canonicalPath.startsWith(safeRoot + path.sep) && canonicalPath !== safeRoot) {
            throw new Error('Forbidden traversal');
        }
        
        if (fs.statSync(canonicalPath).isDirectory()) {
            fs.rmSync(canonicalPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(canonicalPath);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Fallback to React app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

function startServer(initialPort = 4500) {
    return new Promise((resolve, reject) => {
        const net = require('net');
        
        function checkAndListen(port) {
            const server = net.createServer();
            server.unref();
            server.on('error', (e) => {
                if (e.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is occupied, trying ${port + 1}...`);
                    checkAndListen(port + 1);
                } else {
                    reject(e);
                }
            });
            
            server.listen(port, '127.0.0.1', () => {
                server.close(() => {
                    // Port is free, start the real express app
                    app.listen(port, '127.0.0.1', () => {
                        resolve(port);
                    });
                });
            });
        }
        
        checkAndListen(initialPort);
    });
}

module.exports = { startServer };
