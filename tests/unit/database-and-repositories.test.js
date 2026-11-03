/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUTH_SCOPES } from '../../src/core/constants.js';
import { DatabaseManager } from '../../src/database/database.js';

describe('SQLite Database Migrations, Repositories, Identity Isolation, & Hot Backup', () => {
  it('initializes schema migrations and operates all repositories with identity isolation', async () => {
    const dbManager = new DatabaseManager({
      databasePath: ':memory:',
      enableAuditHistory: true
    }).initialize();

    expect(dbManager.isHealthy()).toBe(true);
    const migrations = dbManager.getAppliedMigrations();
    expect(migrations.length).toBeGreaterThanOrEqual(2);

    dbManager.configRepo.set('theme', { mode: 'dark' });
    expect(dbManager.configRepo.get('theme')).toEqual({ mode: 'dark' });

    const modCase = dbManager.moderationRepo.createCase({
      guildId: '555555555555555555',
      targetUserId: '444444444444444444',
      moderatorId: '111111111111111111',
      identityId: 'moderator_alice',
      actionType: 'kick',
      reason: 'Rule violation'
    });
    expect(modCase.identityId).toBe('moderator_alice');

    dbManager.auditRepo.record({
      toolName: 'send_message',
      category: 'message',
      identityId: 'user_a',
      guildId: '555555555555555555',
      status: 'success',
      durationMs: 12
    });
    dbManager.auditRepo.record({
      toolName: 'list_channels',
      category: 'channel',
      identityId: 'user_b',
      guildId: '555555555555555555',
      status: 'success',
      durationMs: 5
    });

    const userALogs = dbManager.auditRepo.list({ identityId: 'user_a' });
    expect(userALogs.length).toBe(1);
    expect(userALogs[0].toolName).toBe('send_message');

    const keyRecord = dbManager.apiKeyRepo.createKey({
      keyId: 'abc123def456',
      keyPrefix: 'damcp_live_abc123def456',
      keyHash: 'a'.repeat(64),
      identityId: 'user_a',
      label: 'User A Key',
      scopes: [AUTH_SCOPES.READ],
      allowedGuildIds: ['555555555555555555']
    });
    expect(keyRecord.identityId).toBe('user_a');

    const sessionRecord = dbManager.sessionRepo.createSession({
      sessionId: 'mcp_sess_test_1',
      identityId: 'user_a',
      authMethod: 'api_key',
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    });
    expect(sessionRecord.sessionId).toBe('mcp_sess_test_1');

    const bucketRes = dbManager.rateLimitRepo.consumeBucket({
      bucketKey: 'tool:user_a',
      limit: 5,
      windowMs: 60_000
    });
    expect(bucketRes.allowed).toBe(true);

    const tmpBackupPath = path.join(os.tmpdir(), `discord-mcp-test-backup-${Date.now()}.sqlite`);
    const backupResult = await dbManager.backupTo(tmpBackupPath);
    expect(backupResult.sizeBytes).toBeGreaterThan(0);
    if (fs.existsSync(tmpBackupPath)) {
      fs.unlinkSync(tmpBackupPath);
    }

    dbManager.close();
  });
});

