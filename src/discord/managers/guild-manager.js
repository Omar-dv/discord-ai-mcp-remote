/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import {
  formatGuild,
  formatChannel,
  formatRole,
  formatEmoji,
  formatSticker,
  formatInvite,
  formatWebhook,
  formatScheduledEvent,
  formatAutoModRule,
  formatUser,
  formatMember
} from '../../utils/formatters.js';

export class GuildManager {
  constructor({ discordClientManager, permissionService, auditService, databaseManager } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
    this.auditService = auditService;
    this.databaseManager = databaseManager;
  }

  listGuilds() {
    const client = this.discordClientManager.ensureReady();
    const guilds = client.guilds?.cache
      ? Array.from(client.guilds.cache.values()).map((guild) => formatGuild(guild))
      : [];
    return {
      count: guilds.length,
      guilds
    };
  }

  async getGuildInfo(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    return formatGuild(guild);
  }

  async getGuildPreview(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    if (typeof guild.fetchPreview === 'function') {
      try {
        const preview = await guild.fetchPreview();
        return {
          id: preview.id,
          name: preview.name,
          description: preview.description ?? null,
          approximateMemberCount: preview.approximateMemberCount ?? guild.memberCount ?? 0,
          approximatePresenceCount: preview.approximatePresenceCount ?? null,
          features: Array.isArray(preview.features) ? [...preview.features] : [],
          emojisCount: preview.emojis?.size ?? guild.emojis?.cache?.size ?? 0,
          stickersCount: preview.stickers?.size ?? guild.stickers?.cache?.size ?? 0
        };
      } catch (error) {
        void error;
      }
    }

    return {
      id: guild.id,
      name: guild.name,
      description: guild.description ?? null,
      approximateMemberCount: guild.memberCount ?? 0,
      approximatePresenceCount: null,
      features: Array.isArray(guild.features) ? [...guild.features] : [],
      emojisCount: guild.emojis?.cache?.size ?? 0,
      stickersCount: guild.stickers?.cache?.size ?? 0,
      note: 'Returned from local guild cache because public guild preview is only enabled on Community/Discoverable servers.'
    };
  }

  async getGuildSettings(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const localSettings = this.databaseManager?.configRepo?.getGuildSettings(guild.id) ?? {};

    return {
      guildId: guild.id,
      name: guild.name,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      mfaLevel: guild.mfaLevel,
      nsfwLevel: guild.nsfwLevel,
      preferredLocale: guild.preferredLocale,
      afkChannelId: guild.afkChannelId ?? null,
      afkTimeout: guild.afkTimeout ?? null,
      systemChannelId: guild.systemChannelId ?? null,
      rulesChannelId: guild.rulesChannelId ?? null,
      publicUpdatesChannelId: guild.publicUpdatesChannelId ?? null,
      safetyAlertsChannelId: guild.safetyAlertsChannelId ?? null,
      premiumProgressBarEnabled: Boolean(guild.premiumProgressBarEnabled),
      localPersistentSettings: localSettings
    };
  }

  async getGuildFeatures(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    return {
      guildId: guild.id,
      guildName: guild.name,
      featuresCount: guild.features?.length ?? 0,
      features: Array.isArray(guild.features) ? [...guild.features] : []
    };
  }

  async getGuildOwner(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    let ownerMember = null;
    if (typeof guild.fetchOwner === 'function') {
      try {
        ownerMember = await guild.fetchOwner();
      } catch {
        ownerMember = guild.members?.cache?.get(guild.ownerId) || null;
      }
    }

    return {
      guildId: guild.id,
      guildName: guild.name,
      ownerId: guild.ownerId,
      owner: ownerMember ? formatMember(ownerMember) : null
    };
  }

  async getGuildMembersCount(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const cachedMembers = guild.members?.cache
      ? Array.from(guild.members.cache.values())
      : [];

    return {
      guildId: guild.id,
      guildName: guild.name,
      totalMemberCount: guild.memberCount ?? cachedMembers.length,
      cachedMemberCount: cachedMembers.length,
      cachedBotCount: cachedMembers.filter((m) => m.user?.bot).length,
      cachedHumanCount: cachedMembers.filter((m) => !m.user?.bot).length
    };
  }

  async getGuildChannels(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const channels = guild.channels?.cache
      ? Array.from(guild.channels.cache.values())
          .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
          .map((ch) => formatChannel(ch))
      : [];

    return {
      guildId: guild.id,
      count: channels.length,
      channels
    };
  }

  async getGuildRoles(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const roles = guild.roles?.cache
      ? Array.from(guild.roles.cache.values())
          .sort((a, b) => b.position - a.position)
          .map((role) => formatRole(role))
      : [];

    return {
      guildId: guild.id,
      count: roles.length,
      roles
    };
  }

  async getGuildEmojis(guildId) {
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

  async getGuildStickers(guildId) {
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

  async getGuildInvites(guildId) {
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

  async getGuildAuditLogs(guildId, options = {}) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    return this.auditService.fetchGuildAuditLogs(guild, options);
  }

  async getGuildBans(guildId, { limit = 100 } = {}) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['BanMembers']);
    const clampedLimit = Math.min(1000, Math.max(1, Number(limit) || 100));
    const bansCollection = await guild.bans.fetch({ limit: clampedLimit });
    const bans = Array.from(bansCollection.values()).map((ban) => ({
      user: formatUser(ban.user),
      reason: ban.reason ?? null
    }));

    return {
      guildId: guild.id,
      count: bans.length,
      bans
    };
  }

  async getGuildIntegrations(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);
    const integrationsCollection = await guild.fetchIntegrations();
    const integrations = Array.from(integrationsCollection.values()).map((integration) => ({
      id: integration.id,
      name: integration.name,
      type: integration.type,
      enabled: Boolean(integration.enabled),
      syncing: Boolean(integration.syncing),
      roleId: integration.roleId ?? null,
      application: integration.application
        ? {
            id: integration.application.id,
            name: integration.application.name,
            description: integration.application.description ?? null
          }
        : null,
      user: integration.user ? formatUser(integration.user) : null
    }));

    return {
      guildId: guild.id,
      count: integrations.length,
      integrations
    };
  }

  async getGuildWebhooks(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageWebhooks']);
    const webhooksCollection = await guild.fetchWebhooks();
    const webhooks = Array.from(webhooksCollection.values()).map((wh) => formatWebhook(wh));

    return {
      guildId: guild.id,
      count: webhooks.length,
      webhooks
    };
  }

  async getGuildEvents(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const eventsCollection = await guild.scheduledEvents.fetch();
    const events = Array.from(eventsCollection.values()).map((evt) => formatScheduledEvent(evt));

    return {
      guildId: guild.id,
      count: events.length,
      events
    };
  }

  async getGuildAutoModRules(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);
    const rulesCollection = await guild.autoModerationRules.fetch();
    const rules = Array.from(rulesCollection.values()).map((rule) => formatAutoModRule(rule));

    return {
      guildId: guild.id,
      count: rules.length,
      rules
    };
  }
}
