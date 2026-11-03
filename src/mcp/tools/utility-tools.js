/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { guildIdSchema, channelIdSchema } from '../../security/validation.js';

export function registerUtilityTools(
  registry,
  {
    discordClientManager,
    diagnosticsService,
    permissionService,
    auditService,
    guildManager
  }
) {
  registry.register({
    name: 'get_server_statistics',
    title: 'Get Server Statistics',
    description: 'Retrieve comprehensive channel, role, member, emoji, sticker, and boost statistics for a guild.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.getServerStatistics(guild);
    }
  });

  registry.register({
    name: 'get_server_activity_summary',
    title: 'Get Server Activity Summary',
    description: 'Summarize active voice members, active threads, scheduled events, and recent local/Discord audit activity.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      const stats = diagnosticsService.getServerStatistics(guild);
      const localAudit = auditService.getLocalAuditHistory({ guildId, limit: 20 });

      const activeVoiceStatesCount = guild.voiceStates?.cache
        ? Array.from(guild.voiceStates.cache.values()).filter((vs) => vs.channelId).length
        : 0;

      const scheduledEventsCount = guild.scheduledEvents?.cache?.size ?? 0;

      return {
        guildId: guild.id,
        guildName: guild.name,
        memberCount: stats.memberCount,
        activeVoiceMembersCount: activeVoiceStatesCount,
        cachedThreadsCount: stats.channels.threads,
        scheduledEventsCount,
        recentLocalToolActionsCount: localAudit.length,
        recentLocalToolActions: localAudit.slice(0, 10)
      };
    }
  });

  registry.register({
    name: 'get_server_structure',
    title: 'Get Server Structure',
    description: 'Retrieve the full hierarchical category and channel tree structure of a Discord server.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.getServerStructure(guild);
    }
  });

  registry.register({
    name: 'get_server_permission_overview',
    title: 'Get Server Permission Overview',
    description: 'Analyze @everyone permissions, administrator roles, high-privilege roles, and bot permissions.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.getServerPermissionOverview(guild);
    }
  });

  registry.register({
    name: 'get_server_security_overview',
    title: 'Get Server Security Overview',
    description: 'Evaluate server verification level, content filters, MFA settings, and dangerous permission grants.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.getServerSecurityOverview(guild);
    }
  });

  registry.register({
    name: 'get_server_configuration_report',
    title: 'Get Server Configuration Report',
    description: 'Generate a consolidated report of guild settings, features, system channels, and local configuration.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const [info, settings, features] = await Promise.all([
        guildManager.getGuildInfo(guildId),
        guildManager.getGuildSettings(guildId),
        guildManager.getGuildFeatures(guildId)
      ]);
      return {
        guild: info,
        settings,
        features: features.features
      };
    }
  });

  registry.register({
    name: 'check_bot_permissions',
    title: 'Check Bot Permissions',
    description: 'Verify whether the bot has specific permissions in a guild or channel.',
    category: 'utility',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema.optional()
    }),
    handler: async ({ guildId, channelId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      let channel = null;
      if (channelId) {
        channel = await discordClientManager.getChannelOrThrow(channelId, guildId);
      }
      return permissionService.getBotPermissionReport(guild, channel);
    }
  });

  registry.register({
    name: 'check_bot_hierarchy',
    title: 'Check Bot Hierarchy',
    description: 'Inspect the bot highest role position and identify which guild roles are above or manageable by the bot.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return permissionService.getBotHierarchyReport(guild);
    }
  });

  registry.register({
    name: 'diagnose_server_configuration',
    title: 'Diagnose Server Configuration',
    description: 'Run automated security, permission, and structural diagnostics on a Discord server.',
    category: 'utility',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.diagnoseServerConfiguration(guild);
    }
  });
}

