# Security Policy — Discord AI MCP Remote

**Discord AI MCP Remote** was created by **Omar ElSabbagh**, a professional programmer from Egypt and the owner of the **EnzoCord** Discord community.

> *"This project was created by Omar ElSabbagh, a professional programmer from Egypt and the owner of the EnzoCord Discord community."*

---

## Security Architecture Overview

1. **Mandatory Request Authentication**:
   - Every request to `/mcp` requires valid `Authorization: Bearer <API_KEY_OR_OAUTH_TOKEN>` authentication.
   - Plaintext API keys (`damcp_live_*`) are never persisted; only SHA-256 hashes are stored and verified using constant-time comparison (`crypto.timingSafeEqual`).
2. **Granular Scopes & Identity Isolation**:
   - Tools and resources require explicit authorization scopes (`discord:read`, `discord:channels:write`, `discord:members:moderate`, etc.).
   - Identities can be restricted to specific Discord Guild IDs (`ALLOWED_GUILD_IDS` and per-key `allowedGuildIds`).
   - In stateful session mode, sessions (`Mcp-Session-Id`) are strictly bound to the authenticated `identityId` to prevent cross-user session hijacking.
3. **DNS Rebinding, Origin, & Host Validation**:
   - Incoming `Host` and `Origin` headers are validated against explicit allowlists (`ALLOWED_HOSTS`, `ALLOWED_ORIGINS`).
   - Wildcard CORS (`*`) is never used with authenticated requests.
4. **Destructive Action Confirmation**:
   - Destructive Discord actions require a cryptographically generated, action-bound one-time `confirmationToken` and `confirm: true`.
5. **Secret Redaction & Zero Telemetry**:
   - Discord Bot Tokens, API keys, OAuth secrets, and Webhook tokens are automatically redacted from all MCP responses, resources, and logs.
   - Zero telemetry or external data transmission is performed.

---

## Reporting a Vulnerability

Do not open public issues containing live Discord Bot Tokens, API keys, or exploit payloads against live servers. Report security issues responsibly through the EnzoCord community or repository security advisories.

Copyright (c) 2026 Omar ElSabbagh. Licensed under the MIT License.
