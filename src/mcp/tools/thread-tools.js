/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS } from '../../core/constants.js';
import {
  guildIdSchema,
  channelIdSchema,
  threadIdSchema,
  userIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerThreadTools(registry, { threadManager }) {
  registry.register({
    name: 'create_thread',
    title: 'Create Thread',
    description: 'Create a standalone public or private thread in a channel.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      name: z.string().trim().min(1).max(100),
      autoArchiveDuration: z.enum(['60', '1440', '4320', '10080']).optional().transform((v) => (v ? Number(v) : 1440)),
      type: z.enum(['public_thread', 'private_thread']).default('public_thread'),
      invitable: z.boolean().optional(),
      rateLimitPerUser: z.number().int().min(0).max(DISCORD_LIMITS.MAX_SLOWMODE_SECONDS).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => threadManager.createThread(args)
  });

  registry.register({
    name: 'delete_thread',
    title: 'Delete Thread',
    description: 'Permanently delete a thread channel (destructive operation requiring confirmation).',
    category: 'thread',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => threadManager.deleteThread(args)
  });

  registry.register({
    name: 'archive_thread',
    title: 'Archive Thread',
    description: 'Archive an active thread.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => threadManager.archiveThread(args)
  });

  registry.register({
    name: 'unarchive_thread',
    title: 'Unarchive Thread',
    description: 'Unarchive an archived thread.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => threadManager.unarchiveThread(args)
  });

  registry.register({
    name: 'lock_thread',
    title: 'Lock Thread',
    description: 'Lock a thread so only moderators can unarchive or post in it.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => threadManager.lockThread(args)
  });

  registry.register({
    name: 'unlock_thread',
    title: 'Unlock Thread',
    description: 'Unlock a previously locked thread.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => threadManager.unlockThread(args)
  });

  registry.register({
    name: 'join_thread',
    title: 'Join Thread',
    description: 'Have the bot join a thread channel.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema
    }),
    handler: async (args) => threadManager.joinThread(args)
  });

  registry.register({
    name: 'leave_thread',
    title: 'Leave Thread',
    description: 'Have the bot leave a thread channel.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema
    }),
    handler: async (args) => threadManager.leaveThread(args)
  });

  registry.register({
    name: 'add_thread_member',
    title: 'Add Thread Member',
    description: 'Add a guild member to a thread channel.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => threadManager.addThreadMember(args)
  });

  registry.register({
    name: 'remove_thread_member',
    title: 'Remove Thread Member',
    description: 'Remove a guild member from a thread channel.',
    category: 'thread',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => threadManager.removeThreadMember(args)
  });

  registry.register({
    name: 'get_thread_info',
    title: 'Get Thread Info',
    description: 'Retrieve metadata, archive state, lock state, and member/message counts for a thread.',
    category: 'thread',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      threadId: threadIdSchema
    }),
    handler: async (args) => threadManager.getThreadInfo(args)
  });

  registry.register({
    name: 'list_active_threads',
    title: 'List Active Threads',
    description: 'List all currently active threads across a Discord guild.',
    category: 'thread',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema
    }),
    handler: async (args) => threadManager.listActiveThreads(args)
  });

  registry.register({
    name: 'list_archived_threads',
    title: 'List Archived Threads',
    description: 'List archived public or private threads in a specific parent channel.',
    category: 'thread',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      type: z.enum(['public', 'private']).default('public'),
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async (args) => threadManager.listArchivedThreads(args)
  });
}

