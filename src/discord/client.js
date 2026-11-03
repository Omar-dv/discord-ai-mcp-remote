/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { Client, Partials } from 'discord.js';
import { ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';
import { assertValidSnowflake } from '../security/validation.js';
import { registerDiscordEvents } from './events/index.js';

export class DiscordClientManager {
  constructor({ config, logger, clientInstance = null } = {}) {
    this.config = config;
    this.logger = logger;
    this.startedAt = Date.now();
    this.connectionState = 'disconnected';
    this.lastError = null;

    if (clientInstance) {
      this.client = clientInstance;
      this.connectionState = clientInstance.isReady?.() ? 'ready' : 'initialized';
    } else {
      this.client = new Client({
        intents: config?.gatewayIntents || [],
        partials: [
          Partials.Channel,
          Partials.Message,
          Partials.Reaction,
          Partials.GuildMember,
          Partials.User
        ]
      });
      registerDiscordEvents(this.client, this.logger);
    }
  }

  isReady() {
    if (!this.client) {
      return false;
    }
    if (typeof this.client.isReady === 'function') {
      return Boolean(this.client.isReady());
    }
    return this.connectionState === 'ready';
  }

  ensureReady() {
    if (!this.isReady()) {
      throw new AppError(
        ERROR_CODES.BOT_NOT_READY,
        `Discord bot client is not connected or ready (state: "${this.connectionState}"). Verify DISCORD_TOKEN and network connectivity.`,
        {
          connectionState: this.connectionState,
          lastError: this.lastError
        }
      );
    }
    return this.client;
  }

  async connect() {
    if (this.isReady()) {
      this.connectionState = 'ready';
      return this.client;
    }

    if (!this.config?.isTokenConfigured) {
      this.connectionState = 'unconfigured';
      throw new AppError(
        ERROR_CODES.CONFIGURATION_ERROR,
        'Cannot connect to Discord Gateway: DISCORD_TOKEN is not configured.'
      );
    }

    this.connectionState = 'connecting';
    try {
      await this.client.login(this.config.discordToken);
      this.connectionState = 'ready';
      this.lastError = null;
      return this.client;
    } catch (error) {
      this.connectionState = 'error';
      this.lastError = error?.message || 'Failed to authenticate with Discord.';
      this.logger?.error({ error }, 'Failed to connect Discord client');
      throw new AppError(
        ERROR_CODES.CONFIGURATION_ERROR,
        'Failed to authenticate with Discord Gateway. Verify that DISCORD_TOKEN is valid and privileged intents are enabled in the Discord Developer Portal.'
      );
    }
  }

  async disconnect() {
    if (!this.client) {
      return;
    }
    try {
      if (typeof this.client.destroy === 'function') {
        await this.client.destroy();
      }
      this.connectionState = 'disconnected';
      this.logger?.info('Discord client disconnected cleanly');
    } catch (error) {
      this.logger?.warn({ error }, 'Error while disconnecting Discord client');
    }
  }

  async getGuildOrThrow(guildId) {
    assertValidSnowflake(guildId, ERROR_CODES.INVALID_GUILD_ID, 'guildId');
    const client = this.ensureReady();

    let guild = client.guilds?.cache?.get(guildId) || null;
    if (!guild && typeof client.guilds?.fetch === 'function') {
      try {
        guild = await client.guilds.fetch(guildId);
      } catch {
        guild = null;
      }
    }

    if (!guild) {
      throw new AppError(
        ERROR_CODES.INVALID_GUILD_ID,
        `Guild "${guildId}" was not found or the bot is not a member of this server.`
      );
    }

    return guild;
  }

  async getChannelOrThrow(channelId, expectedGuildId = null) {
    assertValidSnowflake(channelId, ERROR_CODES.INVALID_CHANNEL_ID, 'channelId');
    const client = this.ensureReady();

    let channel = client.channels?.cache?.get(channelId) || null;
    if (!channel && typeof client.channels?.fetch === 'function') {
      try {
        channel = await client.channels.fetch(channelId);
      } catch {
        channel = null;
      }
    }

    if (!channel) {
      throw new AppError(
        ERROR_CODES.INVALID_CHANNEL_ID,
        `Channel "${channelId}" was not found or the bot lacks access.`
      );
    }

    if (expectedGuildId) {
      assertValidSnowflake(expectedGuildId, ERROR_CODES.INVALID_GUILD_ID, 'guildId');
      const actualGuildId = channel.guildId ?? channel.guild?.id;
      if (actualGuildId !== expectedGuildId) {
        throw new AppError(
          ERROR_CODES.INVALID_CHANNEL_ID,
          `Channel "${channelId}" does not belong to guild "${expectedGuildId}".`
        );
      }
    }

    return channel;
  }

  async getRoleOrThrow(guild, roleId) {
    assertValidSnowflake(roleId, ERROR_CODES.INVALID_ROLE_ID, 'roleId');

    let role = guild.roles?.cache?.get(roleId) || null;
    if (!role && typeof guild.roles?.fetch === 'function') {
      try {
        role = await guild.roles.fetch(roleId);
      } catch {
        role = null;
      }
    }

    if (!role) {
      throw new AppError(
        ERROR_CODES.INVALID_ROLE_ID,
        `Role "${roleId}" was not found in guild "${guild.name}" (${guild.id}).`
      );
    }

    return role;
  }

  async getMemberOrThrow(guild, userId) {
    assertValidSnowflake(userId, ERROR_CODES.INVALID_USER_ID, 'userId');

    let member = guild.members?.cache?.get(userId) || null;
    if (!member && typeof guild.members?.fetch === 'function') {
      try {
        member = await guild.members.fetch(userId);
      } catch {
        member = null;
      }
    }

    if (!member) {
      throw new AppError(
        ERROR_CODES.INVALID_USER_ID,
        `Member "${userId}" was not found in guild "${guild.name}" (${guild.id}).`
      );
    }

    return member;
  }
}

