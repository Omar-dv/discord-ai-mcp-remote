/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { formatInvite } from '../../utils/formatters.js';

export class InviteManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  async createInvite({
    guildId = null,
    channelId,
    maxAge = 86400,
    maxUses = 0,
    temporary = false,
    unique = false,
    reason = undefined
  }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.permissionService.ensureBotChannelPermissions(channel, ['CreateInstantInvite']);

    if (typeof channel.createInvite !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Channel "${channel.name || channel.id}" does not support creating invites.`
      );
    }

    const invite = await channel.createInvite({
      maxAge,
      maxUses,
      temporary,
      unique,
      reason
    });

    return formatInvite(invite);
  }

  async deleteInvite({ guildId, code, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);

    const invites = await guild.invites.fetch();
    const invite = invites.get(code);
    if (!invite) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Invite code "${code}" was not found in guild "${guild.name}".`
      );
    }

    const snapshot = formatInvite(invite);
    await invite.delete(reason);

    return {
      deleted: true,
      invite: snapshot
    };
  }

  async getInviteInfo({ code }) {
    const client = this.discordClientManager.ensureReady();
    try {
      const invite = await client.fetchInvite(code);
      return formatInvite(invite);
    } catch {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Invite "${code}" was not found or has expired.`
      );
    }
  }

  async listGuildInvites({ guildId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);

    const invitesCollection = await guild.invites.fetch();
    const invites = Array.from(invitesCollection.values()).map((inv) => formatInvite(inv));

    return {
      guildId: guild.id,
      count: invites.length,
      invites
    };
  }

  async listChannelInvites({ guildId = null, channelId }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.permissionService.ensureBotChannelPermissions(channel, ['ManageChannels']);

    if (!channel.invites || typeof channel.invites.fetch !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Channel "${channel.id}" does not support listing invites.`
      );
    }

    const invitesCollection = await channel.invites.fetch();
    const invites = Array.from(invitesCollection.values()).map((inv) => formatInvite(inv));

    return {
      channelId: channel.id,
      count: invites.length,
      invites
    };
  }
}

