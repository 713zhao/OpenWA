# OpenWA Cross-Pi WhatsApp Messaging Guide

This guide describes how to configure and use the **OpenWA WhatsApp Service** running on **this Raspberry Pi (Gateway)** from **another Raspberry Pi (Client)** on your local network.

---

## 🗺️ Architecture Overview

```
 [ Other Raspberry Pi ] --( Local Network / HTTP POST )--> [ Current Raspberry Pi (192.168.0.100) ]
        (Client)                                                  (Gateway - OpenWA Service)
                                                                             │
                                                                       (WhatsApp Web)
                                                                             │
                                                                             ▼
                                                                     [ WhatsApp Cloud ]
```

---

## 🛠️ Step 1: Verification & Tasks Completed on Current Pi (Gateway)

Everything on this current Pi has already been verified and is ready to accept connections:

1. **Service Port Binding**: The OpenWA service is confirmed to be listening on `port 2785` across **all network interfaces** (`*:2785`).
2. **Firewall Access**: The UFW firewall on this Pi has been checked and already has a rule explicitly allowing incoming traffic on **port 2785/tcp**:
   ```bash
   2785/tcp                   ALLOW       Anywhere
   ```
3. **Local IP Address**: This Pi is accessible at **`192.168.0.100`** (or via local MDNS hostname **`Eric.local`**).
4. **API Security Key**: The API master key is **`dev-admin-key`**.
5. **Active WhatsApp Session**: An active and connected WhatsApp session is ready under:
   - **Session ID**: `8ea964fe-81f0-4aaa-a2e2-3bf117481c28`
   - **Session Name / Alias**: `main` (We will use the simple name `main` in the API endpoints).

---

## 🚀 Step 2: Sending Messages from the Other Pi (Client)

You do **not** need to install the full OpenWA service or heavy dependencies on your other Raspberry Pi. You can send messages with simple, lightweight HTTP requests to this Pi.

### Endpoint Details

- **Method**: `POST`
- **URL**: `http://192.168.0.100:2785/api/sessions/main/messages/send-text`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-Key: dev-admin-key`
- **Body JSON**:
  ```json
  {
    "chatId": "6588775526@c.us",
    "text": "Your message text here"
  }
  ```

---

### 💻 Code Examples for the Other Pi

Here are different ways to send the message from the other Raspberry Pi.

#### 1. Curl (Command Line / Shell Scripts)
Run this command from the terminal of your other Pi to test instantly:

```bash
curl -X POST http://192.168.0.100:2785/api/sessions/main/messages/send-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-admin-key" \
  -d '{
    "chatId": "6588775526@c.us",
    "text": "Hello! This is a test message sent from the other Raspberry Pi."
  }'
```

#### 2. Python Script (using `requests`)
Create a lightweight script `send_message.py` on your other Pi:

```python
import requests

def send_whatsapp(message_text, recipient_phone="6588775526"):
    gateway_ip = "192.168.0.100"
    port = "2785"
    api_key = "dev-admin-key"
    session_name = "main"

    url = f"http://{gateway_ip}:{port}/api/sessions/{session_name}/messages/send-text"
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key
    }
    
    payload = {
        "chatId": f"{recipient_phone}@c.us",
        "text": message_text
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 201 or response.status_code == 200:
            print("✅ Message sent successfully!")
            print("Response:", response.json())
            return True
        else:
            print(f"❌ Failed to send message. HTTP Status: {response.status_code}")
            print("Response:", response.text)
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

if __name__ == "__main__":
    send_whatsapp("Hello from the python script on the other Pi!")
```

#### 3. Node.js (using `fetch`)
If you use Node.js on your other Pi:

```javascript
const gatewayIp = '192.168.0.100';
const apiKey = 'dev-admin-key';
const chatId = '6588775526@c.us';
const text = 'Hello from Node.js fetch on the other Pi!';

async function sendWhatsApp() {
  try {
    const res = await fetch(`http://${gatewayIp}:2785/api/sessions/main/messages/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({ chatId, text })
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Message sent:', data);
    } else {
      console.error('❌ Status:', res.status, await res.text());
    }
  } catch (err) {
    console.error('❌ Error connecting to OpenWA Gateway:', err.message);
  }
}

sendWhatsApp();
```

---

## 🔒 Security Recommendations

Since you are running this service locally, please consider these configurations for production safety:

1. **Static IP Reservation**: In your home router configuration, assign a static IP (or DHCP reservation) to the current Pi (Gateway) so it always remains at `192.168.0.100`.
2. **Local Hostname (mDNS)**: You can use `http://Eric.local:2785` in place of `http://192.168.0.100:2785` if both Pis support Avahi/mDNS (enabled by default on Raspberry Pi OS).
3. **Restricting Firewall Rules**: If you want to restrict access so that **only** the other Pi can connect to the current Pi's port 2785, you can replace the open UFW rule with a targeted rule.
   * On this current Pi, run:
     ```bash
     sudo ufw delete allow 2785/tcp
     sudo ufw allow from <OTHER_PI_IP_ADDRESS> to any port 2785 proto tcp comment 'OpenWA from Client Pi'
     sudo ufw reload
     ```
