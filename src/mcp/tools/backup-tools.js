/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { guildIdSchema } from '../../security/validation.js';
import { BACKUP_LIMITATIONS_NOTICE } from '../../services/backup/backup-service.js';

export function registerBackupTools(
  registry,
  { discordClientManager, backupService, databaseManager }
) {
  registry.register({
    name: 'export_server_backup',
    title: 'Export Server Backup',
    description:
      'Create a read-only structural and metadata backup snapshot of a guild (channels, categories, roles, permissions, emojis, stickers, settings, and optional audit history). Does not export message content or user attachments.',
    category: 'backup',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      includeAuditHistory: z.boolean().default(true),
      includeAutoMod: z.boolean().default(true),
      includeEvents: z.boolean().default(true),
      saveToFile: z.boolean().default(false),
      customFileName: z
        .string()
        .trim()
        .max(100)
        .regex(/^[a-zA-Z0-9._-]+$/, 'Custom filename may only contain alphanumeric, dot, underscore, or hyphen characters.')
        .optional()
    }),
    handler: async ({
      guildId,
      includeAuditHistory,
      includeAutoMod,
      includeEvents,
      saveToFile,
      customFileName
    }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return backupService.createGuildBackup(guild, {
        includeAuditHistory,
        includeAutoMod,
        includeEvents,
        saveToFile,
        customFileName
      });
    }
  });

  registry.register({
    name: 'list_server_backups',
    title: 'List Server Backups',
    description: 'List previously recorded backup snapshots for a Discord guild from the local SQLite database.',
    category: 'backup',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async ({ guildId, limit }) => {
      await discordClientManager.getGuildOrThrow(guildId);
      const backups = databaseManager?.auditRepo?.listBackups(guildId, limit) ?? [];
      return {
        guildId,
        count: backups.length,
        limitations: BACKUP_LIMITATIONS_NOTICE,
        backups
      };
    }
  });

  registry.register({
    name: 'get_backup_limitations',
    title: 'Get Backup Limitations',
    description: 'Retrieve documented limitations and privacy/security boundaries of the read-only server backup system.',
    category: 'backup',
    readOnly: true,
    schema: z.object({}),
    handler: async () => BACKUP_LIMITATIONS_NOTICE
  });
}

