# MindOS Docker Deployment Guide

## Overview

MindOS Docker deployment uses a single Dockerfile with two-stage architecture. Configuration is managed via `config.json`:

- **Builder stage**: Full build environment and compiled artifacts. Manually rebuild only when source code or dependencies change (~10 minutes).
- **Runtime stage**: Lightweight file copy. BuildKit automatically reuses Builder cache, completing in seconds.
- **Configuration**: Create `config.json` from `config.example.json` template and mount into container.

## Requirements

| Item | Minimum |
|------|---------|
| Docker | 20.10+ (BuildKit support required) |
| Docker Compose | v2 |
| Memory | 16GB (Next.js compilation requires ~8GB) |
| Disk | 20GB |

## Quick Start

### 1. Create Config File

```bash
cp config.example.json config.json
# Edit config.json — fill in at least apiKey and baseUrl under ai.providers
```

### 2. Mount Config

Edit `docker-compose.yml`, find the volumes section, uncomment the config.json mount line:

```yaml
volumes:
  - ./data:/data/mind
  # Uncomment the line below:
  - ./config.json:/root/.mindos/config.json:ro
```

### 3. Environment Variables (Optional)

```bash
cp .env.example .env
# .env only contains version and log settings — AI config is in config.json
```

### 4. First Build (Builder Cache)

**First deployment or after code changes (~10 minutes):**

1. Uncomment the `builder` service in `docker-compose.yml` (remove `#`)
2. Build:
```bash
docker compose build builder
```
3. **Comment it back** (add `#` again)

### 5. Start Services

```bash
docker compose up -d --build
```

### 6. Access

- Web UI: `http://<server-ip>:3456`
- MCP: `http://<server-ip>:8781/mcp`

## Workflow

```
First time / code changes:
  Uncomment builder → docker compose build builder → Comment back
  (~10 min, full compilation)

Everyday startup:
  docker compose up -d --build
  (seconds, BuildKit reuses builder cache automatically)
```

## Configuration

### config.json (Core Configuration)

All business configuration (AI, auth, sync, etc.) is managed via `config.json`.

**Create**:
```bash
cp config.example.json config.json
# Edit config.json
```

**Mount** (in docker-compose.yml, uncomment):
```yaml
- ./config.json:/root/.mindos/config.json:ro
```

**After changing config**:
```bash
docker compose restart mindos
```

### config.json Key Fields

| Field | Description |
|-------|-------------|
| `mindRoot` | Knowledge base root directory |
| `port` / `mcpPort` | Web and MCP service ports |
| `logLevel` | Log level: trace / debug / info / warn / error / fatal |
| `authToken` | API authentication token (recommended) |
| `ai.activeProvider` | Active AI provider id |
| `ai.providers` | AI provider list (array, each with id/name/protocol/apiKey/model/baseUrl) |
| `allowNetworkAccess` | Allow LAN access |
| `sync` | Git sync configuration |
| `embedding` | Semantic search configuration |

See `config.example.json` for all fields and comments.

### .env (Optional)

Only non-business settings:

| Variable | Default | Description |
|----------|---------|-------------|
| MINDOS_VERSION | latest | Builder image version tag |
| LOG_LEVEL | info | Log level |
| PRETTY_LOGS | true | Colorized log output |

## Daily Operations

### View Logs

```bash
docker compose logs -f mindos
```

### Enter Container

```bash
docker compose exec mindos bash
# Use mindos CLI:
mindos status          # View runtime status
mindos config show     # View current config
mindos doctor          # Diagnose environment
```

### Change Config

```bash
# Edit config.json on host
vim config.json
# Restart to apply
docker compose restart mindos
```

### Stop / Update

```bash
# Stop
docker compose down

# Update
git pull
# Uncomment builder → rebuild cache
docker compose build builder
# Comment back
docker compose up -d --build
```

## Architecture

```
config.example.json  ──→  config.json (user edited) ──→  ~/.mindos/config.json (mounted)

Dockerfile (single file, two stages)
  ├── Stage 1: builder
  │     Node 22 + pnpm → install deps → tsc → Next.js → standalone → stage
  │
  └── Stage 2: runtime
        node:22-slim → COPY artifacts → config.example.json → entrypoint → mindos start
```

## FAQ

### Q: When to rebuild Builder cache?

Rebuild after source code changes, dependency updates (pnpm-lock.yaml), or Node.js upgrades. Daily restarts and config changes do NOT require rebuilding.

### Q: How to add multiple AI providers?

Edit `config.json`, add new provider to `ai.providers` array:

```json
{
  "ai": {
    "activeProvider": "openai",
    "providers": [
      { "id": "openai", "name": "OpenAI", "protocol": "openai", ... },
      { "id": "anthropic", "name": "Anthropic", "protocol": "anthropic", ... }
    ]
  }
}
```

Then `docker compose restart mindos`.

### Q: Build fails?

1. Ensure >= 16GB memory
2. Check network access to npm registry (defaults to mirrors.cloud.tencent.com)
3. Review build logs for specific failures

### Q: ARM64 support?

The Dockerfile adapts to host architecture automatically via BuildKit. Build directly on ARM64 devices.