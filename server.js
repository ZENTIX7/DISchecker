/**
 * Discord Username Finder — Backend Proxy
 * =========================================
 * This server holds your bot tokens and proxies Discord API calls.
 * The frontend NEVER touches Discord directly — this is why hosting works.
 *
 * QUICK START:
 *   npm install
 *   node server.js
 *
 * Then open http://localhost:3000 in your browser.
 *
 * FREE HOSTING OPTIONS (all work with this setup):
 *   • Railway.app  — free tier, push to GitHub and deploy
 *   • Render.com   — free tier, same process
 *   • Fly.io       — free tier, slightly more setup
 *   • Glitch.com   — paste code directly, instant deploy
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const app      = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html

// ─────────────────────────────────────────
//  In-memory token pool (filled via /api/tokens)
//  Tokens are stored only for the session —
//  they are never written to disk here.
// ─────────────────────────────────────────
let tokenPool = [];  // [{ token, label, valid, reqCount, errorCount }]
let poolIndex = 0;   // round-robin pointer

function nextToken() {
  const valid = tokenPool.filter(t => t.valid);
  if (!valid.length) return null;
  const t = valid[poolIndex % valid.length];
  poolIndex++;
  return t;
}

// ── Sleep helper ──
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Discord fetch (server-side, no CORS issues) ──
async function discordFetch(token, username) {
  const url = `https://discord.com/api/v10/users/${encodeURIComponent(username)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bot ${token}` }
  });
  return res;
}

// ═══════════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════════

// POST /api/tokens  — add / replace token list
// Body: { tokens: [{ token: "MTIz...", label: "Bot 1" }, ...] }
app.post('/api/tokens', async (req, res) => {
  const { tokens } = req.body;
  if (!tokens || !Array.isArray(tokens)) return res.status(400).json({ error: 'tokens array required' });

  // Validate each token against Discord
  const results = [];
  for (const entry of tokens) {
    const t = (entry.token || '').trim();
    if (!t) continue;
    try {
      const r = await discordFetch(t, '@me');
      // /users/@me with a Bot token returns 401, which is expected.
      // A 200 would mean it's a user token. 401 means valid bot token format.
      // The real test is whether it's not a 0-length/garbage string.
      // We do a proper verify via /gateway endpoint:
      const gr = await fetch('https://discord.com/api/v10/gateway', {
        headers: { 'Authorization': `Bot ${t}` }
      });
      const valid = gr.status !== 401;
      results.push({ token: t, label: entry.label || `Bot ${results.length + 1}`, valid, reqCount: 0, errorCount: 0 });
    } catch {
      results.push({ token: t, label: entry.label || `Bot ${results.length + 1}`, valid: false, reqCount: 0, errorCount: 0 });
    }
  }

  tokenPool = results;
  poolIndex = 0;

  res.json({
    added: results.length,
    valid: results.filter(t => t.valid).length,
    tokens: results.map(t => ({ label: t.label, valid: t.valid })) // never return raw token to client
  });
});

// GET /api/tokens — get current pool status (no raw tokens returned)
app.get('/api/tokens', (req, res) => {
  res.json({
    total: tokenPool.length,
    valid: tokenPool.filter(t => t.valid).length,
    tokens: tokenPool.map(t => ({
      label: t.label,
      valid: t.valid,
      reqCount: t.reqCount,
      errorCount: t.errorCount
    }))
  });
});

// DELETE /api/tokens — clear all tokens
app.delete('/api/tokens', (req, res) => {
  tokenPool = [];
  poolIndex = 0;
  res.json({ cleared: true });
});

// POST /api/check — check a single username
// Body: { username: "someuser" }
app.post('/api/check', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });

  const t = nextToken();
  if (!t) return res.status(503).json({ error: 'No valid tokens in pool. Add tokens first.' });

  try {
    t.reqCount++;
    const r = await discordFetch(t.token, username);

    if (r.status === 404) return res.json({ username, status: 'available', via: t.label });
    if (r.status === 200) return res.json({ username, status: 'taken',     via: t.label });
    if (r.status === 401) {
      t.valid = false;
      t.errorCount++;
      return res.status(401).json({ error: 'Token invalidated', label: t.label });
    }
    if (r.status === 429) {
      t.errorCount++;
      const data = await r.json().catch(() => ({}));
      return res.status(429).json({ error: 'rate_limited', retry_after: data.retry_after || 2, via: t.label });
    }
    return res.json({ username, status: 'unknown', code: r.status, via: t.label });
  } catch (e) {
    t.errorCount++;
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/verify-token — verify a single token before adding
// Body: { token: "MTIz...", label: "My Bot" }
app.post('/api/verify-token', async (req, res) => {
  const { token, label } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const r = await fetch('https://discord.com/api/v10/gateway', {
      headers: { 'Authorization': `Bot ${token}` }
    });
    const valid = r.status !== 401;
    res.json({ valid, label: label || 'Bot', status: r.status });
  } catch(e) {
    res.status(500).json({ valid: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Discord Username Finder running → http://localhost:${PORT}`);
  console.log(`   Open that URL in your browser\n`);
});
