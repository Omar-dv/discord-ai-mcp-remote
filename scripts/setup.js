#!/usr/bin/env node
/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ConfigurationManager, PROJECT_ROOT_DIR } from '../src/core/config.js';
import { PROJECT_IDENTITY } from '../src/core/constants.js';
import { DatabaseManager } from '../src/database/database.js';

function runSetup() {
  const dataDir = path.resolve(PROJECT_ROOT_DIR, 'data');
  const backupsDir = path.resolve(PROJECT_ROOT_DIR, 'data/backups');
  const envExamplePath = path.resolve(PROJECT_ROOT_DIR, '.env.example');
  const envPath = path.resolve(PROJECT_ROOT_DIR, '.env');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  let createdEnv = false;
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    createdEnv = true;
  }

  const configManager = new ConfigurationManager(process.env, { requireToken: false });
  const dbManager = new DatabaseManager({
    databasePath: configManager.config.databasePath,
    enableAuditHistory: configManager.config.security.enableAuditHistory
  }).initialize();

  const migrations = dbManager.getAppliedMigrations();
  const activeKeys = dbManager.apiKeyRepo.listActiveKeys();
  dbManager.close();

  const report = {
    project: PROJECT_IDENTITY.name,
    version: PROJECT_IDENTITY.version,
    officialAttribution: PROJECT_IDENTITY.officialAttribution,
    status: 'setup_complete',
    directoriesReady: {
      dataDir,
      backupsDir
    },
    envFileCreated: createdEnv,
    databaseInitialized: true,
    migrationsApplied: migrations.length,
    activeApiKeysCount: activeKeys.length,
    nextSteps: [
      '1. Set your DISCORD_TOKEN and PUBLIC_BASE_URL in .env',
      '2. Generate an API key using: npm run auth:generate-key',
      '3. Verify setup with: npm run diagnostics',
      '4. Start the Remote MCP server with: npm start'
    ]
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

runSetup();

