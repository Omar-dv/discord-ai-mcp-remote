/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { DISCORD_LIMITS, ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { registerSecretForRedaction } from '../../security/secret-redaction.js';
import { formatWebhook, formatMessage } from '../../utils/formatters.js';

export class WebhookManager {
  constructor({ discordClientManager, permissionService, messageManager, rateLimiter } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
    this.messageManager = messageManager;
    this.rateLimiter = rateLimiter;
  }

  async fetchGuildWebhookOrThrow(guild, webhookId) {
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageWebhooks']);
    const webhooks = await guild.fetchWebhooks();
    const webhook = webhooks.get(webhookId);

    if (!webhook) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Webhook "${webhookId}" was not found in guild "${guild.name}" (${guild.id}).`
      );
    }

    if (webhook.token) {
      registerSecretForRedaction(webhook.token);
    }

    return webhook;
  }

  async createWebhook({ guildId = null, channelId, name, avatar = undefined, reason = undefined }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.permissionService.ensureBotChannelPermissions(channel, ['ManageWebhooks']);

    if (typeof channel.createWebhook !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Channel "${channel.name || channel.id}" does not support webhooks.`
      );
    }

    const created = await channel.createWebhook({
      name,
      avatar,
      reason
    });

    if (created.token) {
      registerSecretForRedaction(created.token);
    }

    return formatWebhook(created);
  }

  async deleteWebhook({ guildId, webhookId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const webhook = await this.fetchGuildWebhookOrThrow(guild, webhookId);

    const snapshot = formatWebhook(webhook);
    await webhook.delete(reason);

    return {
      deleted: true,
      webhook: snapshot
    };
  }

  async editWebhook({
    guildId,
    webhookId,
    name = undefined,
    channelId = undefined,
    avatar = undefined,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const webhook = await this.fetchGuildWebhookOrThrow(guild, webhookId);

    const payload = { reason };
    if (name !== undefined) {
      payload.name = name;
    }
    if (channelId !== undefined) {
      payload.channel = channelId;
    }
    if (avatar !== undefined) {
      payload.avatar = avatar;
    }

    const updated = await webhook.edit(payload);
    if (updated.token) {
      registerSecretForRedaction(updated.token);
    }

    return formatWebhook(updated);
  }

  async getWebhookInfo({ guildId, webhookId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const webhook = await this.fetchGuildWebhookOrThrow(guild, webhookId);
    return formatWebhook(webhook);
  }

  async listWebhooks({ guildId, channelId = null }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageWebhooks']);

    let webhooksCollection;
    if (channelId) {
      const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
      if (typeof channel.fetchWebhooks !== 'function') {
        throw new AppError(
          ERROR_CODES.UNSUPPORTED_OPERATION,
          `Channel "${channel.id}" does not support webhooks.`
        );
      }
      webhooksCollection = await channel.fetchWebhooks();
    } else {
      webhooksCollection = await guild.fetchWebhooks();
    }

    const webhooks = Array.from(webhooksCollection.values()).map((wh) => {
      if (wh.token) {
        registerSecretForRedaction(wh.token);
      }
      return formatWebhook(wh);
    });

    return {
      guildId: guild.id,
      channelId: channelId || null,
      count: webhooks.length,
      webhooks
    };
  }

  async executeWebhook({
    guildId,
    webhookId,
    content = undefined,
    username = undefined,
    avatarUrl = undefined,
    embeds = [],
    threadId = undefined
  }) {
    this.rateLimiter?.consume('message', `webhook:${webhookId}`);
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const webhook = await this.fetchGuildWebhookOrThrow(guild, webhookId);

    if ((!content || content.trim().length === 0) && (!embeds || embeds.length === 0)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Webhook execution requires non-empty content or at least one embed.'
      );
    }

    if (content && content.length > DISCORD_LIMITS.MAX_MESSAGE_LENGTH) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Webhook message content cannot exceed ${DISCORD_LIMITS.MAX_MESSAGE_LENGTH} characters.`
      );
    }

    const builtEmbeds = Array.isArray(embeds)
      ? embeds.map((e) => this.messageManager.buildEmbedObject(e))
      : [];

    const sendPayload = {
      allowedMentions: { parse: ['users'] }
    };

    if (content) {
      sendPayload.content = content;
    }
    if (username) {
      sendPayload.username = username;
    }
    if (avatarUrl) {
      sendPayload.avatarURL = avatarUrl;
    }
    if (builtEmbeds.length > 0) {
      sendPayload.embeds = builtEmbeds;
    }
    if (threadId) {
      sendPayload.threadId = threadId;
    }

    const sentMessage = await webhook.send(sendPayload);
    return {
      executed: true,
      webhook: formatWebhook(webhook),
      message: formatMessage(sentMessage)
    };
  }
}

