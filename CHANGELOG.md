# Changelog — Discord AI MCP Remote

All notable changes to **Discord AI MCP Remote** are documented in this file.

> *"This project was created by Omar ElSabbagh, a professional programmer from Egypt and the owner of the EnzoCord Discord community."*

---

## [1.0.0] - 2026-11-03

### Added
- **Remote Streamable HTTP Transport (`POST /mcp`, `GET /mcp`, `DELETE /mcp`)** built on `@modelcontextprotocol/server` v2 and Fastify v5.
- **Stateless and Stateful Session Modes** with cryptographic session IDs, identity binding, cross-user session protection, and idle TTL expiration.
- **Authentication & Granular Authorization System**:
  - High-entropy API key generation (`npm run auth:generate-key`), SHA-256 hashed storage, constant-time verification, rotation, and revocation.
  - 16 granular authorization scopes (`discord:read`, `discord:messages:write`, `discord:members:moderate`, etc.) and guild-level isolation (`ALLOWED_GUILD_IDS`).
  - Optional OAuth 2.1 Resource Server integration (`/.well-known/oauth-protected-resource` RFC 9728, `/.well-known/oauth-authorization-server` RFC 8414, PKCE S256).
- **Network & HTTP Security Hardening**:
  - `OriginValidator` and `HostValidator` for DNS rebinding protection.
  - Strict CORS manager, HTTP security headers, request body size limits (`413`), concurrency limits, and multi-tier rate limiting.
- **Complete Discord Management Suite**:
  - 182 MCP Tools across 18 domains, 20 MCP Resources (8 static + 12 dynamic `ResourceTemplate` URIs), and 17 MCP Prompts reused from the Local Edition.
- **Deployment & Operations**:
  - `GET /healthz` health check endpoint, `npm run diagnostics`, `npm run setup`, and `npm run db:backup`.
  - Production `Dockerfile`, `docker-compose.yml`, Nginx config, Caddyfile, and Cloudflare Tunnel guide.

Copyright (c) 2026 Omar ElSabbagh. Licensed under the MIT License.
