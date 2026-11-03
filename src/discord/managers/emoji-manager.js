/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { DISCORD_LIMITS, ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { validateDataUriOrUrl } from '../../security/validation.js';
import { formatEmoji } from '../../utils/formatters.js';

export class EmojiManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  async fetchEmojiOrThrow(guild, emojiId) {
    let emoji = guild.emojis?.cache?.get(emojiId) || null;
    if (!emoji && typeof guild.emojis?.fetch === 'function') {
      try {
        emoji = await guild.emojis.fetch(emojiId);
      } catch (error) {
        void error;
        emoji = null;
      }
    }

    if (!emoji) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Emoji "${emojiId}" was not found in guild "${guild.name}" (${guild.id}).`
      );
    }

    return emoji;
  }

  async createEmoji({ guildId, name, image, roles = [], reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuildExpressions']);

    const attachment = validateDataUriOrUrl(
      image,
      DISCORD_LIMITS.MAX_EMOJI_SIZE_BYTES,
      ['png', 'jpg', 'jpeg', 'gif', 'webp']
    );

    const created = await guild.emojis.create({
      attachment,
      name,
      roles,
      reason
    });

    return formatEmoji(created);
  }

  async deleteEmoji({ guildId, emojiId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuildExpressions']);

    const emoji = await this.fetchEmojiOrThrow(guild, emojiId);
    const snapshot = formatEmoji(emoji);
    await emoji.delete(reason);

    return {
      deleted: true,
      emoji: snapshot
    };
  }

  async editEmoji({ guildId, emojiId, name, roles, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuildExpressions']);

    const emoji = await this.fetchEmojiOrThrow(guild, emojiId);
    const editPayload = { reason };
    if (name !== undefined) {
      editPayload.name = name;
    }
    if (roles !== undefined) {
      editPayload.roles = roles;
    }

    const updated = await emoji.edit(editPayload);
    return formatEmoji(updated);
  }

  async getEmojiInfo({ guildId, emojiId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const emoji = await this.fetchEmojiOrThrow(guild, emojiId);
    return formatEmoji(emoji);
  }

  async listEmojis(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const emojis = guild.emojis?.cache
      ? Array.from(guild.emojis.cache.values()).map((emoji) => formatEmoji(emoji))
      : [];

    return {
      guildId: guild.id,
      count: emojis.length,
      emojis
    };
  }
}

