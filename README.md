# 🛡️ DamnNotes

A locally hosted, ultra-fast, entirely zero-friction Markdown Note-Taking application and Web Terminal designed specifically for Security Researchers and Bug Bounty Hunters. 

![DamnNotes Interface Banner](https://via.placeholder.com/1000x500.png?text=DamnNotes+Dashboard)

## ⚡ What is it?
During bug bounties, switching between a code editor to write reports and a terminal to run `nmap`, `ffuf`, or `nuclei` causes friction. 

**DamnNotes** is a global npm binary that, when executed in any directory, instantly serves that directory locally with a beautiful GitHub Dark interface. It provides an embedded interactive Web Terminal that safely spawns inside a detached process, alongside a Markdown-based dual-pane file editor with file tree navigation. 

It is completely decoupled from the internet. The backend relies strictly on the host IP (`127.0.0.1`), ensuring absolutely 0 exposure of your recon data or reverse-shell listeners to the rest of the network.

## 🚀 Features
- **Localhost Bound** - Runs on your machine only, zero network exposure.
- **Embedded Web Terminal** - Integrated `xterm.js` connecting securely to a fully interactive Bash session under the hood. No job-control freezing. True native input.
- **Context-Aware Explorer** - Easily visually manage and navigate deeply nested reconnaissance directories.
- **Github-Flavored Markdown** - A beautiful dual-pane Markdown Editor that looks just like standard Github Dark mode.
- **Dynamic Port Scaling** - Never worry about `EADDRINUSE` crashes again. Open multiple bug bounty folders simultaneously. App dynamically scans and connects to the next available port.

## 🎹 Keyboard Shortcuts (Bounty Workflow)
Because real hunters hate reaching for the mouse:
- `Ctrl + S`: Instantly save the currently open file.
- `Alt + T`: Toggle the Web Terminal View seamlessly.
- `Alt + N`: Prompt to instantly create a new file (automatically nested into your currently highlighted folder).
- `Alt + D`: Create a new relative directory.
- `Alt + S`: Instantly trigger the fuzzy File/Directory Search scanner.

## 📥 Installation

There are two ways to use DamnNotes:

### 1. Global NPM Install
You can install DamnNotes globally across your machine.

```bash
# Clone the repository
git clone https://github.com/onlybugs05/DamnNotes.git
cd DamnNotes

# Install all dependencies and build the static payload
npm run build

# Link the package globally
npm link
```

### 2. Standard Server Usage
If you prefer not to install it globally, simply drop into the directory and run it.
```bash
npm install
npm install --prefix client
npm run build --prefix client
node bin/damnnotes.js
```

## 🎮 Usage
Once globally installed via `npm link`, you can navigate to any active hacking workspace and just type the command:

```bash
cd ~/Desktop/HackerOne/SomeProgram
damnnotes
```

You'll get an output like this:
```bash
========================================
🛡️  Starting DamnNotes Secure Server  🛡️
========================================

✅ Local server securely bound to 127.0.0.1:4500

Launch complete! Cmd/Ctrl-Click the link below to open your bug bounty workspace:
http://localhost:4500
```
Just Cmd/Ctrl-Click the URL to open it in your browser!

## ⚙️ Architecture 
- **Backend**: Express + express-ws (WebSocket Tunneling) + Bash `child_process`.
- **Frontend**: React + Vite + xterm.js + React-Markdown.

## 🤝 Contributing
Feel free to open PRs, build new tools, and submit bug reports!

Happy hunting. 🎯
