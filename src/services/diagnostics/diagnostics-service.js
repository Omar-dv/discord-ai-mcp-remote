/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import {
  ChannelType,
  GuildVerificationLevel,
  GuildExplicitContentFilter,
  GuildMFALevel,
  PermissionFlagsBits
} from 'discord.js';
import { HIGH_RISK_PERMISSIONS } from '../permissions/permission-service.js';
import { formatChannel, formatRole, formatGuild } from '../../utils/formatters.js';

export class DiagnosticsService {
  constructor({ permissionService, config, databaseManager } = {}) {
    this.permissionService = permissionService;
    this.config = config;
    this.databaseManager = databaseManager;
  }

  getServerStatistics(guild) {
    const channels = guild.channels?.cache ? Array.from(guild.channels.cache.values()) : [];
    const roles = guild.roles?.cache ? Array.from(guild.roles.cache.values()) : [];
    const members = guild.members?.cache ? Array.from(guild.members.cache.values()) : [];
    const emojis = guild.emojis?.cache ? Array.from(guild.emojis.cache.values()) : [];
    const stickers = guild.stickers?.cache ? Array.from(guild.stickers.cache.values()) : [];

    const channelBreakdown = {
      total: channels.length,
      text: channels.filter((c) => c.type === ChannelType.GuildText).length,
      voice: channels.filter((c) => c.type === ChannelType.GuildVoice).length,
      category: channels.filter((c) => c.type === ChannelType.GuildCategory).length,
      announcement: channels.filter((c) => c.type === ChannelType.GuildAnnouncement).length,
      stage: channels.filter((c) => c.type === ChannelType.GuildStageVoice).length,
      forum: channels.filter((c) => c.type === ChannelType.GuildForum).length,
      threads: channels.filter((c) => typeof c.isThread === 'function' && c.isThread()).length
    };

    const cachedBots = members.filter((m) => m.user?.bot).length;
    const cachedHumans = members.filter((m) => !m.user?.bot).length;

    return {
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount ?? members.length,
      cachedMembersCount: members.length,
      cachedHumansCount: cachedHumans,
      cachedBotsCount: cachedBots,
      channels: channelBreakdown,
      rolesCount: roles.length,
      emojisCount: emojis.length,
      animatedEmojisCount: emojis.filter((e) => e.animated).length,
      staticEmojisCount: emojis.filter((e) => !e.animated).length,
      stickersCount: stickers.length,
      boostTier: guild.premiumTier ?? 0,
      boostCount: guild.premiumSubscriptionCount ?? 0,
      createdAt: guild.createdAt ? guild.createdAt.toISOString() : null
    };
  }

  getServerStructure(guild) {
    const allChannels = guild.channels?.cache
      ? Array.from(guild.channels.cache.values()).sort(
          (a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0)
        )
      : [];

    const categories = allChannels.filter((c) => c.type === ChannelType.GuildCategory);
    const uncategorized = allChannels
      .filter((c) => c.type !== ChannelType.GuildCategory && !c.parentId && !c.isThread?.())
      .map((c) => formatChannel(c));

    const categoryTree = categories.map((cat) => {
      const children = allChannels
        .filter((c) => c.parentId === cat.id && !c.isThread?.())
        .map((c) => formatChannel(c));
      return {
        category: formatChannel(cat),
        childrenCount: children.length,
        children
      };
    });

    return {
      guildId: guild.id,
      guildName: guild.name,
      categoriesCount: categoryTree.length,
      uncategorizedCount: uncategorized.length,
      uncategorizedChannels: uncategorized,
      categories: categoryTree
    };
  }

