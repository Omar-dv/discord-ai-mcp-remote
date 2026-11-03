/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  guildIdSchema,
  channelIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerInviteTools(registry, { inviteManager }) {
  registry.register({
    name: 'create_invite',
    title: 'Create Invite',
    description: 'Create an instant invite link for a Discord guild channel.',
    category: 'invite',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      maxAge: z.number().int().min(0).max(604800).optional().describe('Invite expiration in seconds (0 for never, max 604800)'),
      maxUses: z.number().int().min(0).max(100).optional().describe('Maximum uses (0 for unlimited, max 100)'),
      temporary: z.boolean().optional(),
      unique: z.boolean().optional(),
      reason: reasonSchema
    }),
    handler: async (args) => inviteManager.createInvite(args)
  });

  registry.register({
    name: 'delete_invite',
    title: 'Delete Invite',
    description: 'Revoke and delete an active invite code in a guild (requires confirmation).',
    category: 'invite',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      code: z.string().trim().min(2).max(64),
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => inviteManager.deleteInvite(args)
  });

  registry.register({
    name: 'get_invite_info',
    title: 'Get Invite Info',
    description: 'Retrieve information about a Discord invite code.',
    category: 'invite',
    readOnly: true,
    schema: z.object({
      code: z.string().trim().min(2).max(64)
    }),
    handler: async (args) => inviteManager.getInviteInfo(args)
  });

  registry.register({
    name: 'list_guild_invites',
    title: 'List Guild Invites',
    description: 'List all active invites across a Discord guild.',
    category: 'invite',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema
    }),
    handler: async (args) => inviteManager.listGuildInvites(args)
  });

  registry.register({
    name: 'list_channel_invites',
    title: 'List Channel Invites',
    description: 'List all active invites for a specific guild channel.',
    category: 'invite',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema
    }),
    handler: async (args) => inviteManager.listChannelInvites(args)
  });
}

