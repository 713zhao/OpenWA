#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const TARGET_RAW = '+6588775526';
const TARGET_CLEAN = '6588775526';
const TARGET_CHAT_ID = `${TARGET_CLEAN}@c.us`;
const LOCAL_PORT = 3344;
const LOCAL_WEBHOOK_URL = `http://127.0.0.1:${LOCAL_PORT}/webhook`;

// Utility to clean strings down to digits
function cleanToDigits(str) {
  return str ? str.replace(/\D/g, '') : '';
}

// 1. Load configuration from .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = { PORT: 2785, API_MASTER_KEY: '' };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        env[match[1]] = val;
      }
    }
  }

  // Self-heal: If empty, try to load the generated development API key
  if (!env.API_MASTER_KEY) {
    const keyPath = path.join(__dirname, '..', 'data', '.api-key');
    if (fs.existsSync(keyPath)) {
      env.API_MASTER_KEY = fs.readFileSync(keyPath, 'utf-8').trim();
    }
  }

  return env;
}

const env = loadEnv();
const API_URL = `http://localhost:${env.PORT}`;
const API_HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': env.API_MASTER_KEY,
};

let webhookId = null;
let targetSessionId = process.argv[2] || null;
let localServer = null;

// 2. Discover active connected session if not specified
async function discoverSession() {
  if (targetSessionId) return targetSessionId;

  console.log('🔍 Querying active OpenWA sessions...');
  try {
    const res = await fetch(`${API_URL}/api/sessions`, { headers: API_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    let sessions = [];
    if (Array.isArray(json)) {
      sessions = json;
    } else if (json && json.success && Array.isArray(json.data)) {
      sessions = json.data;
    }

    if (sessions.length > 0) {
      const connected = sessions.find(s => {
        const stat = (s.status || '').toUpperCase();
        return stat === 'CONNECTED' || stat === 'READY';
      });
      if (connected) {
        console.log(
          `💡 Found connected session: '${connected.id}' (Name: ${connected.name}, Phone: ${connected.phoneNumber || connected.phone || 'Unknown'})`,
        );
        return connected.id;
      }
      const first = sessions[0];
      console.log(
        `⚠️ No session is in 'CONNECTED' status. Defaulting to first session: '${first.id}' (Name: ${first.name}, Status: ${first.status})`,
      );
      return first.id;
    }
  } catch (err) {
    console.log(`⚠️ Failed to auto-discover sessions: ${err.message}`);
  }

  console.log(`➡️ Defaulting to session 'default'`);
  return 'default';
}

// 3. Cleanup and exit gracefully
async function cleanUpAndExit(code = 0) {
  if (webhookId && targetSessionId) {
    console.log(`\n🧹 Deleting temporary webhook registration (ID: ${webhookId})...`);
    try {
      const res = await fetch(`${API_URL}/api/sessions/${targetSessionId}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': env.API_MASTER_KEY },
      });
      if (res.ok) {
        console.log('✅ Temporary webhook deleted successfully.');
      } else {
        console.log(`⚠️ Deletion returned status ${res.status}`);
      }
    } catch (err) {
      console.error('⚠️ Error deleting temporary webhook:', err.message);
    }
  }

  if (localServer) {
    localServer.close();
  }
  process.exit(code);
}

// 4. Main test flow
async function main() {
  targetSessionId = await discoverSession();

  // A. Start local webhook server
  localServer = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          if (payload.event === 'message.received' && payload.data) {
            const msg = payload.data;
            const fromClean = cleanToDigits(msg.from);
            const authorClean = cleanToDigits(msg.author);

            // Check if incoming message is from the target number
            if (fromClean === TARGET_CLEAN || authorClean === TARGET_CLEAN) {
              console.log(`\n==================================================`);
              console.log(`🎉 SUCCESS! Incoming reply received from +${TARGET_CLEAN}`);
              console.log(`==================================================`);
              console.log(`Sender:   ${msg.pushName || 'Unknown'} (+${fromClean})`);
              console.log(`Message:  ${msg.body}`);
              console.log(`Time:     ${new Date().toLocaleTimeString()}`);
              console.log(`==================================================\n`);

              // Stop server and clean up webhook
              await cleanUpAndExit(0);
            }
          }
        } catch (err) {
          // Ignore parse errors from invalid json
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Listening for replies...');
    }
  });

  localServer.listen(LOCAL_PORT, async () => {
    console.log(`🚀 Local test receiver listening on port ${LOCAL_PORT}...`);

    try {
      // B. Register webhook in OpenWA
      console.log(`🔗 Registering temporary webhook ${LOCAL_WEBHOOK_URL} in session '${targetSessionId}'...`);
      const webhookRes = await fetch(`${API_URL}/api/sessions/${targetSessionId}/webhooks`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          url: LOCAL_WEBHOOK_URL,
          events: ['message.received'],
          secret: 'test-chat-temp-secret',
        }),
      });

      const webhookJson = await webhookRes.json();
      if (!webhookRes.ok) {
        throw new Error(webhookJson.message || `HTTP ${webhookRes.status}`);
      }

      webhookId = webhookJson.id;
      console.log(`✅ Temporary webhook registered successfully (ID: ${webhookId})`);

      // C. Send the test message
      console.log(`✉️ Sending test message to ${TARGET_RAW}...`);
      const sendRes = await fetch(`${API_URL}/api/sessions/${targetSessionId}/messages/send-text`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          text: 'Hello! This is an automated test message from the OpenWA CLI test script. Please reply to this message to complete the test.',
        }),
      });

      const sendJson = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendJson.message || `HTTP ${sendRes.status}`);
      }

      console.log(`📬 Test message sent successfully!`);
      console.log(`👀 Watching for reply from +${TARGET_CLEAN}... (Press Ctrl+C to stop)`);
    } catch (err) {
      console.error(`\n❌ Error during execution:`, err.message);
      await cleanUpAndExit(1);
    }
  });
}

// Trap SigInt for clean cancellation
process.on('SIGINT', async () => {
  console.log('\n🛑 Testing script cancelled by user.');
  await cleanUpAndExit(0);
});

main();
