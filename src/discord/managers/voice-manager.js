/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ChannelType, Routes } from 'discord.js';
import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { formatChannel, formatMember, formatVoiceState } from '../../utils/formatters.js';

export class VoiceManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  assertVoiceChannel(channel) {
    if (
      channel.type !== ChannelType.GuildVoice &&
      channel.type !== ChannelType.GuildStageVoice
    ) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Channel "${channel.name}" (${channel.id}) is not a voice or stage channel.`
      );
    }
  }

  async getVoiceChannels(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const voiceChannels = guild.channels?.cache
      ? Array.from(guild.channels.cache.values())
          .filter(
            (ch) =>
              ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice
          )
          .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
          .map((ch) => ({
            ...formatChannel(ch),
            connectedMembersCount: ch.members?.size ?? 0
          }))
      : [];

    return {
      guildId: guild.id,
      count: voiceChannels.length,
      voiceChannels
    };
  }

  async getVoiceChannelMembers({ guildId, channelId }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertVoiceChannel(channel);

    const members = channel.members
      ? Array.from(channel.members.values()).map((member) => ({
          member: formatMember(member),
          voiceState: formatVoiceState(member.voice)
        }))
      : [];

    return {
      guildId: channel.guildId ?? guildId,
      channelId: channel.id,
      channelName: channel.name,
      count: members.length,
      members
    };
  }

  async getMemberVoiceState({ guildId, userId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);

    return {
      guildId: guild.id,
      userId: member.id,
      connected: Boolean(member.voice?.channelId),
      voiceState: formatVoiceState(member.voice)
    };
  }

  async moveMemberToVoiceChannel({ guildId, userId, targetChannelId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['MoveMembers']);

    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    if (!member.voice?.channelId) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Member "${member.user?.tag || userId}" is not currently connected to a voice channel.`
      );
    }

    const targetChannel = await this.discordClientManager.getChannelOrThrow(
      targetChannelId,
      guildId
    );
    this.assertVoiceChannel(targetChannel);
    this.permissionService.ensureBotChannelPermissions(targetChannel, ['Connect', 'MoveMembers']);

    const updatedMember = await member.voice.setChannel(targetChannel, reason);
    return {
      moved: true,
      userId: member.id,
      targetChannelId: targetChannel.id,
      voiceState: formatVoiceState(updatedMember.voice)
    };
  }

  async disconnectMemberFromVoice({ guildId, userId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['MoveMembers']);

    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    if (!member.voice?.channelId) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Member "${member.user?.tag || userId}" is not currently connected to any voice channel.`
      );
    }

    const previousChannelId = member.voice.channelId;
    await member.voice.disconnect(reason);

    return {
      disconnected: true,
      userId: member.id,
      previousChannelId
    };
  }

  async editVoiceChannel({
    guildId,
    channelId,
    name,
    bitrate,
    userLimit,
    rtcRegion,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);

    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertVoiceChannel(channel);

    const payload = { reason };
    if (name !== undefined) {
      payload.name = name;
    }
    if (bitrate !== undefined) {
      payload.bitrate = bitrate;
    }
    if (userLimit !== undefined) {
      payload.userLimit = userLimit;
    }
    if (rtcRegion !== undefined) {
      payload.rtcRegion = rtcRegion;
    }

    const updated = await channel.edit(payload);
    return formatChannel(updated);
  }

  async setVoiceChannelStatus({ guildId, channelId, status }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertVoiceChannel(channel);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'SetVoiceChannelStatus'
    ]);

    const client = this.discordClientManager.ensureReady();
    if (client.rest && typeof client.rest.put === 'function') {
      await client.rest.put(`/channels/${channel.id}/voice-status`, {
        body: { status: status || '' }
      });
    } else if (typeof channel.setStatus === 'function') {
      await channel.setStatus(status || '');
    } else {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        'Discord REST client does not support setting voice channel status in the current environment.'
      );
    }

    void Routes;

    return {
      guildId: guild.id,
      channelId: channel.id,
      status: status || ''
    };
  }

  async setVoiceChannelUserLimit({ guildId, channelId, userLimit, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);

    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertVoiceChannel(channel);

    const updated =
      typeof channel.setUserLimit === 'function'
        ? await channel.setUserLimit(userLimit, reason)
        : await channel.edit({ userLimit, reason });

    return formatChannel(updated);
  }

  async setVoiceChannelBitrate({ guildId, channelId, bitrate, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageChannels']);

    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.assertVoiceChannel(channel);

    const updated =
      typeof channel.setBitrate === 'function'
        ? await channel.setBitrate(bitrate, reason)
        : await channel.edit({ bitrate, reason });

    return formatChannel(updated);
  }
}

