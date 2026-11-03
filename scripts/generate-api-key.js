#!/usr/bin/env node
/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ConfigurationManager } from '../src/core/config.js';
import { ALL_AUTH_SCOPES, PROJECT_IDENTITY } from '../src/core/constants.js';
import { DatabaseManager } from '../src/database/database.js';
import { ApiKeyManager } from '../src/auth/api-keys.js';

function parseCliArgs(argv) {
  const options = {
    identityId: 'owner',
    label: 'default-owner-key',
    scopes: ALL_AUTH_SCOPES,
    allowedGuildIds: [],
    rotateKeyId: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--identity' && argv[i + 1]) {
      options.identityId = argv[i + 1];
      i += 1;
    } else if (arg === '--label' && argv[i + 1]) {
      options.label = argv[i + 1];
      i += 1;
    } else if (arg === '--scopes' && argv[i + 1]) {
      options.scopes = argv[i + 1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === '--guilds' && argv[i + 1]) {
      options.allowedGuildIds = argv[i + 1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === '--rotate' && argv[i + 1]) {
      options.rotateKeyId = argv[i + 1].trim();
      i += 1;
    }
  }

  return options;
}

function runGenerateKey() {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  const configManager = new ConfigurationManager(process.env, { requireToken: false });
  const config = configManager.config;

  const dbManager = new DatabaseManager({
    databasePath: config.databasePath,
    enableAuditHistory: config.security.enableAuditHistory
  }).initialize();

  try {
    const apiKeyManager = new ApiKeyManager({
      apiKeyRepo: dbManager.apiKeyRepo,
      config
    });

    const created = cliOptions.rotateKeyId
      ? apiKeyManager.rotateApiKey(cliOptions.rotateKeyId, cliOptions)
      : apiKeyManager.createApiKey(cliOptions);

    const outputLines = [
      '========================================================================',
      `${PROJECT_IDENTITY.name} (v${PROJECT_IDENTITY.version}) — API Key Generated`,
      `${PROJECT_IDENTITY.officialAttribution}`,
      '========================================================================',
      '',
      `Key ID       : ${created.keyId}`,
      `Identity ID  : ${created.identityId}`,
      `Label        : ${created.label}`,
      `Scopes       : ${created.scopes.join(', ')}`,
      `Allowed Guilds: ${created.allowedGuildIds.length > 0 ? created.allowedGuildIds.join(', ') : 'All bot-accessible guilds'}`,
      '',
      'IMPORTANT: Copy your API Key now. It will NEVER be displayed again:',
      '',
      `  ${created.plaintextKey}`,
      '',
      '------------------------------------------------------------------------',
      '1. Persistence:',
      `   The SHA-256 hash has been stored in SQLite (${config.databasePath}).`,
      '   Optionally, for stateless/container deployments without persistent DB,',
      '   you can also set the hash in your .env file:',
      `   API_KEY_HASH=${created.keyHash}`,
      '',
      '2. MCP Client Configuration:',
      `   Endpoint URL : ${config.network.publicBaseUrl}${config.network.mcpPath}`,
      `   HTTP Header  : Authorization: Bearer ${created.plaintextKey}`,
      '========================================================================'
    ];

    process.stdout.write(outputLines.join('\n') + '\n');
  } finally {
    dbManager.close();
  }
}

runGenerateKey();