  getServerPermissionOverview(guild) {
    const roles = guild.roles?.cache
      ? Array.from(guild.roles.cache.values()).sort((a, b) => b.position - a.position)
      : [];

    const everyoneRole = roles.find((r) => r.id === guild.id);
    const everyonePerms = everyoneRole?.permissions?.toArray
      ? everyoneRole.permissions.toArray()
      : [];

    const dangerousEveryonePerms = everyonePerms.filter((perm) =>
      HIGH_RISK_PERMISSIONS.includes(perm)
    );

    const adminRoles = roles
      .filter((r) => r.permissions?.has(PermissionFlagsBits.Administrator))
      .map((r) => formatRole(r));

    const highPrivilegeRoles = roles
      .filter(
        (r) =>
          !r.permissions?.has(PermissionFlagsBits.Administrator) &&
          HIGH_RISK_PERMISSIONS.some((perm) => r.permissions?.has(PermissionFlagsBits[perm]))
      )
      .map((r) => ({
        ...formatRole(r),
        highRiskPermissions: HIGH_RISK_PERMISSIONS.filter((perm) =>
          r.permissions?.has(PermissionFlagsBits[perm])
        )
      }));

    return {
      guildId: guild.id,
      guildName: guild.name,
      everyonePermissions: everyonePerms,
      dangerousEveryonePermissions: dangerousEveryonePerms,
      administratorRolesCount: adminRoles.length,
      administratorRoles: adminRoles,
      highPrivilegeRolesCount: highPrivilegeRoles.length,
      highPrivilegeRoles,
      botPermissions: this.permissionService.getBotPermissionReport(guild)
    };
  }

  getServerSecurityOverview(guild) {
    const permOverview = this.getServerPermissionOverview(guild);
    const findings = [];

    if (
      guild.verificationLevel === GuildVerificationLevel.None ||
      guild.verificationLevel === GuildVerificationLevel.Low
    ) {
      findings.push({
        severity: 'medium',
        code: 'LOW_VERIFICATION_LEVEL',
        message:
          'Guild verification level is None or Low. Consider Medium or High for public communities.'
      });
    }

    if (guild.explicitContentFilter === GuildExplicitContentFilter.Disabled) {
      findings.push({
        severity: 'medium',
        code: 'EXPLICIT_CONTENT_FILTER_DISABLED',
        message: 'Explicit media content filter is disabled.'
      });
    }

    if (guild.mfaLevel === GuildMFALevel.None) {
      findings.push({
        severity: 'low',
        code: 'MFA_NOT_REQUIRED_FOR_MODERATION',
        message: '2FA requirement for moderation actions (mfaLevel) is not enabled.'
      });
    }

    if (permOverview.dangerousEveryonePermissions.length > 0) {
      findings.push({
        severity: 'critical',
        code: 'DANGEROUS_EVERYONE_PERMISSIONS',
        message: `@everyone role has high-risk permissions: ${permOverview.dangerousEveryonePermissions.join(', ')}`
      });
    }

    if (permOverview.administratorRolesCount > 5) {
      findings.push({
        severity: 'medium',
        code: 'EXCESSIVE_ADMIN_ROLES',
        message: `Guild has ${permOverview.administratorRolesCount} roles with Administrator permission. Minimize Administrator grants.`
      });
    }

    return {
      guildId: guild.id,
      guildName: guild.name,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      mfaLevel: guild.mfaLevel,
      nsfwLevel: guild.nsfwLevel,
      safetyAlertsChannelId: guild.safetyAlertsChannelId ?? null,
      dangerousEveryonePermissions: permOverview.dangerousEveryonePermissions,
      administratorRolesCount: permOverview.administratorRolesCount,
      findingsCount: findings.length,
      findings
    };
  }

  diagnoseServerConfiguration(guild) {
    const guildInfo = formatGuild(guild);
    const security = this.getServerSecurityOverview(guild);
    const hierarchy = this.permissionService.getBotHierarchyReport(guild);
    const botPerms = this.permissionService.getBotPermissionReport(guild);

    const recommendations = [...security.findings];

    if (!guild.systemChannelId) {
      recommendations.push({
        severity: 'info',
        code: 'NO_SYSTEM_CHANNEL',
        message: 'No system channel is configured for join/boost notifications.'
      });
    }

    if (guild.features?.includes('COMMUNITY') && !guild.rulesChannelId) {
      recommendations.push({
        severity: 'low',
        code: 'NO_RULES_CHANNEL',
        message: 'Community server does not have a designated rules channel.'
      });
    }

    if (hierarchy.manageableRolesCount === 0 && hierarchy.totalRoles > 1) {
      recommendations.push({
        severity: 'high',
        code: 'BOT_ROLE_AT_BOTTOM_OF_HIERARCHY',
        message:
          'The bot role is positioned below all other guild roles and cannot manage any roles or moderate roled members.'
      });
    }

    return {
      guild: guildInfo,
      botPermissions: botPerms,
      botHierarchy: hierarchy,
      securityOverview: security,
      recommendationsCount: recommendations.length,
      recommendations
    };
  }
}

