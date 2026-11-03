/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  guildIdSchema,
  stickerIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerStickerTools(registry, { stickerManager }) {
  registry.register({
    name: 'create_sticker',
    title: 'Create Sticker',
    description: 'Create a custom sticker in a Discord guild (validates format and 512 KB limit).',
    category: 'sticker',
    schema: z.object({
      guildId: guildIdSchema,
      name: z.string().trim().min(2).max(30),
      tags: z.string().trim().min(1).max(200).describe('Autocomplete/related emoji tag for the sticker'),
      description: z.string().trim().max(100).optional(),
      file: z.string().trim().min(1).describe('Sticker image URL or data:image/(png|apng|gif);base64,... string'),
      reason: reasonSchema
    }),
    handler: async (args) => stickerManager.createSticker(args)
  });

  registry.register({
    name: 'delete_sticker',
    title: 'Delete Sticker',
    description: 'Delete a custom sticker from a Discord guild (destructive operation requiring confirmation).',
    category: 'sticker',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      stickerId: stickerIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => stickerManager.deleteSticker(args)
  });

  registry.register({
    name: 'get_sticker_info',
    title: 'Get Sticker Info',
    description: 'Retrieve metadata and asset URL for a custom guild sticker.',
    category: 'sticker',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      stickerId: stickerIdSchema
    }),
    handler: async (args) => stickerManager.getStickerInfo(args)
  });

  registry.register({
    name: 'list_stickers',
    title: 'List Stickers',
    description: 'List all custom stickers in a Discord guild.',
    category: 'sticker',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => stickerManager.listStickers(guildId)
  });
}

