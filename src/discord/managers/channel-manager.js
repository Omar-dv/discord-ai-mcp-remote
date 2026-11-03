/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ChannelType, OverwriteType } from 'discord.js';
import { ERROR_CODES } from '../../core/constants.js';
import { CHANNEL_TYPE_MAP, CHANNEL_TYPE_NAMES } from '../../types/index.js';
import { AppError } from '../../utils/errors.js';
import { formatChannel, formatPermissionOverwrites } from '../../utils/formatters.js';

export class ChannelManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  resolveChannelType(typeInput = 'text') {
    if (typeof typeInput === 'number') {
      return typeInput;
    }
    const normalized = String(typeInput).trim().toLowerCase();
    const mapped = CHANNEL_TYPE_MAP[normalized];
    if (mapped === undefined) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Unsupported channel type "${typeInput}". Supported types: ${Object.keys(CHANNEL_TYPE_MAP).join(', ')}.`
      );
    }
    return mapped;
  }

  async createChannel({
    guildId,
    name,
    type = 'text',
    parentId = null,
    topic = null,
    nsfw = false,
    rateLimitPerUser = 0,
    bitrate = null,
    userLimit = null,
    position = null,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);

    const resolvedType = this.resolveChannelType(type);
    const createPayload = {
      name,
      type: resolvedType,
      reason
    };

    if (parentId) {
      createPayload.parent = parentId;
    }
    if (topic !== null && topic !== undefined) {
      createPayload.topic = topic;
    }
    if (typeof nsfw === 'boolean') {
      createPayload.nsfw = nsfw;
    }
    if (rateLimitPerUser !== null && rateLimitPerUser !== undefined) {
      createPayload.rateLimitPerUser = rateLimitPerUser;
    }
    if (bitrate !== null && bitrate !== undefined) {
      createPayload.bitrate = bitrate;
    }
    if (userLimit !== null && userLimit !== undefined) {
      createPayload.userLimit = userLimit;
    }
    if (position !== null && position !== undefined) {
      createPayload.position = position;
    }

    const created = await guild.channels.create(createPayload);
    return formatChannel(created);
  }

  async deleteChannel({ guildId, channelId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const snapshot = formatChannel(channel);
    await channel.delete(reason);

    return {
      deleted: true,
      channel: snapshot
    };
  }

  async editChannel({
    guildId,
    channelId,
    name,
    topic,
    nsfw,
    rateLimitPerUser,
    parentId,
    position,
    bitrate,
    userLimit,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const updatePayload = { reason };
    if (name !== undefined) {
      updatePayload.name = name;
    }
    if (topic !== undefined) {
      updatePayload.topic = topic;
    }
    if (nsfw !== undefined) {
      updatePayload.nsfw = nsfw;
    }
    if (rateLimitPerUser !== undefined) {
      updatePayload.rateLimitPerUser = rateLimitPerUser;
    }
    if (parentId !== undefined) {
      updatePayload.parent = parentId;
    }
    if (position !== undefined) {
      updatePayload.position = position;
    }
    if (bitrate !== undefined) {
      updatePayload.bitrate = bitrate;
    }
    if (userLimit !== undefined) {
      updatePayload.userLimit = userLimit;
    }

    const updated = await channel.edit(updatePayload);
    return formatChannel(updated);
  }

  async getChannelInfo({ guildId = null, channelId }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    return {
      ...formatChannel(channel),
      permissionOverwrites: formatPermissionOverwrites(channel)
    };
  }

  async listChannels({ guildId, type = null }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    let channels = guild.channels?.cache
      ? Array.from(guild.channels.cache.values())
      : [];

    if (type) {
      const targetType = this.resolveChannelType(type);
      channels = channels.filter((ch) => ch.type === targetType);
    }

    const formatted = channels
      .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
      .map((ch) => formatChannel(ch));

    return {
      guildId: guild.id,
      filterType: type || null,
      count: formatted.length,
      channels: formatted
    };
  }

  async cloneChannel({ guildId, channelId, name = undefined, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    if (typeof channel.clone !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Channel "${channel.name}" (${channel.id}) of type "${CHANNEL_TYPE_NAMES[channel.type]}" does not support cloning.`
      );
    }

    const cloned = await channel.clone({ name, reason });
    return formatChannel(cloned);
  }

  async moveChannel({ guildId, channelId, parentId = null, position = undefined, lockPermissions = false, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const editData = { parent: parentId, lockPermissions, reason };
    if (position !== undefined) {
      editData.position = position;
    }

    const updated = await channel.edit(editData);
    return formatChannel(updated);
  }

  async setChannelPosition({ guildId, channelId, position, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const updated =
      typeof channel.setPosition === 'function'
        ? await channel.setPosition(position, { reason })
        : await channel.edit({ position, reason });
    return formatChannel(updated);
  }

  async setChannelTopic({ guildId, channelId, topic, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const updated =
      typeof channel.setTopic === 'function'
        ? await channel.setTopic(topic, reason)
        : await channel.edit({ topic, reason });
    return formatChannel(updated);
  }

  async setChannelName({ guildId, channelId, name, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const updated =
      typeof channel.setName === 'function'
        ? await channel.setName(name, reason)
        : await channel.edit({ name, reason });
    return formatChannel(updated);
  }

  async setChannelSlowmode({ guildId, channelId, seconds, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const updated =
      typeof channel.setRateLimitPerUser === 'function'
        ? await channel.setRateLimitPerUser(seconds, reason)
        : await channel.edit({ rateLimitPerUser: seconds, reason });
    return formatChannel(updated);
  }

  async setChannelNsfw({ guildId, channelId, nsfw, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const updated =
      typeof channel.setNSFW === 'function'
        ? await channel.setNSFW(nsfw, reason)
        : await channel.edit({ nsfw, reason });
    return formatChannel(updated);
  }

  async getChannelPermissions({ guildId, channelId }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    return {
      channelId: channel.id,
      channelName: channel.name ?? null,
      guildId: channel.guildId ?? channel.guild?.id ?? null,
      overwrites: formatPermissionOverwrites(channel)
    };
  }

  async setChannelPermissions({ guildId, channelId, overwrites = [], reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels', 'ManageRoles']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const normalizedOverwrites = overwrites.map((item) => {
      const allowNames = item.allow
        ? this.permissionService.resolvePermissionNameList(item.allow).names
        : [];
      const denyNames = item.deny
        ? this.permissionService.resolvePermissionNameList(item.deny).names
        : [];

      this.permissionService.ensureNoPrivilegeEscalation(guild, [...allowNames, ...denyNames]);

      return {
        id: item.targetId,
        type: item.targetType === 'member' ? OverwriteType.Member : OverwriteType.Role,
        allow: allowNames,
        deny: denyNames
      };
    });

    await channel.permissionOverwrites.set(normalizedOverwrites, reason);
    return this.getChannelPermissions({ guildId, channelId });
  }

  async upsertChannelPermission({
    guildId,
    channelId,
    targetId,
    allow = [],
    deny = [],
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels', 'ManageRoles']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    const allowNames = this.permissionService.resolvePermissionNameList(allow).names;
    const denyNames = this.permissionService.resolvePermissionNameList(deny).names;

    this.permissionService.ensureNoPrivilegeEscalation(guild, [...allowNames, ...denyNames]);

    const permissionChanges = {};
    for (const perm of allowNames) {
      permissionChanges[perm] = true;
    }
    for (const perm of denyNames) {
      permissionChanges[perm] = false;
    }

    await channel.permissionOverwrites.edit(targetId, permissionChanges, { reason });
    return this.getChannelPermissions({ guildId, channelId });
  }

  async removeChannelPermission({ guildId, channelId, targetId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels', 'ManageRoles']);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);

    await channel.permissionOverwrites.delete(targetId, reason);
    return this.getChannelPermissions({ guildId, channelId });
  }

  async createCategory({ guildId, name, position = undefined, reason = undefined }) {
    return this.createChannel({
      guildId,
      name,
      type: 'category',
      position,
      reason
    });
  }

  async getCategoryChannels({ guildId, categoryId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const category = await this.discordClientManager.getChannelOrThrow(categoryId, guildId);

    if (category.type !== ChannelType.GuildCategory) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Channel "${category.name}" (${category.id}) is not a category channel.`
      );
    }

    const children = guild.channels?.cache
      ? Array.from(guild.channels.cache.values())
          .filter((ch) => ch.parentId === category.id)
          .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
          .map((ch) => formatChannel(ch))
      : [];

    return {
      guildId: guild.id,
      category: formatChannel(category),
      count: children.length,
      channels: children
    };
  }
}

