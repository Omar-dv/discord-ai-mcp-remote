/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  guildIdSchema,
  emojiIdSchema,
  roleIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerEmojiTools(registry, { emojiManager }) {
  registry.register({
    name: 'create_emoji',
    title: 'Create Emoji',
    description: 'Create a custom guild emoji from an image URL or base64 data URI (validates format and 256 KB limit).',
    category: 'emoji',
    schema: z.object({
      guildId: guildIdSchema,
      name: z.string().trim().regex(/^[a-zA-Z0-9_]{2,32}$/, 'Emoji name must be 2-32 alphanumeric or underscore characters.'),
      image: z.string().trim().min(1).describe('Image HTTPS URL or data:image/(png|jpg|gif|webp);base64,... string'),
      roles: z.array(roleIdSchema).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => emojiManager.createEmoji(args)
  });

  registry.register({
    name: 'delete_emoji',
    title: 'Delete Emoji',
    description: 'Delete a custom emoji from a guild (destructive operation requiring confirmation).',
    category: 'emoji',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      emojiId: emojiIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => emojiManager.deleteEmoji(args)
  });

  registry.register({
    name: 'edit_emoji',
    title: 'Edit Emoji',
    description: 'Rename a custom guild emoji or update the roles allowed to use it.',
    category: 'emoji',
    schema: z.object({
      guildId: guildIdSchema,
      emojiId: emojiIdSchema,
      name: z.string().trim().regex(/^[a-zA-Z0-9_]{2,32}$/).optional(),
      roles: z.array(roleIdSchema).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => emojiManager.editEmoji(args)
  });

  registry.register({
    name: 'get_emoji_info',
    title: 'Get Emoji Info',
    description: 'Retrieve metadata and image URL for a custom guild emoji.',
    category: 'emoji',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      emojiId: emojiIdSchema
    }),
    handler: async (args) => emojiManager.getEmojiInfo(args)
  });

  registry.register({
    name: 'list_emojis',
    title: 'List Emojis',
    description: 'List all custom emojis in a Discord guild.',
    category: 'emoji',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => emojiManager.listEmojis(guildId)
  });
}

