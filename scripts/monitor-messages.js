#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const MONITOR_NUMBER = '6593287628';
const LOCAL_PORT = 3344;
const LOCAL_WEBHOOK_URL = `http://127.0.0.1:${LOCAL_PORT}/webhook`;

function cleanToDigits(str) {
  return str ? str.replace(/\D/g, '') : '';
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = { PORT: 2785, API_MASTER_KEY: '' };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val;
      }
    }
  }
  if (!env.API_MASTER_KEY) {
    const keyPath = path.join(__dirname, '..', 'data', '.api-key');
    if (fs.existsSync(keyPath)) env.API_MASTER_KEY = fs.readFileSync(keyPath, 'utf-8').trim();
  }
  return env;
}

const env = loadEnv();
const API_URL = `http://localhost:${env.PORT}`;
const API_HEADERS = { 'Content-Type': 'application/json', 'X-API-Key': env.API_MASTER_KEY };

let webhookId = null;
let targetSessionId = process.argv[2] || null;
let localServer = null;
const seenMessages = new Set(); // deduplicate

async function discoverSession() {
  if (targetSessionId) return targetSessionId;
  console.log('🔍 Querying active OpenWA sessions...');
  try {
    const res = await fetch(`${API_URL}/api/sessions`, { headers: API_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    let sessions = Array.isArray(json) ? json : (json?.data || []);
    if (sessions.length > 0) {
      const connected = sessions.find(s => ['CONNECTED','READY'].includes((s.status||'').toUpperCase()));
      const chosen = connected || sessions[0];
      console.log(`💡 Using session: '${chosen.id}' (Status: ${chosen.status})`);
      return chosen.id;
    }
  } catch (err) {
    console.log(`⚠️ Failed to auto-discover sessions: ${err.message}`);
  }
  return 'default';
}

async function cleanUpAndExit(code = 0) {
  if (webhookId && targetSessionId) {
    console.log(`\n🧹 Removing webhook (ID: ${webhookId})...`);
    try {
      const res = await fetch(`${API_URL}/api/sessions/${targetSessionId}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': env.API_MASTER_KEY },
      });
      console.log(res.ok ? '✅ Webhook removed.' : `⚠️ Deletion returned status ${res.status}`);
    } catch (err) {
      console.error('⚠️ Error removing webhook:', err.message);
    }
  }
  if (localServer) localServer.close();
  process.exit(code);
}

async function main() {
  targetSessionId = await discoverSession();

  localServer = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (payload.event === 'message.received' && payload.data) {
            const msg = payload.data;

            // Skip empty body messages (reactions, status pings, receipts)
            if (!msg.body || msg.body.trim() === '') return;

            // Deduplicate by message ID
            if (msg.id && seenMessages.has(msg.id)) return;
            if (msg.id) seenMessages.add(msg.id);
            const isGroup = (msg.isGroup === true) || (typeof msg.from === 'string' && msg.from.endsWith('@g.us'));
            const senderPhone = msg.senderPhone || cleanToDigits(msg.from);
            const toClean = cleanToDigits(msg.to);
            const authorPhone = msg.senderPhone || cleanToDigits(msg.author);

            const isTarget = senderPhone === MONITOR_NUMBER || toClean === MONITOR_NUMBER || authorPhone === MONITOR_NUMBER;

            if (isGroup) {
              const groupId = msg.from || msg.chatId || 'Unknown Group';
              console.log(`\n── 👥 GROUP ──────────────────────────────────────`);
              console.log(`Group:    ${msg.chatName || groupId}`);
              console.log(`Sender:   ${msg.pushName || 'Unknown'} (+${authorPhone})`);
              console.log(`Message:  ${msg.body}`);
              console.log(`Time:     ${new Date().toLocaleTimeString()}`);
              console.log(`───────────────────────────────────────────────\n`);
            } else {
              const prefix = isTarget ? '📲 TARGET' : '📨 MSG';
              console.log(`\n── ${prefix} ──────────────────────────────────────`);
              console.log(`From:     ${msg.pushName || 'Unknown'} (+${senderPhone})`);
              if (toClean) console.log(`To:       +${toClean}`);
              console.log(`Message:  ${msg.body}`);
              console.log(`Time:     ${new Date().toLocaleTimeString()}`);
              console.log(`───────────────────────────────────────────────\n`);
            }
          }
        } catch (_) {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Monitoring active...');
    }
  });

  localServer.listen(LOCAL_PORT, async () => {
    console.log(`🚀 Message monitor running on port ${LOCAL_PORT}`);
    console.log(`📱 Watching for messages involving +${MONITOR_NUMBER}`);
    console.log(`👀 Press Ctrl+C to stop.\n`);
    try {
      const webhookRes = await fetch(`${API_URL}/api/sessions/${targetSessionId}/webhooks`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ url: LOCAL_WEBHOOK_URL, events: ['message.received'], secret: 'monitor-secret' }),
      });
      const webhookJson = await webhookRes.json();
      if (!webhookRes.ok) throw new Error(webhookJson.message || `HTTP ${webhookRes.status}`);
      webhookId = webhookJson.id;
      console.log(`✅ Webhook registered (ID: ${webhookId}) — monitoring live.\n`);
    } catch (err) {
      console.error(`❌ Error:`, err.message);
      await cleanUpAndExit(1);
    }
  });
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Monitor stopped.');
  await cleanUpAndExit(0);
});

main();
