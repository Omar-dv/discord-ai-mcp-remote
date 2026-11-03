# Discord AI MCP Remote

**Complete Self-Hosted Remote Streamable HTTP Model Context Protocol (MCP) Platform for Discord Management**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./package.json)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-v2.4.0-purple.svg)](https://ts.sdk.modelcontextprotocol.io/v2/)
[![Transport](https://img.shields.io/badge/transport-Streamable_HTTP-00b894.svg)](https://modelcontextprotocol.io/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14.28.0-5865F2.svg)](https://discord.js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Official Creator & Project Attribution

> **"This project was created by Omar ElSabbagh, a professional programmer from Egypt and the owner of the EnzoCord Discord community."**

| Attribute | Value |
| :--- | :--- |
| **Project Name** | Discord AI MCP Remote |
| **Edition** | Remote Edition (Second Edition — Streamable HTTP) |
| **Creator & Owner** | **Omar ElSabbagh** |
| **Country** | Egypt |
| **Role** | Project Creator, Owner, and Professional Programmer |
| **Discord Community** | **EnzoCord** |
| **License** | MIT License |

---

## Project Overview

**Discord AI MCP Remote** is the second edition of the **Discord AI MCP** platform. While the first edition operates exclusively over local `STDIO` pipes on a desktop machine, **Discord AI MCP Remote** exposes the complete Discord management engine over the official **MCP Streamable HTTP transport (`POST /mcp`, `GET /mcp`, `DELETE /mcp`)** powered by `@modelcontextprotocol/server` v2 and **Fastify v5**.

It allows developers, server owners, and organizations to self-host their own dedicated MCP endpoint (for example, `https://mcp.example.com/mcp`) on a VPS, dedicated server, Docker host, or behind Cloudflare Tunnel, and connect remote-capable AI assistants to administer their Discord servers and bots through natural language.

### Strict Independence & Zero-Telemetry Guarantee
- **100% Self-Hosted & Independent**: No centralized backend, no creator-owned API, no external account registration, and no mandatory subscription.
- **Zero Telemetry**: Your Discord Bot Token, API keys, and server data remain strictly on your own host and are never transmitted to any third party.

---

## Key Features

- **182 Production-Grade MCP Tools** across 18 Discord administration domains.
- **20 Contextual MCP Resources** (`8` static + `12` dynamic `ResourceTemplate` URIs).
- **17 Workflow MCP Prompts** for server audits, security reviews, moderation, and setup.
- **Official MCP Streamable HTTP Transport**:
  - Configurable **Stateless** (default) and **Stateful** (`Mcp-Session-Id`) session modes.
  - Supports `POST /mcp`, `GET /mcp` (SSE stream), and `DELETE /mcp` (session termination).
- **Multi-Layered Security Architecture**:
  - **API Key Authentication**: High-entropy keys (`damcp_live_*`), SHA-256 hashed persistence, constant-time comparison (`crypto.timingSafeEqual`), key rotation, and revocation.
  - **16 Granular Authorization Scopes**: Enforce least privilege per API key or OAuth token (`discord:read`, `discord:channels:write`, `discord:members:moderate`, etc.).
  - **Optional OAuth 2.1 Resource Server**: RFC 9728 Protected Resource Metadata (`/.well-known/oauth-protected-resource`), RFC 8414 Authorization Server Metadata (`/.well-known/oauth-authorization-server`), PKCE `S256`, and audience validation.
  - **Identity & Guild Isolation**: Restrict keys/identities to specific Discord guild IDs (`ALLOWED_GUILD_IDS`) and isolate stateful sessions per identity.
  - **DNS Rebinding, Origin, & Host Validation**: Explicit allowlists for `Host` and `Origin` headers.
  - **Two-Step Destructive Confirmation**: Cryptographic one-time `confirmationToken` required before deleting channels, roles, messages, or kicking/banning members.
- **Complete Deployment Suite**: Ready-to-use `Dockerfile`, `docker-compose.yml`, Nginx configuration, Caddyfile, and Cloudflare Tunnel guide.

---

## Architecture Diagram

```mermaid
flowchart TD
    Client["AI Client / MCP Connector\n(Claude, ChatGPT, Cursor, VS Code, Bridge)"]
    Proxy["Reverse Proxy / TLS Termination\n(Nginx / Caddy / Cloudflare Tunnel)"]
    Fastify["Fastify HTTP Server\n(/mcp, /healthz, /.well-known/*)"]
    SecGate["Security Pre-Handler\n(HostValidator, OriginValidator, CORS, Body Limits, RateLimiter)"]
    Auth["Authentication & Authorization Layer\n(API Key SHA-256 / OAuth 2.1, Scopes, Guild Isolation)"]
    Transport["StreamableHttpTransportManager\n(Stateless Per-Request / Stateful SessionManager)"]
    MCP["DiscordMcpServer (@modelcontextprotocol/server v2)\n182 Tools | 20 Resources | 17 Prompts"]
    Confirm["ConfirmationManager & PermissionService\n(Two-Step Token + Discord Role Hierarchy)"]
    Managers["13 Discord Domain Managers\n(Bot, Guild, Channel, Voice, Role, Member, Moderation, Message, Thread, Emoji, Sticker, Invite, Webhook, Event, AutoMod, Command)"]
    Discord["Discord.js v14 Client\n(Discord Gateway + REST API)"]
    SQLite[("SQLite Database (WAL)\nAPI Keys, Sessions, Moderation Cases, Audit Logs")]

    Client -->|"HTTPS + Bearer Token"| Proxy
    Proxy --> Fastify
    Fastify --> SecGate
    SecGate --> Auth
    Auth --> Transport
    Transport --> MCP
    MCP --> Confirm
    Confirm --> Managers
    Managers --> Discord
    Auth --> SQLite
    Transport --> SQLite
    Managers --> SQLite
```

---

## Local Edition vs. Remote Edition Comparison

| Feature / Capability | Local Edition (`discord-ai-mcp`) | Remote Edition (`discord-ai-mcp-remote`) |
| :--- | :--- | :--- |
| **Primary Transport** | Local `STDIO` (`stdin` / `stdout`) | **Remote Streamable HTTP (`POST /mcp`, `GET /mcp`, `DELETE /mcp`)** |
| **Target Environment** | Local desktop machine | VPS, Cloud Server, Dedicated Server, Home Server, Docker |
| **Endpoint Format** | Local process command (`node src/index.js`) | Public or private URL (`https://mcp.example.com/mcp`) |
| **Authentication** | OS process isolation | Mandatory `Authorization: Bearer <API_KEY>` or **OAuth 2.1** |
| **Authorization Scopes** | Full local bot access | **16 Granular Scopes** (`discord:read`, `discord:channels:write`, etc.) |
| **Multi-User & Guild Isolation** | Single local user | Per-identity scopes, guild allowlists, and isolated sessions |
| **DNS Rebinding / Origin Protection** | N/A (`STDIO`) | `HostValidator`, `OriginValidator`, strict CORS, security headers |
| **Health & Discovery Endpoints** | CLI diagnostics only | `GET /healthz` + RFC 9728 / RFC 8414 `.well-known` endpoints |
| **Discord Tools / Resources / Prompts** | 182 Tools / 20 Resources / 17 Prompts | **182 Tools / 20 Resources / 17 Prompts (100% Parity)** |

---

## Complete MCP Tools Catalog (182 Tools)

Every tool validates inputs with **Zod v4**, checks the caller's **Authorization Scopes** and **Allowed Guild IDs**, verifies **Discord Bot Permissions** and **Role Hierarchy**, and requires a **Confirmation Token** when marked destructive.

| Domain | Count | Required Scopes (Read / Write) | Tools |
| :--- | :---: | :--- | :--- |
| **A. Bot Management** | 12 | `discord:read` / `discord:bot:manage` | `get_bot_info`, `get_bot_status`, `get_bot_application`, `get_bot_guilds`, `get_bot_permissions`, `get_bot_latency`, `get_bot_uptime`, `get_bot_version`, `get_bot_configuration`, `get_bot_statistics`, `get_bot_gateway_status`, `get_bot_invite_url` |
| **B. Guild Management** | 18 | `discord:read` / `discord:guild:manage` | `list_guilds`, `get_guild_info`, `get_guild_preview`, `get_guild_settings`, `get_guild_features`, `get_guild_owner`, `get_guild_members_count`, `get_guild_channels`, `get_guild_roles`, `get_guild_emojis`, `get_guild_stickers`, `get_guild_invites`, `get_guild_audit_logs`, `get_guild_bans`, `get_guild_integrations`, `get_guild_webhooks`, `get_guild_events`, `get_guild_automod_rules` |
| **C. Channel Management** | 19 | `discord:channels:read` / `discord:channels:write` | `create_channel`, `delete_channel`, `edit_channel`, `get_channel_info`, `list_channels`, `clone_channel`, `move_channel`, `set_channel_position`, `set_channel_topic`, `set_channel_name`, `set_channel_slowmode`, `set_channel_nsfw`, `set_channel_permissions`, `get_channel_permissions`, `add_channel_permission`, `edit_channel_permission`, `remove_channel_permission`, `create_category`, `get_category_channels` |
| **D. Voice Management** | 9 | `discord:channels:read` / `discord:channels:write`, `discord:members:moderate` | `get_voice_channels`, `get_voice_channel_members`, `get_member_voice_state`, `move_member_to_voice_channel`, `disconnect_member_from_voice`, `edit_voice_channel`, `set_voice_channel_status`, `set_voice_channel_user_limit`, `set_voice_channel_bitrate` |
| **E. Role Management** | 15 | `discord:roles:read` / `discord:roles:write` | `create_role`, `delete_role`, `edit_role`, `get_role_info`, `list_roles`, `assign_role`, `remove_role`, `get_member_roles`, `set_role_permissions`, `compare_role_permissions`, `set_role_position`, `set_role_color`, `set_role_hoist`, `set_role_mentionable`, `get_role_members` |
| **F. Member Management** | 19 | `discord:members:read` / `discord:members:moderate` | `get_member_info`, `get_member_profile`, `list_guild_members`, `search_guild_members`, `get_member_permissions`, `get_member_roles`, `get_member_voice_state`, `assign_role_to_member`, `remove_role_from_member`, `edit_member_nickname`, `reset_member_nickname`, `edit_member_timeout`, `remove_member_timeout`, `kick_member`, `ban_member`, `unban_member`, `get_member_avatar`, `get_member_join_date`, `get_member_presence` |
| **G. Moderation** | 10 | `discord:members:read` / `discord:members:moderate` | `timeout_member`, `remove_timeout`, `get_ban_list`, `get_audit_logs`, `create_moderation_case`, `get_moderation_case`, `get_moderation_history`, `bulk_delete_messages`, `warn_member`, `clear_user_messages` |
| **H. Message Management** | 15 | `discord:messages:read` / `discord:messages:write` | `send_message`, `send_embed`, `edit_message`, `delete_message`, `get_message`, `get_channel_messages`, `search_messages`, `pin_message`, `unpin_message`, `add_reaction`, `remove_reaction`, `get_message_reactions`, `crosspost_message`, `create_message_thread`, `reply_to_message` |
| **I. Thread Management** | 13 | `discord:channels:read` / `discord:channels:write` | `create_thread`, `delete_thread`, `archive_thread`, `unarchive_thread`, `lock_thread`, `unlock_thread`, `join_thread`, `leave_thread`, `add_thread_member`, `remove_thread_member`, `get_thread_info`, `list_active_threads`, `list_archived_threads` |
| **J. Emoji Management** | 5 | `discord:read` / `discord:guild:manage` | `create_emoji`, `delete_emoji`, `edit_emoji`, `get_emoji_info`, `list_emojis` |
| **K. Sticker Management** | 4 | `discord:read` / `discord:guild:manage` | `create_sticker`, `delete_sticker`, `get_sticker_info`, `list_stickers` |
| **L. Invite Management** | 5 | `discord:channels:read` / `discord:channels:write` | `create_invite`, `delete_invite`, `get_invite_info`, `list_guild_invites`, `list_channel_invites` |
| **M. Webhook Management** | 6 | `discord:webhooks:manage` | `create_webhook`, `delete_webhook`, `edit_webhook`, `get_webhook_info`, `list_webhooks`, `execute_webhook` |
| **N. Scheduled Events** | 6 | `discord:read` / `discord:guild:manage` | `create_scheduled_event`, `edit_scheduled_event`, `delete_scheduled_event`, `get_scheduled_event`, `list_scheduled_events`, `get_scheduled_event_users` |
| **O. Auto Moderation** | 5 | `discord:automod:manage` | `list_automod_rules`, `get_automod_rule`, `create_automod_rule`, `edit_automod_rule`, `delete_automod_rule` |
| **P. Audit Logs** | 6 | `discord:members:moderate` | `get_audit_log_entry`, `get_recent_moderation_actions`, `get_recent_channel_changes`, `get_recent_role_changes`, `get_recent_member_actions`, `get_local_mcp_audit_history` |
| **Q. Diagnostics & Utilities** | 9 | `discord:read` | `get_server_statistics`, `get_server_activity_summary`, `get_server_structure`, `get_server_permission_overview`, `get_server_security_overview`, `get_server_configuration_report`, `check_bot_permissions`, `check_bot_hierarchy`, `diagnose_server_configuration` |
| **R. Backup & App Commands** | 10 | `discord:backup:read`, `discord:backup:write`, `discord:bot:manage` | `export_guild_backup`, `export_roles_backup`, `export_channels_backup`, `validate_backup_manifest`, `list_application_commands`, `get_application_command`, `create_application_command`, `edit_application_command`, `delete_application_command`, `list_guild_application_commands` |

---

## MCP Resources Catalog (20 Resources)

### Static Resources (8)
- `discord://project/info` — Project metadata, edition, transport, and creator attribution.
- `discord://project/creator` — Official creator attribution for Omar ElSabbagh (Egypt, EnzoCord).
- `discord://project/version` — Project, Node.js, and Discord.js versions.
- `discord://bot/info` — Connected bot user and application metadata.
- `discord://bot/status` — Gateway connection status, latency, and uptime.
- `discord://bot/permissions` — Bot permissions across authorized guilds.
- `discord://bot/guilds` — Connected guilds filtered by the caller's guild allowlist.
- `discord://guilds` — Accessible Discord guilds summary.

### Dynamic Guild Resource Templates (12)
- `discord://guild/{guildId}/info`
- `discord://guild/{guildId}/channels`
- `discord://guild/{guildId}/roles`
- `discord://guild/{guildId}/members`
- `discord://guild/{guildId}/emojis`
- `discord://guild/{guildId}/stickers`
- `discord://guild/{guildId}/events`
- `discord://guild/{guildId}/automod`
- `discord://guild/{guildId}/audit-logs`
- `discord://guild/{guildId}/statistics`
- `discord://guild/{guildId}/security`
- `discord://guild/{guildId}/structure`

---

## MCP Prompts Catalog (17 Prompts)

1. `project_identity` — Official creator attribution and project identity.
2. `server_audit` — Comprehensive operational and structural server audit.
3. `server_security_audit` — Security, MFA, verification level, and dangerous permission review.
4. `server_setup` — Guided setup blueprint for new Discord communities.
5. `server_cleanup` — Identify unused channels, redundant roles, and expired invites.
6. `server_optimization` — Engagement, onboarding, and AutoMod optimization plan.
7. `moderation_assistant` — Proportional moderation workflow with case tracking.
8. `moderation_review` — Audit recent moderation cases and audit log actions.
9. `role_management` — Role hierarchy design and least-privilege review.
10. `channel_management` — Category and channel architecture planning.
11. `permission_analysis` — Deep permission overwrite and bot hierarchy analysis.
12. `server_structure_analysis` — Visual and structural breakdown of categories/channels.
13. `bot_diagnostics` — Gateway, latency, intent, and permission health check.
14. `activity_report` — Server activity, member growth, and event summary.
15. `welcome_system_setup` — Onboarding, rules, and welcome channel setup guide.
16. `community_management` — Event scheduling, announcements, and forum management.
17. `discord_server_backup_guide` — Safe read-only server structure backup workflow.

---

## Prerequisites & Installation

### Prerequisites
- **Node.js** `>= 20.0.0` (Node.js 22 LTS recommended)
- **npm** `>= 10.0.0`
- A **Discord Bot Token** created in the [Discord Developer Portal](https://discord.com/developers/applications)

### Direct Node.js Installation

```bash
git clone https://github.com/Omar-dv/discord-ai-mcp-remote.git
cd discord-ai-mcp-remote
npm install
npm run setup
```

---

## Discord Developer Portal Configuration

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create or select your application.
2. Navigate to **Bot**:
   - Copy your **Bot Token** and set `DISCORD_TOKEN` in `.env`.
   - Enable **Privileged Gateway Intents** if you need member lists, presences, or message content:
     - **Server Members Intent** (`INTENT_GUILD_MEMBERS=true`)
     - **Presence Intent** (`INTENT_GUILD_PRESENCES=true`)
     - **Message Content Intent** (`INTENT_MESSAGE_CONTENT=true`)
3. Invite the bot to your server using OAuth2 URL Generator (`bot` + `applications.commands` scopes) or call `get_bot_invite_url`.

---

## Environment Variables Reference

Copy `.env.example` to `.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Runtime environment (`development`, `production`, `test`) |
| `HOST` | `127.0.0.1` | Bind address (`127.0.0.1` for reverse proxy; `0.0.0.0` inside Docker) |
| `PORT` | `3000` | HTTP listen port |
| `MCP_PATH` | `/mcp` | Primary Streamable HTTP MCP route path |
| `PUBLIC_BASE_URL` | `https://mcp.example.com` | Public URL used for Host/Origin allowlists and OAuth metadata |
| `DISCORD_TOKEN` | *(required)* | Your Discord Bot Token (kept strictly on your server) |
| `AUTH_MODE` | `api_key` | Authentication mode: `api_key`, `oauth`, or `hybrid` |
| `API_KEY_HASH` | *(optional)* | Optional SHA-256 hash of a static owner API key |
| `ALLOWED_ORIGINS` | `localhost,127.0.0.1,[::1]` | Comma-separated allowed `Origin` hostnames/URLs |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1]` | Comma-separated trusted `Host` header hostnames |
| `ALLOWED_GUILD_IDS` | *(empty = all)* | Optional comma-separated list of Discord Guild IDs the server may manage |
| `SESSION_MODE` | `stateless` | `stateless` (default) or `stateful` (`Mcp-Session-Id` lifecycle) |
| `SESSION_TTL` | `1800` | Idle session expiration in seconds (stateful mode) |
| `TRUST_PROXY` | `false` | Set `true` when behind Nginx, Caddy, or Cloudflare Tunnel |
| `MAX_REQUEST_SIZE` | `1048576` | Maximum JSON-RPC request body size in bytes (default 1 MiB) |
| `RATE_LIMIT_ENABLED` | `true` | Enable multi-tier rate limiting |
| `REQUIRE_CONFIRMATION_FOR_DESTRUCTIVE` | `true` | Require two-step confirmation token for destructive tools |

---

## Authentication Setup

### 1. Generate a High-Entropy API Key

Run the key generator command:

```bash
npm run auth:generate-key
```

This command:
- Generates a cryptographically secure key (`damcp_live_<id>_<random>`).
- Stores **only its SHA-256 hash** in `./data/database.sqlite` (and prints `API_KEY_HASH=...` if you also want it in `.env`).
- Prints the plaintext key **once**.

#### Custom Scopes, Multi-User Identities, & Guild Restrictions

```bash
# Generate a read-only key restricted to one Discord server:
node scripts/generate-api-key.js \
  --identity moderator_1 \
  --label "Read-Only Auditor" \
  --scopes "discord:read,discord:channels:read,discord:members:read" \
  --guilds "123456789012345678"
```

#### API Key Rotation

```bash
node scripts/generate-api-key.js --rotate <OLD_KEY_ID>
```

### 2. Optional OAuth 2.1 Resource Server Mode

To enable OAuth 2.1 alongside or instead of API keys:
1. Set `AUTH_MODE=hybrid` (or `AUTH_MODE=oauth`) in `.env`.
2. Configure `OAUTH_ISSUER_URL=https://your-auth-server.example.com` and `OAUTH_AUDIENCE=https://mcp.example.com/mcp`.
3. The server automatically exposes:
   - `GET /.well-known/oauth-protected-resource` (RFC 9728)
   - `GET /.well-known/oauth-authorization-server` (RFC 8414)

---

## Local Testing & Diagnostics

### Run Local Diagnostics
```bash
npm run diagnostics
```

### Start the Server
```bash
npm start
```

### Verify Health Endpoint (`GET /healthz`)
```bash
curl -s http://127.0.0.1:3000/healthz | jq .
```

### Test MCP Initialization over HTTP (`POST /mcp`)
```bash
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H "Authorization: Bearer YOUR_GENERATED_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }'
```

---

## Remote Production Deployment

### Option A: Docker Compose (Recommended)

1. Configure `.env` with your `DISCORD_TOKEN`, `PUBLIC_BASE_URL`, `ALLOWED_HOSTS`, and `ALLOWED_ORIGINS`.
2. Start the container:
```bash
docker compose up -d --build
```
3. Generate an API key inside the running container:
```bash
docker compose exec discord-ai-mcp-remote npm run auth:generate-key
```

### Option B: Caddy Reverse Proxy (Automatic HTTPS)

Copy `deploy/caddy/Caddyfile` to `/etc/caddy/Caddyfile`, replace `mcp.example.com` with your domain, set `TRUST_PROXY=true` in `.env`, and reload Caddy:
```bash
sudo systemctl reload caddy
```

### Option C: Nginx Reverse Proxy + Let's Encrypt

Copy `deploy/nginx/discord-ai-mcp.conf` to `/etc/nginx/sites-available/discord-ai-mcp.conf` (note `proxy_buffering off;` and `proxy_read_timeout 3600s;` for Streamable HTTP), provision TLS via Certbot, set `TRUST_PROXY=true` in `.env`, and reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Option D: Cloudflare Tunnel

Use `deploy/docker/cloudflared.example.yml` to expose `http://127.0.0.1:3000` to `https://mcp.example.com` without opening inbound firewall ports.
> **Important Security Rule**: Never disable MCP authentication (`Authorization: Bearer ...`) when using Cloudflare Tunnel.

---

## AI Platform Compatibility & Integration Guide

*(Compatibility verified as of **November 2026**)*

| AI Platform | Native Remote Streamable HTTP Support | Supported Auth | Configuration Method |
| :--- | :---: | :--- | :--- |
| **Claude Code CLI** | **Yes (Native)** | Bearer Header / OAuth | `claude mcp add --transport http` |
| **Cursor** | **Yes (Native)** | Bearer Header | `.cursor/mcp.json` (`url` + `headers`) |
| **VS Code (GitHub Copilot / MCP)** | **Yes (Native)** | Bearer Header | `.vscode/mcp.json` (`type: "http"`) |
| **Claude Desktop / Claude Web** | **Yes** | OAuth 2.1 / `mcp-remote` bridge | Custom Integrations or `npx mcp-remote` |
| **ChatGPT (Developer Mode / Actions)** | **Yes (via MCP Connector)** | OAuth 2.1 / Bearer Header | ChatGPT MCP Connectors settings |
| **Gemini / Kimi / DeepSeek** | **Via MCP Client / Bridge** | Bearer Header | Use an MCP-compatible host (Cursor, VS Code, LibreChat, OpenWebUI, or SDK client) |

### 1. Claude Code CLI
```bash
claude mcp add --transport http discord-ai-mcp-remote https://mcp.example.com/mcp \
  --header "Authorization: Bearer YOUR_API_KEY"
```

### 2. Cursor (`~/.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "discord-ai-mcp-remote": {
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### 3. VS Code (`.vscode/mcp.json`)
```json
{
  "servers": {
    "discord-ai-mcp-remote": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### 4. Claude Desktop (via `mcp-remote` Bridge with Bearer Header)
```json
{
  "mcpServers": {
    "discord-ai-mcp-remote": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.example.com/mcp",
        "--header",
        "Authorization: Bearer YOUR_API_KEY"
      ]
    }
  }
}
```

---

## Backup, Recovery, & Testing

### Database Backup
```bash
npm run db:backup
```
Creates a hot SQLite snapshot in `./data/backups/`.
> **SQLite Multi-Process Note**: SQLite in WAL mode is designed for single-instance deployments. Do not mount the same SQLite file across multiple horizontal container replicas simultaneously.

### Automated Tests & Code Quality
```bash
npm test
npm run lint
```

---

## License

Licensed under the **MIT License**. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) for details.

Copyright (c) 2026 **Omar ElSabbagh** (Egypt — Owner of the **EnzoCord** Discord community).
