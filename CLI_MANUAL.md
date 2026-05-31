# 🛠️ OpenWA Command Line Interface (CLI) Manual

This manual provides a comprehensive reference for all command-line interfaces (CLIs), scripts, and tools available in **OpenWA** to manage containers, development lifecycles, database migrations, and diagnostics.

---

## 📌 Table of Contents

1. [OpenWA Smart Orchestration Script (`openwa.sh`)](#1-openwa-smart-orchestration-script-openwash)
2. [Docker Compose CLI Reference](#2-docker-compose-cli-reference)
3. [NPM Development Scripts](#3-npm-development-scripts)
4. [TypeORM Migration CLI](#4-typeorm-migration-cli)
5. [CURL Command-Line Diagnostics & API Interface](#5-curl-command-line-diagnostics--api-interface)

---

## 1. OpenWA Smart Orchestration Script (`openwa.sh`)

The smartest way to run OpenWA in any Docker environment is via the custom orchestration script located at `scripts/openwa.sh`. It automatically reads configuration values from your `.env` file and activates the appropriate Docker profiles based on your enabled services.

### Usage

```bash
./scripts/openwa.sh <command> [options]
```

### Commands

| Command                      | Description                                                                       |
| :--------------------------- | :-------------------------------------------------------------------------------- |
| **`start`**                  | Start OpenWA with auto-detected profiles.                                         |
| **`stop`**                   | Stop all OpenWA containers.                                                       |
| **`restart`**                | Restart OpenWA (stops first, then starts).                                        |
| **`status`**                 | Shows current status of all project containers.                                   |
| **`logs [service] [lines]`** | Tails live logs. Defaults to `openwa-api`. Lines defaults to `100`.               |
| **`build`**                  | Build custom Docker images locally based on `.env` configuration.                 |
| **`update`**                 | Perform a full update: `git pull` newer commits, rebuild, and restart containers. |
| **`help`**                   | Display help information.                                                         |

### Automatic Profile Detection

The script dynamically appends `--profile <name>` flags to `docker compose` depending on your `.env` settings:

- `POSTGRES_BUILTIN=true` ➡️ Activates the `postgres` profile.
- `REDIS_BUILTIN=true` ➡️ Activates the `redis` profile.
- `MINIO_BUILTIN=true` ➡️ Activates the `minio` profile.
- `DASHBOARD_ENABLED=true` ➡️ Activates the `with-dashboard` profile.
- `PROXY_ENABLED=true` ➡️ Activates the `with-proxy` profile.

### Examples

- **Start the stack:**
  ```bash
  ./scripts/openwa.sh start
  ```
- **View API container logs:**
  ```bash
  ./scripts/openwa.sh logs openwa-api 200
  ```
- **Check running container ports and state:**
  ```bash
  ./scripts/openwa.sh status
  ```

---

## 2. Docker Compose CLI Reference

If you prefer using the raw `docker compose` commands directly, here is the list of common operations and corresponding profile flags.

### Profiles Map

| Profile              | Services                                        |
| :------------------- | :---------------------------------------------- |
| **`postgres`**       | PostgreSQL database service container           |
| **`redis`**          | Redis cache service container                   |
| **`minio`**          | MinIO (S3-compatible) storage service container |
| **`with-dashboard`** | React Web Dashboard                             |
| **`with-proxy`**     | Traefik reverse proxy and dashboard             |
| **`full`**           | Shorthand profile containing all services above |

### Key Commands

- **Start in Development Mode:**
  ```bash
  docker compose -f docker-compose.dev.yml up -d
  ```
- **Start specific services (e.g. Postgres + Dashboard) in Production:**
  ```bash
  docker compose --profile postgres --profile with-dashboard up -d
  ```
- **Start Full Stack in Production:**
  ```bash
  docker compose --profile full up -d
  ```
- **Stop all services (including profiles):**
  ```bash
  docker compose --profile full down
  ```
- **Show live container resource statistics:**
  ```bash
  docker stats openwa-api openwa-dashboard
  ```

---

## 3. NPM Development Scripts

For local development or running OpenWA bare-metal on your host system, you can use the configured scripts inside `package.json`.

```bash
npm run <script-name>
```

### Script Directory

| Script                  | Command                         | Description                                                             |
| :---------------------- | :------------------------------ | :---------------------------------------------------------------------- |
| **`dev`**               | `concurrently ...`              | Runs both the NestJS API server and the Vite dashboard simultaneously.  |
| **`build`**             | `nest build`                    | Compiles the NestJS TypeScript codebase into production JS in `./dist`. |
| **`start`**             | `nest start`                    | Starts the application using the local source files.                    |
| **`start:dev`**         | `nest start --watch`            | Starts the application with live hot-reloading (for API development).   |
| **`start:prod`**        | `node dist/main`                | Runs the compiled production code.                                      |
| **`dashboard:install`** | `cd dashboard && npm install`   | Installs dependencies specifically for the React Dashboard.             |
| **`dashboard:build`**   | `cd dashboard && npm run build` | Compiles the Dashboard static bundle.                                   |
| **`lint`**              | `eslint ... --fix`              | Lints code syntax and automatically fixes style discrepancies.          |
| **`format`**            | `prettier --write ...`          | Formats all TS files using Prettier formatting rules.                   |

### Testing Scripts

- **Run all tests (unit & integration):**
  ```bash
  npm run test
  ```
- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```
- **Generate test coverage report:**
  ```bash
  npm run test:cov
  ```
- **Run End-to-End (E2E) tests:**
  ```bash
  npm run test:e2e
  ```

---

## 4. TypeORM Migration CLI

OpenWA uses TypeORM to handle database schema sync and updates dynamically.

```bash
npm run migration:<command>
```

### Migration Commands

| Command                                        | Description                                                                        |
| :--------------------------------------------- | :--------------------------------------------------------------------------------- |
| **`npm run migration:run`**                    | Executes all pending database migrations against the configured SQLite/PostgreSQL. |
| **`npm run migration:show`**                   | Shows completed and pending migrations status.                                     |
| **`npm run migration:revert`**                 | Reverts the last executed migration step.                                          |
| **`npm run migration:create --name=<name>`**   | Creates a blank migration file in `src/database/migrations/`.                      |
| **`npm run migration:generate --name=<name>`** | Auto-generates a migration file containing diffs between models and schema.        |

---

## 5. CURL Command-Line Diagnostics & API Interface

You can interact with and test OpenWA directly from your command line using `curl`.

### System Health Diagnostics

- **Basic API Health Check:**
  ```bash
  curl http://localhost:2785/health
  ```
- **Detailed Core Systems Status (requires API Key):**
  ```bash
  curl -H "X-API-Key: YOUR_API_KEY" http://localhost:2785/health/detailed
  ```

### Session Lifecycle Management

- **Create a New Session:**
  ```bash
  curl -X POST http://localhost:2785/api/sessions \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_API_KEY" \
    -d '{"name": "my-bot"}'
  ```
- **Start/Initialize a Session:**
  ```bash
  curl -X POST http://localhost:2785/api/sessions/my-bot/start \
    -H "X-API-Key: YOUR_API_KEY"
  ```
- **Get QR Code Data URL (Base64) for Scanning:**
  ```bash
  curl -H "X-API-Key: YOUR_API_KEY" \
    http://localhost:2785/api/sessions/my-bot/qr
  ```
- **Check Specific Session Health Status:**
  ```bash
  curl -H "X-API-Key: YOUR_API_KEY" \
    http://localhost:2785/api/sessions/my-bot/health
  ```

### Sending Messages

- **Send Text Message:**

  ```bash
  curl -X POST http://localhost:2785/api/sessions/my-bot/messages/send-text \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_API_KEY" \
    -d '{
      "chatId": "1234567890@c.us",
      "text": "Hello from OpenWA Command Line!"
    }'
  ```

- **Configure Webhook:**
  ```bash
  curl -X POST http://localhost:2785/api/sessions/my-bot/webhooks \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_API_KEY" \
    -d '{
      "url": "https://your-server.com/webhook-receiver",
      "events": ["message.received", "session.status"],
      "secret": "your-hmac-secret-signature"
    }'
  ```
