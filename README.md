# Discord Username Finder

A multi-bot username availability checker with a backend proxy — hostable on any platform.

## Why a backend proxy?

Calling Discord's API directly from a browser gets flagged as malicious by hosting platforms (Netlify, Vercel, GitHub Pages, etc.) because it looks like a phishing/credential-harvesting tool. This project routes all Discord API calls through a small Node.js server you control — the browser never touches Discord directly, which clears the security flags.

---

## Quick Start (local)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server.js

# 3. Open your browser
#    http://localhost:3000
```

Your tokens are stored **in your browser only** (localStorage) and sent to the local server on each session start. They are never written to disk on the server.

---

## Free Hosting Options

### Railway.app (easiest)
1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Done — Railway auto-detects Node.js and runs `npm start`

### Render.com
1. Push to GitHub
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Free tier keeps it live

### Glitch.com (no GitHub needed)
1. Go to glitch.com → New Project → Import from GitHub
   OR paste `server.js`, `package.json`, and `public/index.html` manually
2. Glitch runs it instantly

### Fly.io
```bash
npm install -g flyctl
fly launch
fly deploy
```

---

## Multi-Bot Speed

Each bot token you add runs as a parallel worker:

| Bots | Checks/min | 100 checks |
|------|-----------|------------|
| 1    | ~15–20    | ~5–7 min   |
| 2    | ~30–40    | ~2–3 min   |
| 3    | ~45–60    | ~1–2 min   |
| 5    | ~75–100   | ~1 min     |

Discord rate limits are per-token, so more bots = proportionally more speed.

---

## Getting Bot Tokens

1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it anything
3. Go to **Bot** tab → **Add Bot** → **Reset Token** → copy it
4. Repeat for each additional bot (you can make up to 25 apps per account)
5. **You do NOT need to invite the bots to any server**

---

## Fair Use

This tool is for finding a username **for yourself**. Mass-hoarding usernames to sell them is a Discord ToS violation. Keep scans reasonable — under 500 checks per session, a few sessions per day.
