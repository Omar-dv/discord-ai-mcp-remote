/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import {
  guildIdSchema,
  userIdSchema,
  snowflakeSchema
} from '../../security/validation.js';
import {
  MODERATION_AUDIT_EVENTS,
  CHANNEL_AUDIT_EVENTS,
  ROLE_AUDIT_EVENTS,
  MEMBER_AUDIT_EVENTS
} from '../../services/audit/audit-service.js';

export function registerAuditTools(
  registry,
  { discordClientManager, auditService }
) {
  registry.register({
    name: 'get_audit_logs',
    title: 'Get Audit Logs',
    description: 'Fetch Discord audit log entries for a guild with optional user and action type filters.',
    category: 'audit',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional(),
      userId: userIdSchema.optional(),
      actionType: z.number().int().optional()
    }),
    handler: async ({ guildId, limit, userId, actionType }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return auditService.fetchGuildAuditLogs(guild, { limit, userId, actionType });
    }
  });

  registry.register({
    name: 'get_audit_log_entry',
    title: 'Get Audit Log Entry',
    description: 'Fetch a specific Discord audit log entry by its Snowflake ID.',
    category: 'audit',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      entryId: snowflakeSchema
    }),
    handler: async ({ guildId, entryId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      const entry = await auditService.getAuditLogEntryById(guild, entryId);
      if (!entry) {
        throw new AppError(
          ERROR_CODES.NOT_FOUND,
          `Audit log entry "${entryId}" was not found in recent audit logs for guild "${guild.name}".`
        );
      }
      return entry;
    }
  });

  registry.register({
    name: 'get_recent_moderation_actions',
    title: 'Get Recent Moderation Actions',
    description: 'Fetch recent moderation-related audit log entries (kicks, bans, unbans, timeouts, message deletions).',
    category: 'audit',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async ({ guildId, limit }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return auditService.fetchFilteredAuditLogs(guild, MODERATION_AUDIT_EVENTS, limit);
    }
  });

  registry.register({
    name: 'get_recent_channel_changes',
    title: 'Get Recent Channel Changes',
    description: 'Fetch recent channel and thread creation, update, deletion, and permission overwrite audit log entries.',
    category: 'audit',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async ({ guildId, limit }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return auditService.fetchFilteredAuditLogs(guild, CHANNEL_AUDIT_EVENTS, limit);
    }
  });

  registry.register({
    name: 'get_recent_role_changes',
    title: 'Get Recent Role Changes',
    description: 'Fetch recent role creation, update, deletion, and member role assignment audit log entries.',
    category: 'audit',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async ({ guildId, limit }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return auditService.fetchFilteredAuditLogs(guild, ROLE_AUDIT_EVENTS, limit);
    }
  });

  registry.register({
    name: 'get_recent_member_actions',
    title: 'Get Recent Member Actions',
    description: 'Fetch recent member-targeted audit log entries (updates, roles, kicks, bans, voice moves/disconnects).',
    category: 'audit',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async ({ guildId, limit }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return auditService.fetchFilteredAuditLogs(guild, MEMBER_AUDIT_EVENTS, limit);
    }
  });
}

