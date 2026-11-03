/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { AuditLogEvent } from 'discord.js';
import { DISCORD_LIMITS } from '../../core/constants.js';
import { formatAuditLogEntry } from '../../utils/formatters.js';

export const MODERATION_AUDIT_EVENTS = Object.freeze([
  AuditLogEvent.MemberKick,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
  AuditLogEvent.MemberUpdate,
  AuditLogEvent.MemberPrune,
  AuditLogEvent.MessageDelete,
  AuditLogEvent.MessageBulkDelete,
  AuditLogEvent.AutoModerationBlockMessage,
  AuditLogEvent.AutoModerationFlagToChannel,
  AuditLogEvent.AutoModerationUserCommunicationDisabled
]);

export const CHANNEL_AUDIT_EVENTS = Object.freeze([
  AuditLogEvent.ChannelCreate,
  AuditLogEvent.ChannelUpdate,
  AuditLogEvent.ChannelDelete,
  AuditLogEvent.ChannelOverwriteCreate,
  AuditLogEvent.ChannelOverwriteUpdate,
  AuditLogEvent.ChannelOverwriteDelete,
  AuditLogEvent.ThreadCreate,
  AuditLogEvent.ThreadUpdate,
  AuditLogEvent.ThreadDelete
]);

export const ROLE_AUDIT_EVENTS = Object.freeze([
  AuditLogEvent.RoleCreate,
  AuditLogEvent.RoleUpdate,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.MemberRoleUpdate
]);

export const MEMBER_AUDIT_EVENTS = Object.freeze([
  AuditLogEvent.MemberKick,
  AuditLogEvent.MemberPrune,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
  AuditLogEvent.MemberUpdate,
  AuditLogEvent.MemberRoleUpdate,
  AuditLogEvent.MemberMove,
  AuditLogEvent.MemberDisconnect
]);

export class AuditService {
  constructor({ databaseManager, permissionService, logger } = {}) {
    this.databaseManager = databaseManager;
    this.permissionService = permissionService;
    this.logger = logger;
  }

  recordLocalToolExecution({
    toolName,
    category = 'general',
    identityId = 'owner',
    guildId = null,
    targetId = null,
    status = 'success',
    isDestructive = false,
    durationMs = 0,
    details = {}
  }) {
    try {
      return this.databaseManager?.auditRepo?.recordEvent({
        toolName,
        category,
        identityId,
        guildId,
        targetId,
        status,
        isDestructive,
        durationMs,
        details
      });
    } catch (error) {
      this.logger?.warn({ error, toolName }, 'Failed to record local audit log entry');
      return null;
    }
  }

  getLocalAuditHistory({ guildId = null, identityId = null, limit = 50 } = {}) {
    return this.databaseManager?.auditRepo?.getAuditHistory({ guildId, identityId, limit }) ?? [];
  }

  async fetchGuildAuditLogs(guild, { limit = 25, userId = null, actionType = null } = {}) {
    this.permissionService.ensureBotGuildPermissions(guild, ['ViewAuditLog']);
    const clampedLimit = Math.min(
      DISCORD_LIMITS.MAX_AUDIT_LOG_LIMIT,
      Math.max(1, Number(limit) || 25)
    );

    const fetchOptions = { limit: clampedLimit };
    if (userId) {
      fetchOptions.user = userId;
    }
    if (actionType !== null && actionType !== undefined) {
      fetchOptions.type = actionType;
    }

    const logs = await guild.fetchAuditLogs(fetchOptions);
    const entries = Array.from(logs.entries.values()).map((entry) => formatAuditLogEntry(entry));

    return {
      guildId: guild.id,
      count: entries.length,
      entries
    };
  }

  async getAuditLogEntryById(guild, entryId) {
    const { entries } = await this.fetchGuildAuditLogs(guild, { limit: 100 });
    return entries.find((item) => item.id === entryId) || null;
  }

  async fetchFilteredAuditLogs(guild, allowedEventTypes = [], limit = 25) {
    const { entries } = await this.fetchGuildAuditLogs(guild, { limit: 100 });
    const allowedSet = new Set(allowedEventTypes);
    const filtered = entries
      .filter((entry) => allowedSet.has(entry.action))
      .slice(0, Math.min(100, Math.max(1, Number(limit) || 25)));

    return {
      guildId: guild.id,
      count: filtered.length,
      entries: filtered
    };
  }
}
