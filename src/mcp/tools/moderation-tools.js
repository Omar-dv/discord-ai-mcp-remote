/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS } from '../../core/constants.js';
import {
  guildIdSchema,
  userIdSchema,
  channelIdSchema,
  messageIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerModerationTools(
  registry,
  { moderationManager, confirmationManager }
) {
  registry.register({
    name: 'timeout_member',
    title: 'Timeout Member',
    description: 'Timeout a guild member for a specified duration in seconds and record a moderation case (requires confirmation).',
    category: 'moderation',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      durationSeconds: z
        .number()
        .int()
        .min(1)
        .max(DISCORD_LIMITS.MAX_TIMEOUT_DAYS * 24 * 60 * 60),
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => moderationManager.timeoutMember(args)
  });

  registry.register({
    name: 'remove_timeout',
    title: 'Remove Timeout',
    description: 'Remove an active communication timeout from a guild member and record a moderation case.',
    category: 'moderation',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => moderationManager.removeTimeout(args)
  });

  registry.register({
    name: 'get_ban_list',
    title: 'Get Ban List',
    description: 'Retrieve the list of banned users and ban reasons for a guild.',
    category: 'moderation',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(1000).optional()
    }),
    handler: async (args) => moderationManager.getBanList(args)
  });

  registry.register({
    name: 'get_audit_logs',
    title: 'Get Audit Logs',
    description: 'Fetch Discord audit log entries for a guild with optional user and action type filters.',
    category: 'moderation',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional(),
      userId: userIdSchema.optional(),
      actionType: z.number().int().optional()
    }),
    handler: async (args) => moderationManager.getAuditLogs(args)
  });

  registry.register({
    name: 'create_moderation_case',
    title: 'Create Moderation Case',
    description: 'Create a persistent local moderation case record (e.g., warning, note, investigation) in SQLite.',
    category: 'moderation',
    schema: z.object({
      guildId: guildIdSchema,
      targetUserId: userIdSchema,
      targetUserTag: z.string().trim().max(160).optional(),
      moderatorId: userIdSchema.optional(),
      actionType: z.enum(['warn', 'note', 'kick', 'ban', 'unban', 'timeout', 'remove_timeout', 'investigation']).default('warn'),
      reason: z.string().trim().max(DISCORD_LIMITS.MAX_REASON_LENGTH),
      durationSeconds: z.number().int().min(0).optional()
    }),
    handler: async (args) => moderationManager.createModerationCase(args)
  });

  registry.register({
    name: 'get_moderation_case',
    title: 'Get Moderation Case',
    description: 'Retrieve a specific moderation case by case ID from the local SQLite database.',
    category: 'moderation',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      caseId: z.number().int().min(1)
    }),
    handler: async (args) => moderationManager.getModerationCase(args)
  });

  registry.register({
    name: 'get_moderation_history',
    title: 'Get Moderation History',
    description: 'Retrieve moderation case history for a guild or a specific user from the local SQLite database.',
    category: 'moderation',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      targetUserId: userIdSchema.optional(),
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async (args) => moderationManager.getModerationHistory(args)
  });

  registry.register({
    name: 'bulk_delete_messages',
    title: 'Bulk Delete Messages',
    description: 'Delete between 2 and 100 messages younger than 14 days in a channel (requires confirmation).',
    category: 'moderation',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      count: z
        .number()
        .int()
        .min(DISCORD_LIMITS.MIN_BULK_DELETE_COUNT)
        .max(DISCORD_LIMITS.MAX_BULK_DELETE_COUNT)
        .optional(),
      messageIds: z
        .array(messageIdSchema)
        .min(DISCORD_LIMITS.MIN_BULK_DELETE_COUNT)
        .max(DISCORD_LIMITS.MAX_BULK_DELETE_COUNT)
        .optional(),
      filterOld: z.boolean().default(true),
      ...confirmationFields
    }),
    handler: async (args) => moderationManager.bulkDeleteMessages(args)
  });

  registry.register({
    name: 'request_action_confirmation',
    title: 'Request Action Confirmation',
    description: 'Generate a parameter-bound single-use confirmation token for a destructive operation so the user can review and approve it.',
    category: 'security',
    readOnly: true,
    schema: z.object({
      operationName: z.string().trim().min(1),
      parameters: z.record(z.string(), z.unknown()),
      summary: z.string().trim().max(500).optional()
    }),
    handler: async ({ operationName, parameters, summary }) =>
      confirmationManager.createConfirmationRequest(operationName, parameters, summary)
  });

  registry.register({
    name: 'cancel_action_confirmation',
    title: 'Cancel Action Confirmation',
    description: 'Cancel and invalidate a pending confirmation token.',
    category: 'security',
    schema: z.object({
      confirmationToken: z.string().trim().min(1)
    }),
    handler: async ({ confirmationToken }) =>
      confirmationManager.cancelConfirmation(confirmationToken)
  });
}

