# Contributing to Discord AI MCP Remote

**Discord AI MCP Remote** was created by **Omar ElSabbagh**, a professional programmer from Egypt and the owner of the **EnzoCord** Discord community.

> *"This project was created by Omar ElSabbagh, a professional programmer from Egypt and the owner of the EnzoCord Discord community."*

---

## Development Standards

1. **Runtime & Stack**:
   - Node.js `>=20.0.0` with ES Modules (`"type": "module"`).
   - `@modelcontextprotocol/server` v2 Streamable HTTP transport (`POST /mcp`, `GET /mcp`, `DELETE /mcp`).
   - `fastify` v5 for HTTP routing and security middleware.
   - `discord.js` v14 and `zod` v4 (`import * as z from 'zod/v4'`).
2. **Transport Independence**:
   - Keep Discord domain managers (`src/discord/managers/`) independent of Fastify HTTP request/reply objects.
   - All MCP tools must declare granular authorization scopes and pass through `AuthorizationManager`, `PermissionService`, and `ConfirmationManager`.
3. **Code Hygiene**:
   - Every `.js` file must begin with the `Copyright (c) 2026 Omar ElSabbagh. Licensed under the MIT License.` header.
   - Do not include decorative comments, section banners, or redundant inline comments in `.js` files.
   - Never add comments to JSON files.
4. **Testing & Linting**:
   - Run `npm run lint` and `npm test` before submitting any pull request.

---

## License

By contributing to Discord AI MCP Remote, you agree that your contributions will be licensed under the MIT License.
Copyright (c) 2026 Omar ElSabbagh. Licensed under the MIT License.
