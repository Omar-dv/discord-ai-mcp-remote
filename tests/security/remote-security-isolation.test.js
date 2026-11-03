/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DiscordRemoteMcpApplication } from '../../src/core/application.js';
import { AUTH_SCOPES, ERROR_CODES } from '../../src/core/constants.js';
import { createMockDiscordClient, TEST_IDS } from '../fixtures/mock-discord.js';

describe('Remote MCP Security Enforcement, Isolation, & Destructive Confirmation', () => {
  let app;
  let baseUrl;
  let adminKey;
  let readOnlyKey;
  let restrictedGuildKey;

  beforeAll(async () => {
    app = new DiscordRemoteMcpApplication({
      env: {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: '0',
        MCP_PATH: '/mcp',
        PUBLIC_BASE_URL: 'http://127.0.0.1:3000',
        DISCORD_TOKEN: 'mock_token_value',
        DATABASE_PATH: ':memory:',
        AUTH_MODE: 'api_key',
        ALLOWED_ORIGINS: 'localhost,127.0.0.1,https://trusted.example.com',
        ALLOWED_HOSTS: 'localhost,127.0.0.1',
        MAX_REQUEST_SIZE: '4096',
        SESSION_MODE: 'stateful',
        REQUIRE_CONFIRMATION_FOR_DESTRUCTIVE: 'true',
        LOG_LEVEL: 'silent'
      },
      requireToken: false,
      customClient: createMockDiscordClient()
    });

    const started = await app.start({ connectDiscord: true, listenHttp: true });
    baseUrl = started.address;

    adminKey = app.apiKeyManager.createApiKey({
      identityId: 'admin_user',
      label: 'Admin Full Key',
      scopes: [AUTH_SCOPES.ADMIN]
    });

    readOnlyKey = app.apiKeyManager.createApiKey({
      identityId: 'readonly_user',
      label: 'Read-Only Key',
      scopes: [AUTH_SCOPES.READ, AUTH_SCOPES.CHANNELS_READ]
    });

    restrictedGuildKey = app.apiKeyManager.createApiKey({
      identityId: 'tenant_user_b',
      label: 'Restricted Guild Key',
      scopes: [AUTH_SCOPES.READ, AUTH_SCOPES.CHANNELS_READ],
      allowedGuildIds: ['999999999999999999']
    });
  });

  afterAll(async () => {
    if (app) {
      await app.shutdown();
    }
  });

  async function initSession(plaintextKey) {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${plaintextKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'security-test', version: '1.0.0' }
        }
      })
    });
    return res.headers.get('mcp-session-id');
  }

  it('rejects unauthenticated requests with 401 and WWW-Authenticate header', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('Bearer');
  });

  it('rejects untrusted Origin headers with 403 and supports valid CORS preflight', async () => {
    const badOriginRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminKey.plaintextKey}`,
        Origin: 'https://evil-attacker.example.org',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    expect(badOriginRes.status).toBe(403);
    const badBody = await badOriginRes.json();
    expect(badBody.error.data.errorCode).toBe(ERROR_CODES.INVALID_ORIGIN);

    const preflightRes = await fetch(`${baseUrl}/mcp`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://trusted.example.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    expect(preflightRes.status).toBe(204);
    expect(preflightRes.headers.get('access-control-allow-origin')).toBe(
      'https://trusted.example.com'
    );
  });

  it('rejects untrusted Host headers with 403', async () => {
    const badHostRes = await app.httpServer.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        host: 'dns-rebind-attack.com',
        authorization: `Bearer ${adminKey.plaintextKey}`,
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    expect(badHostRes.statusCode).toBe(403);
    const body = JSON.parse(badHostRes.payload);
    expect(body.error.data.errorCode).toBe(ERROR_CODES.INVALID_HOST);
  });

  it('rejects oversized request bodies with 413 Payload Too Large', async () => {
    const largeString = 'x'.repeat(8192);
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminKey.plaintextKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'send_message', arguments: { content: largeString } }
      })
    });
    expect(res.status).toBe(413);
  });

  it('prevents cross-user stateful session hijacking with 403 FORBIDDEN', async () => {
    const adminSessionId = await initSession(adminKey.plaintextKey);
    expect(adminSessionId).toBeTruthy();

    const hijackRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${readOnlyKey.plaintextKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': adminSessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    expect(hijackRes.status).toBe(403);
    const hijackBody = await hijackRes.json();
    expect(hijackBody.error.message).toMatch(/Cross-user session access is strictly prohibited/);
  });

  it('blocks read-only credentials from executing write or destructive tools (INSUFFICIENT_SCOPE)', async () => {
    const roSessionId = await initSession(readOnlyKey.plaintextKey);

    const writeAttempt = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${readOnlyKey.plaintextKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': roSessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'create_channel',
          arguments: {
            guildId: TEST_IDS.GUILD_ID,
            name: 'unauthorized-channel'
          }
        }
      })
    });

    expect(writeAttempt.status).toBe(200);
    const writeJson = await writeAttempt.json();
    expect(writeJson.result.isError).toBe(true);
    const toolResult = JSON.parse(writeJson.result.content[0].text);
    expect(toolResult.error.code).toBe(ERROR_CODES.INSUFFICIENT_SCOPE);
  });

  it('enforces guild-level isolation (GUILD_ACCESS_DENIED) and destructive confirmation tokens', async () => {
    const restrictedSessionId = await initSession(restrictedGuildKey.plaintextKey);

    const guildAttempt = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${restrictedGuildKey.plaintextKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': restrictedSessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'get_guild_info',
          arguments: {
            guildId: TEST_IDS.GUILD_ID
          }
        }
      })
    });

    const guildJson = await guildAttempt.json();
    expect(guildJson.result.isError).toBe(true);
    const guildResult = JSON.parse(guildJson.result.content[0].text);
    expect(guildResult.error.code).toBe(ERROR_CODES.GUILD_ACCESS_DENIED);

    const adminSessionId = await initSession(adminKey.plaintextKey);

    const unconfirmedDelete = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminKey.plaintextKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': adminSessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'kick_member',
          arguments: {
            guildId: TEST_IDS.GUILD_ID,
            userId: TEST_IDS.MEMBER_USER_ID,
            reason: 'Security test kick'
          }
        }
      })
    });

    const unconfirmedJson = await unconfirmedDelete.json();
    expect(unconfirmedJson.result.isError).toBe(true);
    const unconfirmedPayload = JSON.parse(unconfirmedJson.result.content[0].text);
    expect(unconfirmedPayload.error.code).toBe(ERROR_CODES.CONFIRMATION_REQUIRED);
    const confirmationToken = unconfirmedPayload.error.details.confirmationToken;
    expect(confirmationToken).toBeTruthy();

    const confirmedDelete = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminKey.plaintextKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': adminSessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'kick_member',
          arguments: {
            guildId: TEST_IDS.GUILD_ID,
            userId: TEST_IDS.MEMBER_USER_ID,
            reason: 'Security test kick',
            confirm: true,
            confirmationToken
          }
        }
      })
    });

    const confirmedJson = await confirmedDelete.json();
    expect(confirmedJson.result.isError).toBeFalsy();
    const confirmedPayload = JSON.parse(confirmedJson.result.content[0].text);
    expect(confirmedPayload.ok).toBe(true);
  });
});

