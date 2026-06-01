# OpenWA — How to Send & Receive Messages

## Overview

- **Base URL:** `http://localhost:2785`
- **Auth header:** `X-API-Key: <your-api-key>` (find it in `data/.api-key` or the startup log)
- **Session ID:** use the ID from `GET /api/sessions` (e.g. `a9ec6b5c-a835-40c1-add1-6d5212d101f6`)
- **Chat ID format:**
  - Individual: `<country-code><number>@c.us` → e.g. `6593287628@c.us`
  - Group: `<groupId>@g.us` → e.g. `120363012345678901@g.us`

---

## 1. Find Your Session ID

```bash
curl http://localhost:2785/api/sessions \
  -H "X-API-Key: <your-api-key>"
```

**Response:**
```json
[
  {
    "id": "a9ec6b5c-a835-40c1-add1-6d5212d101f6",
    "name": "fristbot",
    "status": "ready",
    "phone": "6593287628"
  }
]
```

Copy the `id` — you'll use it in every request as `{sessionId}`.

---

## 2. Sending Messages

### 2.1 Send a Text Message

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-text \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "6588123456@c.us",
    "text": "Hello from OpenWA!"
  }'
```

**Response:**
```json
{
  "messageId": "true_6588123456@c.us_3EB0123456789",
  "timestamp": 1706868000
}
```

---

### 2.2 Send an Image

Provide either a public URL or a base64-encoded string.

**Using URL:**
```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-image \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "6588123456@c.us",
    "url": "https://example.com/photo.jpg",
    "caption": "Check this out!"
  }'
```

**Using base64:**
```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-image \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "6588123456@c.us",
    "base64": "<base64-string>",
    "mimetype": "image/jpeg",
    "filename": "photo.jpg",
    "caption": "Caption here"
  }'
```

---

### 2.3 Send a Document / File

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-document \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "6588123456@c.us",
    "url": "https://example.com/report.pdf",
    "filename": "report.pdf",
    "caption": "Monthly report"
  }'
```

Same pattern works for:
- **Video:** `POST /messages/send-video`
- **Audio:** `POST /messages/send-audio`
- **Sticker:** `POST /messages/send-sticker`

---

### 2.4 Send a Location

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-location \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "6588123456@c.us",
    "latitude": 1.3521,
    "longitude": 103.8198,
    "description": "Singapore",
    "address": "1 Raffles Place, Singapore"
  }'
```

---

### 2.5 Reply to a Message

Use the `messageId` from a received message to quote-reply:

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/reply \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "6588123456@c.us",
    "quotedMessageId": "true_6588123456@c.us_3EB0123456789",
    "text": "Got it, thanks!"
  }'
```

---

### 2.6 Send to a Group

Replace the `chatId` with a group ID (`@g.us`):

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-text \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "120363012345678901@g.us",
    "text": "Hello everyone!"
  }'
```

To find group IDs, check the incoming message `from` field — group messages have `from` ending in `@g.us`.

---

### 2.7 Bulk Send (up to 100 messages)

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-bulk \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "chatId": "6588111111@c.us",
        "type": "text",
        "content": { "text": "Hello Alice!" }
      },
      {
        "chatId": "6588222222@c.us",
        "type": "text",
        "content": { "text": "Hello Bob!" }
      }
    ],
    "options": {
      "delayBetweenMessages": 3000,
      "randomizeDelay": true,
      "stopOnError": false
    }
  }'
```

**Response:**
```json
{
  "batchId": "batch-abc123",
  "status": "processing",
  "totalMessages": 2,
  "estimatedCompletionTime": "2026-01-01T12:00:06.000Z",
  "statusUrl": "/api/sessions/{sessionId}/messages/batch/batch-abc123"
}
```

**Check batch status:**
```bash
curl http://localhost:2785/api/sessions/{sessionId}/messages/batch/batch-abc123 \
  -H "X-API-Key: <your-api-key>"
```

---

## 3. Receiving Messages (Webhooks)

OpenWA pushes incoming events to a URL you register. Your server must accept `POST` requests and return HTTP `200`.

### 3.1 Register a Webhook

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/webhooks \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["message.received"],
    "secret": "my-secret-key",
    "retryCount": 3
  }'
