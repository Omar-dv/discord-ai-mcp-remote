/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS } from '../../core/constants.js';
import {
  guildIdSchema,
  userIdSchema,
  roleIdSchema,
  channelIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerMemberTools(registry, { memberManager }) {
  registry.register({
    name: 'get_member_info',
    title: 'Get Member Info',
    description: 'Retrieve detailed guild member information including roles, nickname, join date, and timeout status.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => memberManager.getMemberInfo(args)
  });

  registry.register({
    name: 'get_member_profile',
    title: 'Get Member Profile',
    description: 'Retrieve full guild member and Discord user profile including banner, accent color, and badges.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => memberManager.getMemberProfile(args)
  });

  registry.register({
    name: 'list_guild_members',
    title: 'List Guild Members',
    description: 'List members in a Discord guild up to the specified limit.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      limit: z.number().int().min(1).max(DISCORD_LIMITS.MAX_MEMBER_LIST_LIMIT).optional()
    }),
    handler: async (args) => memberManager.listGuildMembers(args)
  });

  registry.register({
    name: 'search_guild_members',
    title: 'Search Guild Members',
    description: 'Search guild members by username, display name, or nickname.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      query: z.string().trim().min(1).max(100),
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async (args) => memberManager.searchGuildMembers(args)
  });

  registry.register({
    name: 'get_member_permissions',
    title: 'Get Member Permissions',
    description: 'Inspect effective permissions for a member at the guild level and optionally in a specific channel.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      channelId: channelIdSchema.optional()
    }),
    handler: async (args) => memberManager.getMemberPermissions(args)
  });

  registry.register({
    name: 'get_member_roles',
    title: 'Get Member Roles',
    description: 'List all roles assigned to a guild member.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => memberManager.getMemberRoles(args)
  });

  registry.register({
    name: 'get_member_voice_state',
    title: 'Get Member Voice State',
    description: 'Retrieve a member current voice channel connection state.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => memberManager.getMemberVoiceState(args)
  });

  registry.register({
    name: 'assign_role_to_member',
    title: 'Assign Role to Member',
    description: 'Assign a guild role to a member while enforcing role hierarchy.',
    category: 'member',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      roleId: roleIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => memberManager.assignRoleToMember(args)
  });

  registry.register({
    name: 'remove_role_from_member',
    title: 'Remove Role from Member',
    description: 'Remove a guild role from a member while enforcing role hierarchy.',
    category: 'member',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      roleId: roleIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => memberManager.removeRoleFromMember(args)
  });

  registry.register({
    name: 'edit_member_nickname',
    title: 'Edit Member Nickname',
    description: 'Change a guild member server nickname.',
    category: 'member',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      nickname: z.string().trim().max(DISCORD_LIMITS.MAX_NICKNAME_LENGTH).nullable(),
      reason: reasonSchema
    }),
    handler: async (args) => memberManager.editMemberNickname(args)
  });

  registry.register({
    name: 'reset_member_nickname',
    title: 'Reset Member Nickname',
    description: 'Reset a guild member server nickname back to their default username.',
    category: 'member',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => memberManager.resetMemberNickname(args)
  });

  registry.register({
    name: 'edit_member_timeout',
    title: 'Edit Member Timeout',
    description: 'Apply or update a communication timeout on a guild member (destructive action requiring confirmation).',
    category: 'member',
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
    handler: async (args) => memberManager.editMemberTimeout(args)
  });

  registry.register({
    name: 'remove_member_timeout',
    title: 'Remove Member Timeout',
    description: 'Clear an active communication timeout from a guild member.',
    category: 'member',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => memberManager.removeMemberTimeout(args)
  });

  registry.register({
    name: 'kick_member',
    title: 'Kick Member',
    description: 'Kick a member from a Discord guild and record a moderation case (requires confirmation).',
    category: 'member',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => memberManager.kickMember(args)
  });

  registry.register({
    name: 'ban_member',
    title: 'Ban Member',
    description: 'Ban a user or member from a Discord guild and record a moderation case (requires confirmation).',
    category: 'member',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      deleteMessageSeconds: z.number().int().min(0).max(604800).optional(),
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => memberManager.banMember(args)
  });

  registry.register({
    name: 'unban_member',
    title: 'Unban Member',
    description: 'Remove a ban for a user in a Discord guild and record a moderation case.',
    category: 'member',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => memberManager.unbanMember(args)
  });

  registry.register({
    name: 'get_member_avatar',
    title: 'Get Member Avatar',
    description: 'Retrieve the member server-specific avatar URL and global avatar URL.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      size: z.enum(['64', '128', '256', '512', '1024', '2048', '4096']).optional().transform((v) => (v ? Number(v) : 512))
    }),
    handler: async (args) => memberManager.getMemberAvatar(args)
  });

  registry.register({
    name: 'get_member_join_date',
    title: 'Get Member Join Date',
    description: 'Retrieve when a member joined the guild and when their Discord account was created.',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => memberManager.getMemberJoinDate(args)
  });

  registry.register({
    name: 'get_member_presence',
    title: 'Get Member Presence',
    description: 'Retrieve a member presence status and activities (respects GuildPresences privileged intent).',
    category: 'member',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => memberManager.getMemberPresence(args)
  });
}

