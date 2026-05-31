#!/usr/bin/env node
const http = require('http');

const PORT = process.argv[2] || 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(`\n========================================`);
        console.log(`⏰ Received Webhook Event: ${payload.event || 'unknown'}`);
        console.log(`📦 Session ID: ${payload.sessionId}`);
        console.log(`========================================`);

        if (payload.event === 'message.received' && payload.data) {
          const msg = payload.data;
          console.log(`From:   ${msg.from}`);
          console.log(`Author: ${msg.author || msg.from}`);
          console.log(`Body:   ${msg.body}`);
        } else {
          console.log(JSON.stringify(payload, null, 2));
        }
        console.log(`========================================\n`);
      } catch (err) {
        console.log('Received raw payload:', body);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OpenWA Local Webhook Receiver running...');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Webhook listener is running on port ${PORT}...`);
  console.log(`🔗 Register your webhook URL in OpenWA to: http://localhost:${PORT}`);
});