```

**Response:**
```json
{
  "id": "wh-abc123",
  "sessionId": "a9ec6b5c-...",
  "url": "https://your-server.com/webhook",
  "events": ["message.received"],
  "active": true,
  "retryCount": 3,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### 3.2 Available Events

| Event | Description |
|-------|-------------|
| `message.received` | Incoming message (text, media, group) |
| `message.sent` | Message sent successfully |
| `message.ack` | Delivery/read acknowledgement |
| `message.revoked` | Message deleted by sender |
| `session.status` | Session state changed |
| `session.qr` | New QR code generated |
| `session.authenticated` | Session authenticated |
| `session.disconnected` | Session disconnected |
| `group.join` | User joined a group |
| `group.leave` | User left a group |
| `group.update` | Group info updated |

---

### 3.3 Webhook Payload — Incoming Message

When a message is received, OpenWA sends a `POST` to your URL with this body:

```json
{
  "event": "message.received",
  "sessionId": "a9ec6b5c-a835-40c1-add1-6d5212d101f6",
  "timestamp": 1706868000,
  "data": {
    "id": "true_6588123456@c.us_3EB0123456789",
    "from": "6588123456@c.us",
    "to": "6593287628@c.us",
    "chatId": "6588123456@c.us",
    "body": "Hello!",
    "type": "chat",
    "timestamp": 1706868000,
    "fromMe": false,
    "isGroup": false,
    "pushName": "Alice",
    "senderPhone": "6588123456"
  }
}
```

**Group message** — `isGroup: true`, `from` is the group ID:
```json
{
  "event": "message.received",
  "data": {
    "from": "120363012345678901@g.us",
    "chatId": "120363012345678901@g.us",
    "body": "Hey group!",
    "isGroup": true,
    "pushName": "Alice"
  }
}
```

### 3.4 Verify Webhook Signature (HMAC)

If you set a `secret`, OpenWA signs each request. Verify it on your server:

```javascript
const crypto = require('crypto');

function verifyWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return signature === expected;
}
```

---

### 3.5 Minimal Webhook Server (Node.js)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const { event, data } = req.body;

  if (event === 'message.received' && data.body) {
    const sender = data.pushName || 'Unknown';
    const phone  = data.senderPhone || data.from;
    const isGroup = data.isGroup;

    if (isGroup) {
      console.log(`[Group ${data.chatId}] ${sender}: ${data.body}`);
    } else {
      console.log(`[DM] ${sender} (+${phone}): ${data.body}`);
    }

    // Auto-reply example
    // sendMessage(data.chatId, 'Thanks for your message!');
  }

  res.json({ success: true });
});

app.listen(3000, () => console.log('Webhook server on port 3000'));
```

---

### 3.6 Manage Webhooks

```bash
# List all webhooks for a session
GET /api/sessions/{sessionId}/webhooks

# Get a specific webhook
GET /api/sessions/{sessionId}/webhooks/{webhookId}

# Update (e.g. change URL or disable)
PUT /api/sessions/{sessionId}/webhooks/{webhookId}
Body: { "url": "https://new-url.com/webhook", "active": false }

# Test a webhook (sends a test ping to your URL)
POST /api/sessions/{sessionId}/webhooks/{webhookId}/test

# Delete a webhook
DELETE /api/sessions/{sessionId}/webhooks/{webhookId}
```

---

## 4. Get Message History

```bash
# All messages for a session
GET /api/sessions/{sessionId}/messages

# Filter by chat
GET /api/sessions/{sessionId}/messages?chatId=6588123456@c.us&limit=50&offset=0
```

---

## 5. Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Send text | POST | `/api/sessions/{id}/messages/send-text` |
| Send image | POST | `/api/sessions/{id}/messages/send-image` |
| Send video | POST | `/api/sessions/{id}/messages/send-video` |
| Send audio | POST | `/api/sessions/{id}/messages/send-audio` |
| Send document | POST | `/api/sessions/{id}/messages/send-document` |
| Send location | POST | `/api/sessions/{id}/messages/send-location` |
| Send contact card | POST | `/api/sessions/{id}/messages/send-contact` |
| Send sticker | POST | `/api/sessions/{id}/messages/send-sticker` |
| Reply to message | POST | `/api/sessions/{id}/messages/reply` |
| Forward message | POST | `/api/sessions/{id}/messages/forward` |
| React to message | POST | `/api/sessions/{id}/messages/react` |
| Delete message | POST | `/api/sessions/{id}/messages/delete` |
| Bulk send | POST | `/api/sessions/{id}/messages/send-bulk` |
| Get history | GET | `/api/sessions/{id}/messages` |
| Register webhook | POST | `/api/sessions/{id}/webhooks` |
| List webhooks | GET | `/api/sessions/{id}/webhooks` |
| Delete webhook | DELETE | `/api/sessions/{id}/webhooks/{webhookId}` |

> Full interactive docs: **http://localhost:2785/api/docs**
