/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  guildIdSchema,
  ruleIdSchema,
  roleIdSchema,
  channelIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

const triggerMetadataSchema = z
  .object({
    keywordFilter: z.array(z.string().trim().min(1).max(60)).max(1000).optional(),
    regexPatterns: z.array(z.string().trim().min(1).max(260)).max(10).optional(),
    presets: z.array(z.number().int().min(1).max(3)).optional(),
    allowList: z.array(z.string().trim().min(1).max(60)).max(1000).optional(),
    mentionTotalLimit: z.number().int().min(1).max(50).optional(),
    mentionRaidProtectionEnabled: z.boolean().optional()
  })
  .optional();

const autoModActionSchema = z.object({
  type: z.enum(['block_message', 'send_alert_message', 'timeout']).default('block_message'),
  channelId: channelIdSchema.optional(),
  durationSeconds: z.number().int().min(1).max(2419200).optional(),
  customMessage: z.string().trim().max(150).optional()
});

export function registerAutoModTools(registry, { autoModManager }) {
  registry.register({
    name: 'list_automod_rules',
    title: 'List AutoMod Rules',
    description: 'List all Auto Moderation rules configured in a Discord guild.',
    category: 'automod',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema
    }),
    handler: async (args) => autoModManager.listAutoModRules(args)
  });

  registry.register({
    name: 'get_automod_rule',
    title: 'Get AutoMod Rule',
    description: 'Retrieve configuration, triggers, and actions for a specific Auto Moderation rule.',
    category: 'automod',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      ruleId: ruleIdSchema
    }),
    handler: async (args) => autoModManager.getAutoModRule(args)
  });

  registry.register({
    name: 'create_automod_rule',
    title: 'Create AutoMod Rule',
    description: 'Create a new Discord Auto Moderation rule in a guild.',
    category: 'automod',
    schema: z.object({
      guildId: guildIdSchema,
      name: z.string().trim().min(1).max(100),
      triggerType: z.enum(['keyword', 'spam', 'keyword_preset', 'mention_spam']).default('keyword'),
      triggerMetadata: triggerMetadataSchema,
      actions: z.array(autoModActionSchema).min(1),
      enabled: z.boolean().default(true),
      exemptRoles: z.array(roleIdSchema).max(20).optional(),
      exemptChannels: z.array(channelIdSchema).max(50).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => autoModManager.createAutoModRule(args)
  });

  registry.register({
    name: 'edit_automod_rule',
    title: 'Edit AutoMod Rule',
    description: 'Update an existing Discord Auto Moderation rule.',
    category: 'automod',
    schema: z.object({
      guildId: guildIdSchema,
      ruleId: ruleIdSchema,
      name: z.string().trim().min(1).max(100).optional(),
      triggerMetadata: triggerMetadataSchema,
      actions: z.array(autoModActionSchema).min(1).optional(),
      enabled: z.boolean().optional(),
      exemptRoles: z.array(roleIdSchema).max(20).optional(),
      exemptChannels: z.array(channelIdSchema).max(50).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => autoModManager.editAutoModRule(args)
  });

  registry.register({
    name: 'delete_automod_rule',
    title: 'Delete AutoMod Rule',
    description: 'Delete an Auto Moderation rule in a guild (destructive operation requiring confirmation).',
    category: 'automod',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      ruleId: ruleIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => autoModManager.deleteAutoModRule(args)
  });
}

