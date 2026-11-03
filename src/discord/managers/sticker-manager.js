/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { DISCORD_LIMITS, ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { validateDataUriOrUrl } from '../../security/validation.js';
import { formatSticker } from '../../utils/formatters.js';

export class StickerManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  async fetchStickerOrThrow(guild, stickerId) {
    let sticker = guild.stickers?.cache?.get(stickerId) || null;
    if (!sticker && typeof guild.stickers?.fetch === 'function') {
      try {
        sticker = await guild.stickers.fetch(stickerId);
      } catch (error) {
        void error;
        sticker = null;
      }
    }

    if (!sticker) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Sticker "${stickerId}" was not found in guild "${guild.name}" (${guild.id}).`
      );
    }

    return sticker;
  }

  async createSticker({
    guildId,
    name,
    tags,
    description = '',
    file,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuildExpressions']);

    const validatedFile = validateDataUriOrUrl(
      file,
      DISCORD_LIMITS.MAX_STICKER_SIZE_BYTES,
      ['png', 'apng', 'gif']
    );

    const created = await guild.stickers.create({
      file: validatedFile,
      name,
      tags,
      description,
      reason
    });

    return formatSticker(created);
  }

  async deleteSticker({ guildId, stickerId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuildExpressions']);

    const sticker = await this.fetchStickerOrThrow(guild, stickerId);
    const snapshot = formatSticker(sticker);
    await sticker.delete(reason);

    return {
      deleted: true,
      sticker: snapshot
    };
  }

  async getStickerInfo({ guildId, stickerId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const sticker = await this.fetchStickerOrThrow(guild, stickerId);
    return formatSticker(sticker);
  }

  async listStickers(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const stickers = guild.stickers?.cache
      ? Array.from(guild.stickers.cache.values()).map((sticker) => formatSticker(sticker))
      : [];

    return {
      guildId: guild.id,
      count: stickers.length,
      stickers
    };
  }
}

