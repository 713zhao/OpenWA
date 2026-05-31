#!/bin/bash
# OpenWA CLI - Send Message Helper Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

API_PORT="${PORT:-2785}"
API_KEY="${API_MASTER_KEY}"

# Self-heal: Load local dev key if empty
if [ -z "$API_KEY" ] && [ -f "$PROJECT_DIR/data/.api-key" ]; then
    API_KEY=$(cat "$PROJECT_DIR/data/asdasd" 2>/dev/null || cat "$PROJECT_DIR/data/.api-key" | tr -d '\r\n ')
fi

# Usage guide
usage() {
    echo "Usage: $0 <session-id> <phone-number> <message-text>"
    echo "Example: $0 my-bot 1234567890 \"Hello from OpenWA CLI!\""
    exit 1
}

if [ "$#" -lt 3 ]; then
    usage
fi

SESSION_ID="$1"
PHONE_NUMBER="$2"
MESSAGE_TEXT="$3"

# Automatically append @c.us if not present
if [[ ! "$PHONE_NUMBER" =~ @ ]]; then
    PHONE_NUMBER="${PHONE_NUMBER}@c.us"
fi

echo "Sending message to $PHONE_NUMBER via session '$SESSION_ID'..."

curl -s -X POST "http://localhost:${API_PORT}/api/sessions/${SESSION_ID}/messages/send-text" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"chatId\": \"${PHONE_NUMBER}\",
    \"text\": \"${MESSAGE_TEXT}\"
  }"

echo -e "\n"
