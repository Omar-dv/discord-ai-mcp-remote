/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS } from '../../core/constants.js';
import {
  guildIdSchema,
  channelIdSchema,
  webhookIdSchema,
  threadIdSchema,
  embedSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerWebhookTools(registry, { webhookManager }) {
  registry.register({
    name: 'create_webhook',
    title: 'Create Webhook',
    description: 'Create a new webhook on a channel (webhook token is redacted from AI output).',
    category: 'webhook',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      name: z.string().trim().min(1).max(80),
      avatar: z.string().trim().optional(),
      reason: reasonSchema
    }),
    handler: async (args) => webhookManager.createWebhook(args)
  });

  registry.register({
    name: 'delete_webhook',
    title: 'Delete Webhook',
    description: 'Delete a webhook in a guild (destructive operation requiring confirmation).',
    category: 'webhook',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      webhookId: webhookIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => webhookManager.deleteWebhook(args)
  });

  registry.register({
    name: 'edit_webhook',
    title: 'Edit Webhook',
    description: 'Modify a webhook name, avatar, or target channel.',
    category: 'webhook',
    schema: z.object({
      guildId: guildIdSchema,
      webhookId: webhookIdSchema,
      name: z.string().trim().min(1).max(80).optional(),
      channelId: channelIdSchema.optional(),
      avatar: z.string().trim().nullable().optional(),
      reason: reasonSchema
    }),
    handler: async (args) => webhookManager.editWebhook(args)
  });

  registry.register({
    name: 'get_webhook_info',
    title: 'Get Webhook Info',
    description: 'Retrieve metadata for a webhook with its secret token redacted.',
    category: 'webhook',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      webhookId: webhookIdSchema
    }),
    handler: async (args) => webhookManager.getWebhookInfo(args)
  });

  registry.register({
    name: 'list_webhooks',
    title: 'List Webhooks',
    description: 'List all webhooks in a guild or channel with all secret tokens redacted.',
    category: 'webhook',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema.optional()
    }),
    handler: async (args) => webhookManager.listWebhooks(args)
  });

  registry.register({
    name: 'execute_webhook',
    title: 'Execute Webhook',
    description: 'Send a message through a guild webhook without exposing its webhook token.',
    category: 'webhook',
    schema: z.object({
      guildId: guildIdSchema,
      webhookId: webhookIdSchema,
      content: z.string().max(DISCORD_LIMITS.MAX_MESSAGE_LENGTH).optional(),
      username: z.string().trim().min(1).max(80).optional(),
      avatarUrl: z.string().url().optional(),
      embeds: z.array(embedSchema).max(DISCORD_LIMITS.MAX_EMBEDS_PER_MESSAGE).optional(),
      threadId: threadIdSchema.optional()
    }),
    handler: async (args) => webhookManager.executeWebhook(args)
  });
}

