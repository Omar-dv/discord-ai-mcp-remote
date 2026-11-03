/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { GatewayIntentBits } from 'discord.js';
import { DISCORD_LIMITS, ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { formatMember, formatUser, formatIsoTimestamp } from '../../utils/formatters.js';

export class MemberManager {
  constructor({
    discordClientManager,
    permissionService,
    moderationService,
    roleManager,
    voiceManager,
    config
  } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
    this.moderationService = moderationService;
    this.roleManager = roleManager;
    this.voiceManager = voiceManager;
    this.config = config;
  }

  async getMemberInfo({ guildId, userId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    return formatMember(member);
  }

  async getMemberProfile({ guildId, userId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);

    let fullUser = member.user;
    if (fullUser && typeof fullUser.fetch === 'function') {
      try {
        fullUser = await fullUser.fetch(true);
      } catch (error) {
        void error;
      }
    }

    return {
      member: formatMember(member),
      userProfile: formatUser(fullUser),
      flags: fullUser?.flags?.toArray ? fullUser.flags.toArray() : []
    };
  }

  async listGuildMembers({ guildId, limit = 100 }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const clampedLimit = Math.min(
      DISCORD_LIMITS.MAX_MEMBER_LIST_LIMIT,
      Math.max(1, Number(limit) || 100)
    );

    let membersCollection = guild.members?.cache;
    if (
      typeof guild.members?.list === 'function' &&
      (!membersCollection || membersCollection.size < clampedLimit)
    ) {
      try {
        membersCollection = await guild.members.list({ limit: clampedLimit });
      } catch (error) {
        void error;
      }
    }

    const members = membersCollection
      ? Array.from(membersCollection.values())
          .slice(0, clampedLimit)
          .map((m) => formatMember(m))
      : [];

    const hasMembersIntent = this.config?.gatewayIntents?.includes(GatewayIntentBits.GuildMembers);

    return {
      guildId: guild.id,
      count: members.length,
      guildMembersIntentEnabled: Boolean(hasMembersIntent),
      members
    };
  }

  async searchGuildMembers({ guildId, query, limit = 25 }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const clampedLimit = Math.min(100, Math.max(1, Number(limit) || 25));

    if (typeof guild.members?.search === 'function') {
      try {
        const searched = await guild.members.search({ query, limit: clampedLimit });
        const results = Array.from(searched.values()).map((m) => formatMember(m));
        return {
          guildId: guild.id,
          query,
          count: results.length,
          members: results
        };
      } catch (error) {
        void error;
      }
    }

    const needle = query.trim().toLowerCase();
    const cachedMatches = guild.members?.cache
      ? Array.from(guild.members.cache.values())
          .filter(
            (m) =>
              m.displayName?.toLowerCase().includes(needle) ||
              m.user?.username?.toLowerCase().includes(needle) ||
              m.nickname?.toLowerCase().includes(needle) ||
              m.id === needle
          )
          .slice(0, clampedLimit)
          .map((m) => formatMember(m))
      : [];

    return {
      guildId: guild.id,
      query,
      count: cachedMatches.length,
      members: cachedMatches
    };
  }

  async getMemberPermissions({ guildId, userId, channelId = null }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);

    const guildPermissions = member.permissions?.toArray ? member.permissions.toArray() : [];
    let channelPermissions = null;

    if (channelId) {
      const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
      channelPermissions =
        typeof channel.permissionsFor === 'function'
          ? channel.permissionsFor(member)?.toArray() ?? []
          : guildPermissions;
    }

    return {
      guildId: guild.id,
      userId: member.id,
      isOwner: guild.ownerId === member.id,
      guildPermissions,
      channelId: channelId || null,
      channelPermissions
    };
  }

  async getMemberRoles({ guildId, userId }) {
    return this.roleManager.getMemberRoles({ guildId, userId });
  }

  async getMemberVoiceState({ guildId, userId }) {
    return this.voiceManager.getMemberVoiceState({ guildId, userId });
  }

  async assignRoleToMember({ guildId, userId, roleId, reason = undefined }) {
    return this.roleManager.assignRole({ guildId, userId, roleId, reason });
  }

  async removeRoleFromMember({ guildId, userId, roleId, reason = undefined }) {
    return this.roleManager.removeRole({ guildId, userId, roleId, reason });
  }

  async editMemberNickname({ guildId, userId, nickname, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    const me = this.permissionService.getBotMember(guild);

    if (member.id === me.id) {
      this.permissionService.ensureBotGuildPermissions(guild, ['ChangeNickname']);
    } else {
      this.permissionService.ensureBotGuildPermissions(guild, ['ManageNicknames']);
      this.permissionService.ensureMemberHierarchy(guild, member, 'change nickname of');
    }

    const updated = await member.setNickname(nickname, reason);
    return formatMember(updated);
  }

  async resetMemberNickname({ guildId, userId, reason = undefined }) {
    return this.editMemberNickname({ guildId, userId, nickname: null, reason });
  }

  async editMemberTimeout({ guildId, userId, durationSeconds, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ModerateMembers']);

    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    this.permissionService.ensureMemberHierarchy(guild, member, 'timeout');

    const maxSeconds = DISCORD_LIMITS.MAX_TIMEOUT_DAYS * 24 * 60 * 60;
    if (durationSeconds < 1 || durationSeconds > maxSeconds) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Timeout duration must be between 1 second and ${maxSeconds} seconds (28 days).`
      );
    }

    const updated = await member.timeout(durationSeconds * 1000, reason);

    const modCase = this.moderationService?.recordModerationAction({
      guildId: guild.id,
      targetUserId: member.id,
      targetUserTag: member.user?.tag ?? member.user?.username ?? null,
      moderatorId: guild.members?.me?.id ?? null,
      actionType: 'timeout',
      reason: reason || 'Member timed out via Discord AI MCP',
      durationSeconds
    });

    return {
      timedOut: true,
      durationSeconds,
      member: formatMember(updated),
      moderationCase: modCase ?? null
    };
  }

  async removeMemberTimeout({ guildId, userId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ModerateMembers']);

    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    this.permissionService.ensureMemberHierarchy(guild, member, 'remove timeout of');

    const updated = await member.timeout(null, reason);

    const modCase = this.moderationService?.recordModerationAction({
      guildId: guild.id,
      targetUserId: member.id,
      targetUserTag: member.user?.tag ?? member.user?.username ?? null,
      moderatorId: guild.members?.me?.id ?? null,
      actionType: 'remove_timeout',
      reason: reason || 'Timeout removed via Discord AI MCP'
    });

    return {
      timeoutRemoved: true,
      member: formatMember(updated),
      moderationCase: modCase ?? null
    };
  }

  async kickMember({ guildId, userId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['KickMembers']);

    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    this.permissionService.ensureMemberHierarchy(guild, member, 'kick');

    const snapshot = formatMember(member);
    await member.kick(reason);

    const modCase = this.moderationService?.recordModerationAction({
      guildId: guild.id,
      targetUserId: member.id,
      targetUserTag: member.user?.tag ?? member.user?.username ?? null,
      moderatorId: guild.members?.me?.id ?? null,
      actionType: 'kick',
      reason: reason || 'Member kicked via Discord AI MCP'
    });

    return {
      kicked: true,
      member: snapshot,
      moderationCase: modCase ?? null
    };
  }

  async banMember({ guildId, userId, deleteMessageSeconds = 0, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['BanMembers']);

    if (userId === guild.ownerId) {
      throw new AppError(
        ERROR_CODES.GUILD_OWNER_PROTECTED,
        'Cannot ban the guild owner.'
      );
    }

    let member = null;
    try {
      member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    } catch (error) {
      void error;
    }

    if (member) {
      this.permissionService.ensureMemberHierarchy(guild, member, 'ban');
    }

    await guild.members.ban(userId, {
      deleteMessageSeconds: Math.min(604800, Math.max(0, Number(deleteMessageSeconds) || 0)),
      reason
    });

    const modCase = this.moderationService?.recordModerationAction({
      guildId: guild.id,
      targetUserId: userId,
      targetUserTag: member?.user?.tag ?? member?.user?.username ?? null,
      moderatorId: guild.members?.me?.id ?? null,
      actionType: 'ban',
      reason: reason || 'User banned via Discord AI MCP',
      metadata: { deleteMessageSeconds }
    });

    return {
      banned: true,
      guildId: guild.id,
      userId,
      deleteMessageSeconds,
      moderationCase: modCase ?? null
    };
  }

  async unbanMember({ guildId, userId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['BanMembers']);

    const unbannedUser = await guild.members.unban(userId, reason);

    const modCase = this.moderationService?.recordModerationAction({
      guildId: guild.id,
      targetUserId: userId,
      targetUserTag: unbannedUser?.tag ?? unbannedUser?.username ?? null,
      moderatorId: guild.members?.me?.id ?? null,
      actionType: 'unban',
      reason: reason || 'User unbanned via Discord AI MCP'
    });

    return {
      unbanned: true,
      guildId: guild.id,
      userId,
      user: unbannedUser ? formatUser(unbannedUser) : null,
      moderationCase: modCase ?? null
    };
  }

  async getMemberAvatar({ guildId, userId, size = 512 }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);

    const guildAvatarUrl =
      typeof member.avatarURL === 'function' ? member.avatarURL({ size }) : null;
    const globalAvatarUrl =
      typeof member.user?.displayAvatarURL === 'function'
        ? member.user.displayAvatarURL({ size })
        : null;
    const displayAvatarUrl =
      typeof member.displayAvatarURL === 'function'
        ? member.displayAvatarURL({ size })
        : globalAvatarUrl;

    return {
      guildId: guild.id,
      userId: member.id,
      displayAvatarUrl,
      guildAvatarUrl,
      globalAvatarUrl
    };
  }

  async getMemberJoinDate({ guildId, userId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);

    return {
      guildId: guild.id,
      userId: member.id,
      joinedAt: formatIsoTimestamp(member.joinedAt ?? member.joinedTimestamp),
      joinedTimestamp: member.joinedTimestamp ?? null,
      accountCreatedAt: formatIsoTimestamp(
        member.user?.createdAt ?? member.user?.createdTimestamp
      )
    };
  }

  async getMemberPresence({ guildId, userId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    const hasPresenceIntent = this.config?.gatewayIntents?.includes(
      GatewayIntentBits.GuildPresences
    );

    const presence = member.presence;
    if (!presence) {
      return {
        guildId: guild.id,
        userId: member.id,
        available: false,
        guildPresencesIntentEnabled: Boolean(hasPresenceIntent),
        status: 'offline_or_unavailable',
        activities: [],
        clientStatus: null,
        explanation: hasPresenceIntent
          ? 'Member is currently offline or their presence has not been cached by the Gateway.'
          : 'Presence data is unavailable because ENABLE_GUILD_PRESENCES_INTENT is disabled. Enable the GuildPresences privileged intent in the Discord Developer Portal and .env to read live member presences.'
      };
    }

    return {
      guildId: guild.id,
      userId: member.id,
      available: true,
      guildPresencesIntentEnabled: Boolean(hasPresenceIntent),
      status: presence.status,
      clientStatus: presence.clientStatus ?? null,
      activities: Array.isArray(presence.activities)
        ? presence.activities.map((act) => ({
            name: act.name,
            type: act.type,
            state: act.state ?? null,
            details: act.details ?? null
          }))
        : []
    };
  }
}

