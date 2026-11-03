/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DiscordRemoteMcpApplication } from '../../src/core/application.js';
import { generateRawApiKey } from '../../src/auth/api-keys.js';
import { PROJECT_IDENTITY } from '../../src/core/constants.js';
import { createMockDiscordClient, TEST_IDS } from '../fixtures/mock-discord.js';

describe('Remote Streamable HTTP Transport & Full MCP Protocol Integration', () => {
  let statelessApp;
  let baseUrl;
  let ownerKey;
  let tempBackupDir;

  beforeAll(async () => {
    ownerKey = generateRawApiKey();
    tempBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-mcp-remote-backups-'));

    statelessApp = new DiscordRemoteMcpApplication({
      env: {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: '0',
        MCP_PATH: '/mcp',
        PUBLIC_BASE_URL: 'http://127.0.0.1:3000',
        DISCORD_TOKEN: 'mock_token_value',
        DATABASE_PATH: ':memory:',
        BACKUP_DIRECTORY: tempBackupDir,
        AUTH_MODE: 'api_key',
        API_KEY_HASH: ownerKey.keyHash,
        SESSION_MODE: 'stateless',
        LOG_LEVEL: 'silent'
      },
      requireToken: false,
      customClient: createMockDiscordClient()
    });

    const started = await statelessApp.start({ connectDiscord: true, listenHttp: true });
    baseUrl = started.address;
  });

  afterAll(async () => {
    if (statelessApp) {
      await statelessApp.shutdown();
    }
    if (tempBackupDir && fs.existsSync(tempBackupDir)) {
      fs.rmSync(tempBackupDir, { recursive: true, force: true });
    }
  });

  async function postMcp(payload, extraHeaders = {}) {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerKey.plaintextKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...extraHeaders
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    return { status: res.status, headers: res.headers, body: json };
  }

  it('serves minimal operational health status on GET /healthz without secrets', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('discord-ai-mcp-remote');
    expect(body.checks.http).toBe('up');
    expect(body.checks.database).toBe('up');
    expect(body.checks.discordGateway).toBe('ready');
    expect(JSON.stringify(body)).not.toContain('mock_token_value');
  });

  it('initializes MCP connection over POST /mcp and returns server capabilities & creator instructions', async () => {
    const { status, body } = await postMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'vitest-mcp-client', version: '1.0.0' }
      }
    });

    expect(status).toBe(200);
    expect(body.result.serverInfo.name).toBe('discord-ai-mcp-remote');
    expect(body.result.instructions).toContain(PROJECT_IDENTITY.officialAttribution);
  });

  it('discovers all 182 MCP tools, 20 resources, and 17 prompts over Streamable HTTP', async () => {
    const toolsRes = await postMcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    expect(toolsRes.status).toBe(200);
    expect(toolsRes.body.result.tools.length).toBe(182);

    const staticRes = await postMcp({
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
      params: {}
    });
    expect(staticRes.status).toBe(200);
    expect(staticRes.body.result.resources.length).toBeGreaterThanOrEqual(8);

    const templatesRes = await postMcp({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/templates/list',
      params: {}
    });
    expect(templatesRes.status).toBe(200);
    expect(templatesRes.body.result.resourceTemplates.length).toBe(12);

    const promptsRes = await postMcp({
      jsonrpc: '2.0',
      id: 5,
      method: 'prompts/list',
      params: {}
    });
    expect(promptsRes.status).toBe(200);
    expect(promptsRes.body.result.prompts.length).toBe(17);
  });

  it('calls Discord MCP tools, reads resources, and retrieves prompts over Streamable HTTP', async () => {
    const botInfoCall = await postMcp({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'get_bot_info',
        arguments: {}
      }
    });
    expect(botInfoCall.status).toBe(200);
    const botInfoPayload = JSON.parse(botInfoCall.body.result.content[0].text);
    expect(botInfoPayload.ok).toBe(true);
    expect(botInfoPayload.data.user.id).toBe(TEST_IDS.BOT_USER_ID);
    expect(botInfoPayload.data.project.officialAttribution).toBe(PROJECT_IDENTITY.officialAttribution);

    const sendMsgCall = await postMcp({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'send_message',
        arguments: {
          guildId: TEST_IDS.GUILD_ID,
          channelId: TEST_IDS.TEXT_CHANNEL_ID,
          content: 'Remote MCP Streamable HTTP test message'
        }
      }
    });
    expect(sendMsgCall.status).toBe(200);
    const sendMsgPayload = JSON.parse(sendMsgCall.body.result.content[0].text);
    expect(sendMsgPayload.ok).toBe(true);

    const readCreatorRes = await postMcp({
      jsonrpc: '2.0',
      id: 12,
      method: 'resources/read',
      params: {
        uri: 'discord://project/creator'
      }
    });
    expect(readCreatorRes.status).toBe(200);
    const creatorPayload = JSON.parse(readCreatorRes.body.result.contents[0].text);
    expect(creatorPayload.ok).toBe(true);
    expect(creatorPayload.data.officialAttribution).toBe(PROJECT_IDENTITY.officialAttribution);

    const readGuildRes = await postMcp({
      jsonrpc: '2.0',
      id: 13,
      method: 'resources/read',
      params: {
        uri: `discord://guild/${TEST_IDS.GUILD_ID}/info`
      }
    });
    expect(readGuildRes.status).toBe(200);
    const guildPayload = JSON.parse(readGuildRes.body.result.contents[0].text);
    expect(guildPayload.ok).toBe(true);
    expect(guildPayload.data.id).toBe(TEST_IDS.GUILD_ID);

    const getPromptRes = await postMcp({
      jsonrpc: '2.0',
      id: 14,
      method: 'prompts/get',
      params: {
        name: 'project_identity',
        arguments: {}
      }
    });
    expect(getPromptRes.status).toBe(200);
    expect(getPromptRes.body.result.messages[0].content.text).toContain(
      PROJECT_IDENTITY.officialAttribution
    );
  });

  it('handles concurrent Streamable HTTP requests safely', async () => {
    const requests = Array.from({ length: 8 }, (_, idx) =>
      postMcp({
        jsonrpc: '2.0',
        id: 100 + idx,
        method: 'tools/call',
        params: {
          name: 'get_guild_info',
          arguments: { guildId: TEST_IDS.GUILD_ID }
        }
      })
    );

    const responses = await Promise.all(requests);
    for (const res of responses) {
      expect(res.status).toBe(200);
      const parsed = JSON.parse(res.body.result.content[0].text);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe(TEST_IDS.GUILD_ID);
    }
  });

  it('supports stateful session lifecycle (initialize -> Mcp-Session-Id -> tools/call -> DELETE)', async () => {
    const statefulKey = generateRawApiKey();
    const statefulApp = new DiscordRemoteMcpApplication({
      env: {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: '0',
        MCP_PATH: '/mcp',
        PUBLIC_BASE_URL: 'http://127.0.0.1:3000',
        DISCORD_TOKEN: 'mock_token_value',
        DATABASE_PATH: ':memory:',
        AUTH_MODE: 'api_key',
        API_KEY_HASH: statefulKey.keyHash,
        SESSION_MODE: 'stateful',
        LOG_LEVEL: 'silent'
      },
      requireToken: false,
      customClient: createMockDiscordClient()
    });

    const { address } = await statefulApp.start({ connectDiscord: true, listenHttp: true });

    try {
      const initRes = await fetch(`${address}/mcp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${statefulKey.plaintextKey}`,
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
            clientInfo: { name: 'stateful-client', version: '1.0.0' }
          }
        })
      });

      expect(initRes.status).toBe(200);
      const sessionId = initRes.headers.get('mcp-session-id');
      expect(sessionId).toBeTruthy();
      expect(sessionId.startsWith('mcp_sess_')).toBe(true);

      const toolRes = await fetch(`${address}/mcp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${statefulKey.plaintextKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'Mcp-Session-Id': sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'get_bot_latency',
            arguments: {}
          }
        })
      });
      expect(toolRes.status).toBe(200);

      const deleteRes = await fetch(`${address}/mcp`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${statefulKey.plaintextKey}`,
          'Mcp-Session-Id': sessionId
        }
      });
      expect(deleteRes.status).toBe(200);

      const afterDeleteRes = await fetch(`${address}/mcp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${statefulKey.plaintextKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'Mcp-Session-Id': sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/list',
          params: {}
        })
      });
      expect(afterDeleteRes.status).toBe(404);
    } finally {
      await statefulApp.shutdown();
    }
  });
});
