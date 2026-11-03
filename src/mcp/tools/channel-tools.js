/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS } from '../../core/constants.js';
import {
  guildIdSchema,
  channelIdSchema,
  snowflakeSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

const channelTypeEnum = z.enum([
  'text',
  'voice',
  'category',
  'announcement',
  'stage',
  'forum',
  'media'
]);

const permissionOverwriteEntrySchema = z.object({
  targetId: snowflakeSchema.describe('Role ID or Member User ID for the permission overwrite'),
  targetType: z.enum(['role', 'member']).default('role'),
  allow: z.array(z.string().trim().min(1)).optional(),
  deny: z.array(z.string().trim().min(1)).optional()
});

export function registerChannelTools(registry, { channelManager }) {
  registry.register({
    name: 'create_channel',
    title: 'Create Channel',
    description: 'Create a new text, voice, category, announcement, forum, stage, or media channel in a guild.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      name: z.string().trim().min(1).max(DISCORD_LIMITS.MAX_CHANNEL_NAME_LENGTH),
      type: channelTypeEnum.default('text'),
      parentId: channelIdSchema.nullable().optional(),
      topic: z.string().max(DISCORD_LIMITS.MAX_CHANNEL_TOPIC_LENGTH).optional(),
      nsfw: z.boolean().optional(),
      rateLimitPerUser: z.number().int().min(0).max(DISCORD_LIMITS.MAX_SLOWMODE_SECONDS).optional(),
      bitrate: z.number().int().min(8000).max(384000).optional(),
      userLimit: z.number().int().min(0).max(99).optional(),
      position: z.number().int().min(0).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.createChannel(args)
  });

  registry.register({
    name: 'delete_channel',
    title: 'Delete Channel',
    description: 'Permanently delete a channel in a Discord guild (destructive operation requiring confirmation).',
    category: 'channel',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => channelManager.deleteChannel(args)
  });

  registry.register({
    name: 'edit_channel',
    title: 'Edit Channel',
    description: 'Update channel properties including name, topic, NSFW flag, slowmode, category parent, or position.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      name: z.string().trim().min(1).max(DISCORD_LIMITS.MAX_CHANNEL_NAME_LENGTH).optional(),
      topic: z.string().max(DISCORD_LIMITS.MAX_CHANNEL_TOPIC_LENGTH).nullable().optional(),
      nsfw: z.boolean().optional(),
      rateLimitPerUser: z.number().int().min(0).max(DISCORD_LIMITS.MAX_SLOWMODE_SECONDS).optional(),
      parentId: channelIdSchema.nullable().optional(),
      position: z.number().int().min(0).optional(),
      bitrate: z.number().int().min(8000).max(384000).optional(),
      userLimit: z.number().int().min(0).max(99).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.editChannel(args)
  });

  registry.register({
    name: 'get_channel_info',
    title: 'Get Channel Info',
    description: 'Retrieve detailed metadata and permission overwrites for a specific Discord channel.',
    category: 'channel',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema
    }),
    handler: async (args) => channelManager.getChannelInfo(args)
  });

  registry.register({
    name: 'list_channels',
    title: 'List Channels',
    description: 'List all channels in a guild with optional filtering by channel type.',
    category: 'channel',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      type: channelTypeEnum.optional()
    }),
    handler: async (args) => channelManager.listChannels(args)
  });

  registry.register({
    name: 'clone_channel',
    title: 'Clone Channel',
    description: 'Duplicate an existing guild channel along with its permission overwrites and settings.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      name: z.string().trim().min(1).max(DISCORD_LIMITS.MAX_CHANNEL_NAME_LENGTH).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.cloneChannel(args)
  });

  registry.register({
    name: 'move_channel',
    title: 'Move Channel',
    description: 'Move a channel into a category (or out of a category) and optionally sync permissions.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      parentId: channelIdSchema.nullable().describe('Target category ID, or null for top-level'),
      position: z.number().int().min(0).optional(),
      lockPermissions: z.boolean().optional(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.moveChannel(args)
  });

  registry.register({
    name: 'set_channel_position',
    title: 'Set Channel Position',
    description: 'Change the display order position of a channel in its guild or category.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      position: z.number().int().min(0),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.setChannelPosition(args)
  });

  registry.register({
    name: 'set_channel_topic',
    title: 'Set Channel Topic',
    description: 'Set or clear the topic description of a text, announcement, stage, or forum channel.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      topic: z.string().max(DISCORD_LIMITS.MAX_CHANNEL_TOPIC_LENGTH).nullable(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.setChannelTopic(args)
  });

  registry.register({
    name: 'set_channel_name',
    title: 'Set Channel Name',
    description: 'Rename a Discord channel.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      name: z.string().trim().min(1).max(DISCORD_LIMITS.MAX_CHANNEL_NAME_LENGTH),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.setChannelName(args)
  });

  registry.register({
    name: 'set_channel_slowmode',
    title: 'Set Channel Slowmode',
    description: 'Configure per-user slowmode cooldown (0 to 21600 seconds) on a channel.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      seconds: z.number().int().min(0).max(DISCORD_LIMITS.MAX_SLOWMODE_SECONDS),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.setChannelSlowmode(args)
  });

  registry.register({
    name: 'set_channel_nsfw',
    title: 'Set Channel NSFW',
    description: 'Enable or disable the age-restricted (NSFW) flag on a channel.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      nsfw: z.boolean(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.setChannelNsfw(args)
  });

  registry.register({
    name: 'set_channel_permissions',
    title: 'Set Channel Permissions',
    description: 'Replace all permission overwrites on a channel (destructive security operation requiring confirmation).',
    category: 'channel',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      overwrites: z.array(permissionOverwriteEntrySchema),
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => channelManager.setChannelPermissions(args)
  });

  registry.register({
    name: 'get_channel_permissions',
    title: 'Get Channel Permissions',
    description: 'List all role and member permission overwrites configured on a channel.',
    category: 'channel',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema
    }),
    handler: async (args) => channelManager.getChannelPermissions(args)
  });

  registry.register({
    name: 'add_channel_permission',
    title: 'Add Channel Permission Overwrite',
    description: 'Add a permission overwrite for a role or member on a channel.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      targetId: snowflakeSchema,
      allow: z.array(z.string().trim().min(1)).optional(),
      deny: z.array(z.string().trim().min(1)).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.upsertChannelPermission(args)
  });

  registry.register({
    name: 'edit_channel_permission',
    title: 'Edit Channel Permission Overwrite',
    description: 'Modify an existing permission overwrite for a role or member on a channel.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      targetId: snowflakeSchema,
      allow: z.array(z.string().trim().min(1)).optional(),
      deny: z.array(z.string().trim().min(1)).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.upsertChannelPermission(args)
  });

  registry.register({
    name: 'remove_channel_permission',
    title: 'Remove Channel Permission Overwrite',
    description: 'Delete a role or member permission overwrite from a channel (requires confirmation).',
    category: 'channel',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      targetId: snowflakeSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => channelManager.removeChannelPermission(args)
  });

  registry.register({
    name: 'create_category',
    title: 'Create Category',
    description: 'Create a new category channel for organizing channels in a guild.',
    category: 'channel',
    schema: z.object({
      guildId: guildIdSchema,
      name: z.string().trim().min(1).max(DISCORD_LIMITS.MAX_CHANNEL_NAME_LENGTH),
      position: z.number().int().min(0).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => channelManager.createCategory(args)
  });

  registry.register({
    name: 'get_category_channels',
    title: 'Get Category Channels',
    description: 'List all child channels belonging to a specific category channel.',
    category: 'channel',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      categoryId: channelIdSchema
    }),
    handler: async (args) => channelManager.getCategoryChannels(args)
  });
}

