/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ChannelType } from 'discord.js';
import { PROJECT_IDENTITY } from '../../core/constants.js';
import {
  formatGuild,
  formatChannel,
  formatPermissionOverwrites,
  formatRole,
  formatEmoji,
  formatSticker,
  formatScheduledEvent,
  formatAutoModRule
} from '../../utils/formatters.js';
import { validateSafeFilePath } from '../../security/sanitization.js';

export const BACKUP_LIMITATIONS_NOTICE = Object.freeze({
  readOnlyExport: true,
  excludesMessages: true,
  excludesMessageAttachments: true,
  excludesVoiceRecordings: true,
  excludesDirectMessages: true,
  excludesBotTokensAndWebhookTokens: true,
  explanation:
    'Discord AI MCP backups are read-only structural and metadata exports. In compliance with Discord API limitations, privacy expectations, and security rules, backups never export message history, user file attachments, DMs, bot tokens, or webhook tokens.'
});

export class BackupService {
  constructor({ config, databaseManager, auditService, logger } = {}) {
    this.config = config;
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.logger = logger;
  }

  async createGuildBackup(
    guild,
    {
      includeAuditHistory = true,
      includeAutoMod = true,
      includeEvents = true,
      saveToFile = false,
      customFileName = null
    } = {}
  ) {
    const backupId = `backup_${guild.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const guildData = formatGuild(guild);

    const allChannels = guild.channels?.cache
      ? Array.from(guild.channels.cache.values()).sort(
          (a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0)
        )
      : [];

    const categories = allChannels
      .filter((ch) => ch.type === ChannelType.GuildCategory)
      .map((ch) => ({
        ...formatChannel(ch),
        permissionOverwrites: formatPermissionOverwrites(ch)
      }));

    const channels = allChannels
      .filter((ch) => ch.type !== ChannelType.GuildCategory && !ch.isThread?.())
      .map((ch) => ({
        ...formatChannel(ch),
        permissionOverwrites: formatPermissionOverwrites(ch)
      }));

    const roles = guild.roles?.cache
      ? Array.from(guild.roles.cache.values())
          .sort((a, b) => b.position - a.position)
          .map((role) => formatRole(role))
      : [];

    const emojis = guild.emojis?.cache
      ? Array.from(guild.emojis.cache.values()).map((emoji) => formatEmoji(emoji))
      : [];

    const stickers = guild.stickers?.cache
      ? Array.from(guild.stickers.cache.values()).map((sticker) => formatSticker(sticker))
      : [];

    let scheduledEvents = [];
    if (includeEvents && guild.scheduledEvents?.cache) {
      scheduledEvents = Array.from(guild.scheduledEvents.cache.values()).map((evt) =>
        formatScheduledEvent(evt)
      );
    }

    let autoModRules = [];
    if (includeAutoMod && guild.autoModerationRules) {
      try {
        const fetchedRules = await guild.autoModerationRules.fetch();
        autoModRules = Array.from(fetchedRules.values()).map((rule) => formatAutoModRule(rule));
      } catch {
        autoModRules = [];
      }
    }

    const auditHistory = {
      discordAuditLogs: [],
      localAuditLogs: [],
      localModerationCases: []
    };

    if (includeAuditHistory) {
      try {
        const discordAudit = await this.auditService.fetchGuildAuditLogs(guild, { limit: 50 });
        auditHistory.discordAuditLogs = discordAudit.entries;
      } catch {
        auditHistory.discordAuditLogs = [];
      }

      auditHistory.localAuditLogs = this.auditService.getLocalAuditHistory({
        guildId: guild.id,
        limit: 50
      });

      auditHistory.localModerationCases =
        this.databaseManager?.moderationRepo?.getHistory({
          guildId: guild.id,
          limit: 50
        }) ?? [];
    }

    const localGuildSettings =
      this.databaseManager?.configRepo?.getGuildSettings(guild.id) ?? {};

    const snapshot = {
      metadata: {
        backupId,
        project: PROJECT_IDENTITY.name,
        version: PROJECT_IDENTITY.version,
        attribution: PROJECT_IDENTITY.officialAttribution,
        createdAt,
        guildId: guild.id,
        guildName: guildData.name,
        limitations: BACKUP_LIMITATIONS_NOTICE
      },
      guild: guildData,
      categories,
      channels,
      roles,
      emojis,
      stickers,
      scheduledEvents,
      autoModRules,
      localGuildSettings,
      auditHistory
    };

    let savedFilePath = null;
    if (saveToFile) {
      const exportDir = this.config?.resolvedBackupDir || path.resolve(process.cwd(), './data/backups');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      const safeFileName = customFileName
        ? path.basename(customFileName).replace(/[^a-zA-Z0-9._-]/g, '_')
        : `${backupId}.json`;
      const finalFileName = safeFileName.endsWith('.json') ? safeFileName : `${safeFileName}.json`;
      const targetPath = validateSafeFilePath(finalFileName, exportDir, ['.json']);
      fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2), 'utf8');
      savedFilePath = targetPath;
    }

    const summary = {
      categoriesCount: categories.length,
      channelsCount: channels.length,
      rolesCount: roles.length,
      emojisCount: emojis.length,
      stickersCount: stickers.length,
      scheduledEventsCount: scheduledEvents.length,
      autoModRulesCount: autoModRules.length
    };

    this.databaseManager?.auditRepo?.recordBackup({
      backupId,
      guildId: guild.id,
      guildName: guildData.name,
      filePath: savedFilePath,
      summary
    });

    return {
      backupId,
      savedFilePath,
      summary,
      limitations: BACKUP_LIMITATIONS_NOTICE,
      snapshot
    };
  }
}
