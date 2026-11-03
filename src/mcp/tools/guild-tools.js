/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { guildIdSchema, userIdSchema } from '../../security/validation.js';

export function registerGuildTools(registry, { guildManager }) {
  registry.register({
    name: 'list_guilds',
    title: 'List Guilds',
    description: 'List all authorized Discord servers (guilds) accessible by the bot.',
    category: 'guild',
    readOnly: true,
    schema: z.object({}),
    handler: async () => guildManager.listGuilds()
  });

  registry.register({
    name: 'get_guild_info',
    title: 'Get Guild Info',
    description: 'Retrieve comprehensive information and metadata for a specific Discord guild.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildInfo(guildId)
  });

  registry.register({
    name: 'get_guild_preview',
    title: 'Get Guild Preview',
    description: 'Retrieve public guild preview statistics including approximate member and presence counts.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildPreview(guildId)
  });

  registry.register({
    name: 'get_guild_settings',
    title: 'Get Guild Settings',
    description: 'Retrieve guild verification level, explicit content filter, MFA level, system channels, and local settings.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildSettings(guildId)
  });

  registry.register({
    name: 'get_guild_features',
    title: 'Get Guild Features',
    description: 'List all enabled Discord feature flags (such as COMMUNITY, AUTO_MODERATION, INVITE_SPLASH) for a guild.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildFeatures(guildId)
  });

  registry.register({
    name: 'get_guild_owner',
    title: 'Get Guild Owner',
    description: 'Retrieve the owner user and member profile for a Discord guild.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildOwner(guildId)
  });

  registry.register({
    name: 'get_guild_members_count',
    title: 'Get Guild Members Count',
    description: 'Retrieve total member count and cached human/bot breakdown for a guild.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildMembersCount(guildId)
  });

  registry.register({
    name: 'get_guild_channels',
    title: 'Get Guild Channels',
    description: 'List all channels and categories in a Discord guild ordered by position.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildChannels(guildId)
  });

  registry.register({
    name: 'get_guild_roles',
    title: 'Get Guild Roles',
    description: 'List all roles in a Discord guild ordered by hierarchy position.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildRoles(guildId)
  });

  registry.register({
    name: 'get_guild_emojis',
    title: 'Get Guild Emojis',
    description: 'List all custom emojis in a Discord guild.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildEmojis(guildId)
  });

  registry.register({
    name: 'get_guild_stickers',
    title: 'Get Guild Stickers',
    description: 'List all custom stickers in a Discord guild.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildStickers(guildId)
  });

  registry.register({
    name: 'get_guild_invites',
    title: 'Get Guild Invites',
    description: 'Fetch all active invite codes in a Discord guild (requires ManageGuild permission).',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildInvites(guildId)
  });

  registry.register({
    name: 'get_guild_audit_logs',
    title: 'Get Guild Audit Logs',
    description: 'Fetch Discord audit log entries for a guild (requires ViewAuditLog permission).',
    category: 'guild',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(100).optional(),
      userId: userIdSchema.optional(),
      actionType: z.number().int().optional()
    }),
    handler: async ({ guildId, limit, userId, actionType }) =>
      guildManager.getGuildAuditLogs(guildId, { limit, userId, actionType })
  });

  registry.register({
    name: 'get_guild_bans',
    title: 'Get Guild Bans',
    description: 'Fetch banned users and ban reasons for a guild (requires BanMembers permission).',
    category: 'guild',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(1000).optional()
    }),
    handler: async ({ guildId, limit }) => guildManager.getGuildBans(guildId, { limit })
  });

  registry.register({
    name: 'get_guild_integrations',
    title: 'Get Guild Integrations',
    description: 'Fetch third-party integrations and bot integrations in a guild (requires ManageGuild permission).',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildIntegrations(guildId)
  });

  registry.register({
    name: 'get_guild_webhooks',
    title: 'Get Guild Webhooks',
    description: 'Fetch all webhooks in a guild with webhook tokens redacted (requires ManageWebhooks permission).',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildWebhooks(guildId)
  });

  registry.register({
    name: 'get_guild_events',
    title: 'Get Guild Scheduled Events',
    description: 'Fetch all scheduled events in a Discord guild.',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildEvents(guildId)
  });

  registry.register({
    name: 'get_guild_automod_rules',
    title: 'Get Guild AutoMod Rules',
    description: 'Fetch all Auto Moderation rules configured in a guild (requires ManageGuild permission).',
    category: 'guild',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => guildManager.getGuildAutoModRules(guildId)
  });
}

