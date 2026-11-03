#!/usr/bin/env node
/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import path from 'node:path';
import { ConfigurationManager } from '../src/core/config.js';
import { PROJECT_IDENTITY } from '../src/core/constants.js';
import { DatabaseManager } from '../src/database/database.js';

async function runDatabaseBackup() {
  const configManager = new ConfigurationManager(process.env, { requireToken: false });
  const config = configManager.config;

  const dbManager = new DatabaseManager({
    databasePath: config.databasePath,
    enableAuditHistory: config.security.enableAuditHistory
  }).initialize();

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destinationPath = path.resolve(
      config.backupDirectory,
      `database-backup-${timestamp}.sqlite`
    );

    const backupInfo = await dbManager.backupTo(destinationPath);
    process.stdout.write(
      JSON.stringify(
        {
          project: PROJECT_IDENTITY.name,
          version: PROJECT_IDENTITY.version,
          officialAttribution: PROJECT_IDENTITY.officialAttribution,
          status: 'backup_created',
          sourceDatabasePath: config.databasePath,
          ...backupInfo
        },
        null,
        2
      ) + '\n'
    );
  } finally {
    dbManager.close();
  }
}

runDatabaseBackup();
