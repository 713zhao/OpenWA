# Interactive Messages — Design Spec

**Date:** 2026-06-01  
**Scope:** Add `POST /send-buttons` and `POST /send-list` endpoints to OpenWA  
**Approach:** Thin pass-through (Option A) — no DB persistence, follows `sendLocation`/`sendContact` pattern

---

## 1. Context

whatsapp-web.js exports `Buttons` and `List` classes that `client.sendMessage()` accepts. OpenWA has not yet wired these up. Replies to buttons/list messages arrive as normal `message.received` webhook events — no special receive-side handling needed.

**Constraints:**
- Max 3 buttons per `Buttons` message (enforced by whatsapp-web.js)
- `List` requires at least one section with at least one row
- Both types may be silently dropped by WhatsApp on personal accounts; work reliably on WhatsApp Business

---

## 2. New DTOs

**File:** `src/modules/message/dto/send-message.dto.ts`

### `SendButtonsMessageDto`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chatId` | string | ✅ | e.g. `6588123456@c.us` or `120363...@g.us` |
| `body` | string | ✅ | Main message text (max 4096 chars) |
| `buttons` | `ButtonItem[]` | ✅ | 1–3 buttons |
| `title` | string | ❌ | Optional header text |
| `footer` | string | ❌ | Optional footer text |

**`ButtonItem`:** `{ id?: string, body: string }`  
- `id` auto-generated if omitted
- `body` is the button label

### `SendListMessageDto`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chatId` | string | ✅ | Chat ID |
| `body` | string | ✅ | Message description text |
| `buttonText` | string | ✅ | Label on the list-picker button |
| `sections` | `ListSection[]` | ✅ | At least one section |
| `title` | string | ❌ | Optional header |
| `footer` | string | ❌ | Optional footer |

**`ListSection`:** `{ title?: string, rows: ListRow[] }`  
**`ListRow`:** `{ id?: string, title: string, description?: string }`

---

## 3. Engine Interface

**File:** `src/engine/interfaces/whatsapp-engine.interface.ts`

Add two new interfaces and two new methods:

```typescript
interface ButtonsInput {
  chatId: string;
  body: string;
  buttons: Array<{ id?: string; body: string }>;
  title?: string;
  footer?: string;
}

interface ListInput {
  chatId: string;
  body: string;
  buttonText: string;
  sections: Array<{
    title?: string;
    rows: Array<{ id?: string; title: string; description?: string }>;
  }>;
  title?: string;
  footer?: string;
}
```

Methods added to `IWhatsAppEngine`:
```typescript
sendButtonsMessage(chatId: string, input: ButtonsInput): Promise<MessageResult>;
sendListMessage(chatId: string, input: ListInput): Promise<MessageResult>;
```

---

## 4. Adapter Implementation

**File:** `src/engine/adapters/whatsapp-web-js.adapter.ts`

```typescript
async sendButtonsMessage(chatId, input): Promise<MessageResult> {
  const btns = new Buttons(input.body, input.buttons, input.title, input.footer);
  const msg = await this.client.sendMessage(chatId, btns);
  return { id: msg.id._serialized, timestamp: msg.timestamp };
}

async sendListMessage(chatId, input): Promise<MessageResult> {
  const list = new List(input.body, input.buttonText, input.sections, input.title, input.footer);
  const msg = await this.client.sendMessage(chatId, list);
  return { id: msg.id._serialized, timestamp: msg.timestamp };
}
```

Error from whatsapp-web.js (e.g. `[BT01] No buttons`, `[LT02] List without sections`) is caught and re-thrown as `BadRequestException`.

---

## 5. Service Methods

**File:** `src/modules/message/message.service.ts`

Two new methods following the `sendLocation` pattern (no pre-send DB save):

```typescript
async sendButtons(sessionId, dto): Promise<MessageResponseDto>
async sendList(sessionId, dto): Promise<MessageResponseDto>
```

Each: gets engine → calls adapter method → returns `{ messageId, timestamp }`.

---

## 6. Controller Endpoints

**File:** `src/modules/message/message.controller.ts`

```
POST /api/sessions/:sessionId/messages/send-buttons
POST /api/sessions/:sessionId/messages/send-list
```

Both require `ApiKeyRole.OPERATOR`. Return `201` with `MessageResponseDto`.

---

## 7. Error Handling

| Scenario | HTTP Response |
|----------|--------------|
| Session not connected | `400 Bad Request` |
| 0 buttons provided | `400 Bad Request` (from whatsapp-web.js `[BT01]`) |
| Empty sections/rows | `400 Bad Request` (from whatsapp-web.js `[LT02–LT05]`) |
| WhatsApp silently drops message | `201` returned (WA gives no error signal) |

---

## 8. Files Changed

1. `src/modules/message/dto/send-message.dto.ts` — add DTOs
2. `src/engine/interfaces/whatsapp-engine.interface.ts` — add interfaces + method signatures
3. `src/engine/adapters/whatsapp-web-js.adapter.ts` — implement methods
4. `src/modules/message/message.service.ts` — add service methods
5. `src/modules/message/message.controller.ts` — add endpoints

No new files. No DB migrations. No webhook changes.
