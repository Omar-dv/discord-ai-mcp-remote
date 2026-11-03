/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { EmbedBuilder, MessageFlags } from 'discord.js';
import { DISCORD_LIMITS, ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { parseHexColor } from '../../security/validation.js';
import { formatMessage, formatThread, formatUser } from '../../utils/formatters.js';

export class MessageManager {
  constructor({ discordClientManager, permissionService, rateLimiter } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
    this.rateLimiter = rateLimiter;
  }

  assertTextBasedChannel(channel) {
    const isTextBased =
      typeof channel.isTextBased === 'function'
        ? channel.isTextBased()
        : typeof channel.send === 'function' || Boolean(channel.messages);

    if (!isTextBased) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Channel "${channel.name || channel.id}" does not support text messages.`
      );
    }
  }

  buildEmbedObject(embedInput) {
    const builder = new EmbedBuilder();
    if (embedInput.title) {
      builder.setTitle(embedInput.title);
    }
    if (embedInput.description) {
      builder.setDescription(embedInput.description);
    }
    if (embedInput.url) {
      builder.setURL(embedInput.url);
    }
    if (embedInput.color !== undefined) {
      builder.setColor(parseHexColor(embedInput.color));
    }
    if (embedInput.timestamp) {
      builder.setTimestamp(new Date(embedInput.timestamp));
    }
    if (embedInput.footer?.text) {
      builder.setFooter({
        text: embedInput.footer.text,
        iconURL: embedInput.footer.iconUrl
      });
    }
    if (embedInput.author?.name) {
      builder.setAuthor({
        name: embedInput.author.name,
        url: embedInput.author.url,
        iconURL: embedInput.author.iconUrl
      });
    }
    if (embedInput.thumbnailUrl) {
      builder.setThumbnail(embedInput.thumbnailUrl);
    }
    if (embedInput.imageUrl) {
      builder.setImage(embedInput.imageUrl);
    }
    if (Array.isArray(embedInput.fields) && embedInput.fields.length > 0) {
      builder.addFields(
        embedInput.fields.map((f) => ({
          name: f.name,
          value: f.value,
          inline: Boolean(f.inline)
        }))
      );
    }
    return builder.toJSON();
  }

  async fetchMessageOrThrow(channel, messageId) {
    let message = channel.messages?.cache?.get(messageId) || null;
    if (!message && typeof channel.messages?.fetch === 'function') {
      try {
        message = await channel.messages.fetch(messageId);
      } catch (error) {
        void error;
        message = null;
      }
    }

    if (!message) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Message "${messageId}" was not found in channel "${channel.id}".`
      );
    }

    return message;
  }

  async sendMessage({
    guildId = null,
    channelId,
    content = undefined,
    embeds = [],
    allowedMentions = { parse: ['users'] },
    replyToMessageId = null,
    suppressEmbeds = false,
    suppressNotifications = false
  }) {
    this.rateLimiter?.consume('message', channelId);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, ['ViewChannel', 'SendMessages']);

    if ((!content || content.trim().length === 0) && (!embeds || embeds.length === 0)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Message must include non-empty content or at least one embed.'
      );
    }

    if (content && content.length > DISCORD_LIMITS.MAX_MESSAGE_LENGTH) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Message content exceeds Discord maximum length of ${DISCORD_LIMITS.MAX_MESSAGE_LENGTH} characters.`
      );
    }

    const builtEmbeds = Array.isArray(embeds)
      ? embeds.slice(0, DISCORD_LIMITS.MAX_EMBEDS_PER_MESSAGE).map((e) => this.buildEmbedObject(e))
      : [];

    if (builtEmbeds.length > 0) {
      this.permissionService.ensureBotChannelPermissions(channel, ['EmbedLinks']);
    }

    const payload = {
      allowedMentions: allowedMentions || { parse: ['users'] }
    };

    if (content) {
      payload.content = content;
    }
    if (builtEmbeds.length > 0) {
      payload.embeds = builtEmbeds;
    }
    if (replyToMessageId) {
      payload.reply = {
        messageReference: replyToMessageId,
        failIfNotExists: false
      };
    }

    const flags = [];
    if (suppressEmbeds) {
      flags.push(MessageFlags.SuppressEmbeds);
    }
    if (suppressNotifications) {
      flags.push(MessageFlags.SuppressNotifications);
    }
    if (flags.length > 0) {
      payload.flags = flags;
    }

    const sent = await channel.send(payload);
    return formatMessage(sent);
  }

  async sendEmbed({
    guildId = null,
    channelId,
    content = undefined,
    embed,
    allowedMentions = { parse: ['users'] }
  }) {
    return this.sendMessage({
      guildId,
      channelId,
      content,
      embeds: [embed],
      allowedMentions
    });
  }

  async editMessage({
    guildId = null,
    channelId,
    messageId,
    content = undefined,
    embeds = undefined,
    allowedMentions = { parse: ['users'] }
  }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    const message = await this.fetchMessageOrThrow(channel, messageId);

    const clientUser = this.discordClientManager.ensureReady().user;
    if (message.author?.id && clientUser?.id && message.author.id !== clientUser.id) {
      throw new AppError(
        ERROR_CODES.MISSING_PERMISSIONS,
        'Discord API only allows a bot to edit messages authored by the bot itself.'
      );
    }

    const editPayload = { allowedMentions };
    if (content !== undefined) {
      editPayload.content = content;
    }
    if (Array.isArray(embeds)) {
      editPayload.embeds = embeds.map((e) => this.buildEmbedObject(e));
    }

    const updated = await message.edit(editPayload);
    return formatMessage(updated);
  }

  async deleteMessage({ guildId = null, channelId, messageId, reason = undefined }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    const clientUser = this.discordClientManager.ensureReady().user;

    if (message.author?.id !== clientUser?.id) {
      this.permissionService.ensureBotChannelPermissions(channel, [
        'ViewChannel',
        'ManageMessages'
      ]);
    }

    const snapshot = formatMessage(message);
    await message.delete();
    void reason;

    return {
      deleted: true,
      message: snapshot
    };
  }

  async bulkDeleteMessages({
    guildId = null,
    channelId,
    count = null,
    messageIds = null,
    filterOld = true
  }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ReadMessageHistory',
      'ManageMessages'
    ]);

    if (typeof channel.bulkDelete !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Channel "${channel.id}" does not support bulk message deletion.`
      );
    }

    let targetArgument;
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      if (
        messageIds.length < DISCORD_LIMITS.MIN_BULK_DELETE_COUNT ||
        messageIds.length > DISCORD_LIMITS.MAX_BULK_DELETE_COUNT
      ) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          `bulk_delete_messages requires between ${DISCORD_LIMITS.MIN_BULK_DELETE_COUNT} and ${DISCORD_LIMITS.MAX_BULK_DELETE_COUNT} message IDs.`
        );
      }
      targetArgument = messageIds;
    } else if (count !== null && count !== undefined) {
      if (
        count < DISCORD_LIMITS.MIN_BULK_DELETE_COUNT ||
        count > DISCORD_LIMITS.MAX_BULK_DELETE_COUNT
      ) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          `bulk_delete_messages count must be between ${DISCORD_LIMITS.MIN_BULK_DELETE_COUNT} and ${DISCORD_LIMITS.MAX_BULK_DELETE_COUNT}.`
        );
      }
      targetArgument = count;
    } else {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Provide either count (2-100) or messageIds (2-100 IDs) for bulk_delete_messages.'
      );
    }

    const deletedCollection = await channel.bulkDelete(targetArgument, filterOld);
    const deletedIds = deletedCollection ? Array.from(deletedCollection.keys()) : [];

    return {
      channelId: channel.id,
      deletedCount: deletedIds.length,
      deletedMessageIds: deletedIds
    };
  }

  async getMessage({ guildId = null, channelId, messageId }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ReadMessageHistory'
    ]);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    return formatMessage(message);
  }

  async getChannelMessages({
    guildId = null,
    channelId,
    limit = 25,
    before = undefined,
    after = undefined,
    around = undefined
  }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ReadMessageHistory'
    ]);

    const clampedLimit = Math.min(
      DISCORD_LIMITS.MAX_MESSAGE_FETCH_LIMIT,
      Math.max(1, Number(limit) || 25)
    );

    const fetchOptions = { limit: clampedLimit };
    if (before) {
      fetchOptions.before = before;
    }
    if (after) {
      fetchOptions.after = after;
    }
    if (around) {
      fetchOptions.around = around;
    }

    const messagesCollection = await channel.messages.fetch(fetchOptions);
    const messages = Array.from(messagesCollection.values()).map((msg) => formatMessage(msg));

    return {
      channelId: channel.id,
      count: messages.length,
      messages
    };
  }

  async searchMessages({
    guildId = null,
    channelId,
    query = '',
    authorId = null,
    hasAttachments = null,
    limit = 50
  }) {
    const { messages } = await this.getChannelMessages({
      guildId,
      channelId,
      limit: Math.min(100, Math.max(1, Number(limit) || 50))
    });

    const needle = query ? query.trim().toLowerCase() : '';
    const filtered = messages.filter((msg) => {
      if (needle && !msg.content.toLowerCase().includes(needle)) {
        return false;
      }
      if (authorId && msg.author?.id !== authorId) {
        return false;
      }
      if (typeof hasAttachments === 'boolean') {
        const hasAtt = msg.attachments.length > 0;
        if (hasAtt !== hasAttachments) {
          return false;
        }
      }
      return true;
    });

    return {
      channelId,
      query: query || null,
      authorId: authorId || null,
      scannedCount: messages.length,
      matchedCount: filtered.length,
      messages: filtered
    };
  }

  async pinMessage({ guildId = null, channelId, messageId, reason = undefined }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ManageMessages'
    ]);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    await message.pin(reason);

    return {
      pinned: true,
      messageId: message.id,
      channelId: channel.id
    };
  }

  async unpinMessage({ guildId = null, channelId, messageId, reason = undefined }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ManageMessages'
    ]);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    await message.unpin(reason);

    return {
      unpinned: true,
      messageId: message.id,
      channelId: channel.id
    };
  }

  async addReaction({ guildId = null, channelId, messageId, emoji }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ReadMessageHistory',
      'AddReactions'
    ]);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    await message.react(emoji);

    return {
      reacted: true,
      channelId: channel.id,
      messageId: message.id,
      emoji
    };
  }

  async removeReaction({ guildId = null, channelId, messageId, emoji, userId = null }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    const clientUser = this.discordClientManager.ensureReady().user;
    const targetUserId = userId || clientUser?.id;

    if (targetUserId !== clientUser?.id) {
      this.permissionService.ensureBotChannelPermissions(channel, [
        'ViewChannel',
        'ManageMessages'
      ]);
    }

    const reaction = message.reactions?.resolve?.(emoji) || message.reactions?.cache?.get(emoji);
    if (!reaction) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Reaction "${emoji}" was not found on message "${messageId}".`
      );
    }

    await reaction.users.remove(targetUserId);

    return {
      removed: true,
      channelId: channel.id,
      messageId: message.id,
      emoji,
      userId: targetUserId
    };
  }

  async getMessageReactions({ guildId = null, channelId, messageId, emoji = null }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ReadMessageHistory'
    ]);

    const message = await this.fetchMessageOrThrow(channel, messageId);

    if (emoji) {
      const reaction = message.reactions?.resolve?.(emoji) || message.reactions?.cache?.get(emoji);
      if (!reaction) {
        return {
          channelId: channel.id,
          messageId: message.id,
          emoji,
          count: 0,
          users: []
        };
      }
      const usersCollection = await reaction.users.fetch({ limit: 100 });
      const users = Array.from(usersCollection.values()).map((u) => formatUser(u));
      return {
        channelId: channel.id,
        messageId: message.id,
        emoji,
        count: reaction.count ?? users.length,
        users
      };
    }

    const reactions = message.reactions?.cache
      ? Array.from(message.reactions.cache.values()).map((r) => ({
          emoji: r.emoji?.id ? `${r.emoji.name}:${r.emoji.id}` : r.emoji?.name ?? '',
          count: r.count ?? 0,
          me: Boolean(r.me)
        }))
      : [];

    return {
      channelId: channel.id,
      messageId: message.id,
      reactionsCount: reactions.length,
      reactions
    };
  }

  async crosspostMessage({ guildId = null, channelId, messageId }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'SendMessages',
      'ManageMessages'
    ]);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    if (typeof message.crosspost !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        'Crossposting is only supported for messages in Announcement channels.'
      );
    }

    const crossposted = await message.crosspost();
    return formatMessage(crossposted);
  }

  async createMessageThread({
    guildId = null,
    channelId,
    messageId,
    name,
    autoArchiveDuration = 1440,
    rateLimitPerUser = 0,
    reason = undefined
  }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertTextBasedChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'CreatePublicThreads'
    ]);

    const message = await this.fetchMessageOrThrow(channel, messageId);
    if (typeof message.startThread !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Message "${messageId}" in channel "${channel.id}" does not support starting a thread.`
      );
    }

    const thread = await message.startThread({
      name,
      autoArchiveDuration,
      rateLimitPerUser,
      reason
    });

    return formatThread(thread);
  }

  async replyToMessage({
    guildId = null,
    channelId,
    messageId,
    content = undefined,
    embeds = [],
    allowedMentions = { parse: ['users'], repliedUser: true }
  }) {
    return this.sendMessage({
      guildId,
      channelId,
      content,
      embeds,
      allowedMentions,
      replyToMessageId: messageId
    });
  }
}

