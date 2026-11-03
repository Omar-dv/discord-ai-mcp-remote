/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS } from '../../core/constants.js';
import {
  guildIdSchema,
  channelIdSchema,
  messageIdSchema,
  userIdSchema,
  embedSchema,
  allowedMentionsSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerMessageTools(registry, { messageManager }) {
  registry.register({
    name: 'send_message',
    title: 'Send Message',
    description: 'Send a text and/or embed message to a Discord channel with safe mention controls.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      content: z.string().max(DISCORD_LIMITS.MAX_MESSAGE_LENGTH).optional(),
      embeds: z.array(embedSchema).max(DISCORD_LIMITS.MAX_EMBEDS_PER_MESSAGE).optional(),
      allowedMentions: allowedMentionsSchema,
      replyToMessageId: messageIdSchema.optional(),
      suppressEmbeds: z.boolean().optional(),
      suppressNotifications: z.boolean().optional()
    }),
    handler: async (args) => messageManager.sendMessage(args)
  });

  registry.register({
    name: 'send_embed',
    title: 'Send Embed',
    description: 'Send a rich embed message to a Discord channel.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      content: z.string().max(DISCORD_LIMITS.MAX_MESSAGE_LENGTH).optional(),
      embed: embedSchema,
      allowedMentions: allowedMentionsSchema
    }),
    handler: async (args) => messageManager.sendEmbed(args)
  });

  registry.register({
    name: 'edit_message',
    title: 'Edit Message',
    description: 'Edit a message previously sent by the bot in a Discord channel.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      content: z.string().max(DISCORD_LIMITS.MAX_MESSAGE_LENGTH).optional(),
      embeds: z.array(embedSchema).max(DISCORD_LIMITS.MAX_EMBEDS_PER_MESSAGE).optional(),
      allowedMentions: allowedMentionsSchema
    }),
    handler: async (args) => messageManager.editMessage(args)
  });

  registry.register({
    name: 'delete_message',
    title: 'Delete Message',
    description: 'Delete a single message from a Discord channel (destructive operation requiring confirmation).',
    category: 'message',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => messageManager.deleteMessage(args)
  });

  registry.register({
    name: 'bulk_delete_messages',
    title: 'Bulk Delete Messages',
    description: 'Delete between 2 and 100 messages younger than 14 days in a channel (requires confirmation).',
    category: 'message',
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
    handler: async (args) => messageManager.bulkDeleteMessages(args)
  });

  registry.register({
    name: 'get_message',
    title: 'Get Message',
    description: 'Fetch a single message by ID from a Discord channel.',
    category: 'message',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema
    }),
    handler: async (args) => messageManager.getMessage(args)
  });

  registry.register({
    name: 'get_channel_messages',
    title: 'Get Channel Messages',
    description: 'Fetch recent messages from a Discord channel (up to 100 messages).',
    category: 'message',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      limit: z.number().int().min(1).max(DISCORD_LIMITS.MAX_MESSAGE_FETCH_LIMIT).optional(),
      before: messageIdSchema.optional(),
      after: messageIdSchema.optional(),
      around: messageIdSchema.optional()
    }),
    handler: async (args) => messageManager.getChannelMessages(args)
  });

  registry.register({
    name: 'search_messages',
    title: 'Search Messages',
    description: 'Search recent messages in a channel by text query, author ID, or attachment presence.',
    category: 'message',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      query: z.string().trim().max(256).optional(),
      authorId: userIdSchema.optional(),
      hasAttachments: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async (args) => messageManager.searchMessages(args)
  });

  registry.register({
    name: 'pin_message',
    title: 'Pin Message',
    description: 'Pin a message in a Discord channel.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => messageManager.pinMessage(args)
  });

  registry.register({
    name: 'unpin_message',
    title: 'Unpin Message',
    description: 'Unpin a pinned message in a Discord channel.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => messageManager.unpinMessage(args)
  });

  registry.register({
    name: 'add_reaction',
    title: 'Add Reaction',
    description: 'Add an emoji reaction to a message.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      emoji: z.string().trim().min(1).max(128)
    }),
    handler: async (args) => messageManager.addReaction(args)
  });

  registry.register({
    name: 'remove_reaction',
    title: 'Remove Reaction',
    description: 'Remove an emoji reaction from a message for the bot or a specified user.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      emoji: z.string().trim().min(1).max(128),
      userId: userIdSchema.optional()
    }),
    handler: async (args) => messageManager.removeReaction(args)
  });

  registry.register({
    name: 'get_message_reactions',
    title: 'Get Message Reactions',
    description: 'List reactions on a message or fetch the users who reacted with a specific emoji.',
    category: 'message',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      emoji: z.string().trim().min(1).max(128).optional()
    }),
    handler: async (args) => messageManager.getMessageReactions(args)
  });

  registry.register({
    name: 'crosspost_message',
    title: 'Crosspost Message',
    description: 'Publish (crosspost) a message in an Announcement channel to all following servers.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema
    }),
    handler: async (args) => messageManager.crosspostMessage(args)
  });

  registry.register({
    name: 'create_message_thread',
    title: 'Create Message Thread',
    description: 'Start a new public discussion thread attached to an existing channel message.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      name: z.string().trim().min(1).max(100),
      autoArchiveDuration: z.enum(['60', '1440', '4320', '10080']).optional().transform((v) => (v ? Number(v) : 1440)),
      rateLimitPerUser: z.number().int().min(0).max(DISCORD_LIMITS.MAX_SLOWMODE_SECONDS).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => messageManager.createMessageThread(args)
  });

  registry.register({
    name: 'reply_to_message',
    title: 'Reply to Message',
    description: 'Send a reply referencing an existing message in a Discord channel.',
    category: 'message',
    schema: z.object({
      guildId: guildIdSchema.optional(),
      channelId: channelIdSchema,
      messageId: messageIdSchema,
      content: z.string().max(DISCORD_LIMITS.MAX_MESSAGE_LENGTH).optional(),
      embeds: z.array(embedSchema).max(DISCORD_LIMITS.MAX_EMBEDS_PER_MESSAGE).optional(),
      allowedMentions: allowedMentionsSchema
    }),
    handler: async (args) => messageManager.replyToMessage(args)
  });
}

