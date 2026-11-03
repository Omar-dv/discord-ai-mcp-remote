/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { version as discordJsVersion, OAuth2Scopes, PermissionFlagsBits } from 'discord.js';
import { PROJECT_IDENTITY } from '../../core/constants.js';
import { formatGuild, formatUser, formatIsoTimestamp } from '../../utils/formatters.js';

export class BotManager {
  constructor({ discordClientManager, permissionService, config } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
    this.config = config;
  }

  getBotInfo() {
    const client = this.discordClientManager.ensureReady();
    return {
      user: formatUser(client.user),
      applicationId: client.application?.id ?? client.user?.id ?? null,
      readyAt: formatIsoTimestamp(client.readyAt ?? client.readyTimestamp),
      guildCount: client.guilds?.cache?.size ?? 0,
      project: PROJECT_IDENTITY
    };
  }

  getBotStatus() {
    const isReady = this.discordClientManager.isReady();
    const client = this.discordClientManager.client;
    const presence = client?.user?.presence;

    return {
      connected: isReady,
      connectionState: this.discordClientManager.connectionState,
      status: presence?.status ?? (isReady ? 'online' : 'offline'),
      activities: Array.isArray(presence?.activities)
        ? presence.activities.map((act) => ({
            name: act.name,
            type: act.type,
            state: act.state ?? null
          }))
        : [],
      readyAt: formatIsoTimestamp(client?.readyAt ?? client?.readyTimestamp),
      uptimeMs: client?.uptime ?? 0
    };
  }

  async getBotApplication() {
    const client = this.discordClientManager.ensureReady();
    if (client.application && typeof client.application.fetch === 'function') {
      try {
        await client.application.fetch();
      } catch (error) {
        void error;
      }
    }
    const app = client.application;
    return {
      id: app?.id ?? client.user?.id ?? null,
      name: app?.name ?? client.user?.username ?? null,
      description: app?.description ?? null,
      botPublic: app?.botPublic ?? null,
      botRequireCodeGrant: app?.botRequireCodeGrant ?? null,
      Flags: app?.flags?.toArray ? app.flags.toArray() : [],
      createdAt: formatIsoTimestamp(app?.createdAt ?? app?.createdTimestamp)
    };
  }

  getBotGuilds() {
    const client = this.discordClientManager.ensureReady();
    const guilds = client.guilds?.cache
      ? Array.from(client.guilds.cache.values()).map((guild) => formatGuild(guild))
      : [];
    return {
      count: guilds.length,
      guilds
    };
  }

  async getBotPermissions({ guildId, channelId = null }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    let channel = null;
    if (channelId) {
      channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    }
    return this.permissionService.getBotPermissionReport(guild, channel);
  }

  getBotLatency() {
    const client = this.discordClientManager.ensureReady();
    return {
      wsPingMs: client.ws?.ping ?? -1,
      status: client.ws?.status ?? null,
      measuredAt: new Date().toISOString()
    };
  }

  getBotUptime() {
    const client = this.discordClientManager.client;
    const clientUptimeMs = client?.uptime ?? 0;
    const processUptimeSeconds = Math.floor(process.uptime());

    return {
      botUptimeMs: clientUptimeMs,
      botUptimeSeconds: Math.floor(clientUptimeMs / 1000),
      processUptimeSeconds,
      startedAt: new Date(this.discordClientManager.startedAt).toISOString(),
      readyAt: formatIsoTimestamp(client?.readyAt ?? client?.readyTimestamp)
    };
  }

  getBotVersion() {
    return {
      project: PROJECT_IDENTITY.name,
      projectVersion: PROJECT_IDENTITY.version,
      creator: PROJECT_IDENTITY.creator,
      attribution: PROJECT_IDENTITY.officialAttribution,
      nodeVersion: process.version,
      discordJsVersion,
      platform: process.platform,
      arch: process.arch
    };
  }

  getBotConfiguration() {
    return {
      ...this.config.getPublicSummary(),
      enabledGatewayIntentsCount: this.config.gatewayIntents.length
    };
  }

  getBotStatistics() {
    const client = this.discordClientManager.ensureReady();
    const guilds = client.guilds?.cache ? Array.from(client.guilds.cache.values()) : [];
    const totalMembersApprox = guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0);
    const cachedChannelsCount = client.channels?.cache?.size ?? 0;
    const cachedUsersCount = client.users?.cache?.size ?? 0;
    const memory = process.memoryUsage();

    return {
      guildsCount: guilds.length,
      approximateTotalMembers: totalMembersApprox,
      cachedChannelsCount,
      cachedUsersCount,
      wsPingMs: client.ws?.ping ?? -1,
      uptimeMs: client.uptime ?? 0,
      memoryUsageMb: {
        rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100
      }
    };
  }

  getBotGatewayStatus() {
    const client = this.discordClientManager.client;
    const shards = client?.ws?.shards
      ? Array.from(client.ws.shards.values()).map((shard) => ({
          id: shard.id,
          status: shard.status,
          ping: shard.ping
        }))
      : [];

    return {
      connectionState: this.discordClientManager.connectionState,
      isReady: this.discordClientManager.isReady(),
      wsStatus: client?.ws?.status ?? null,
      wsPingMs: client?.ws?.ping ?? -1,
      shardsCount: shards.length,
      shards
    };
  }

  getBotInviteUrl({ permissions = ['ViewChannel', 'SendMessages', 'ManageChannels', 'ManageRoles', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ViewAuditLog'] } = {}) {
    const client = this.discordClientManager.ensureReady();
    const { bitField, names } = this.permissionService.resolvePermissionBitField(permissions);

    let inviteUrl;
    if (typeof client.generateInvite === 'function') {
      inviteUrl = client.generateInvite({
        scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
        permissions: bitField
      });
    } else {
      const clientId = client.application?.id ?? client.user?.id;
      inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot+applications.commands&permissions=${bitField.bitfield.toString()}`;
    }

    return {
      inviteUrl,
      requestedPermissions: names,
      permissionsBitfield: bitField.bitfield.toString(),
      includesAdministrator: bitField.has(PermissionFlagsBits.Administrator)
    };
  }
}
