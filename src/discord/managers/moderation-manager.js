/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class ModerationManager {
  constructor({
    memberManager,
    guildManager,
    auditService,
    moderationService,
    messageManager,
    discordClientManager
  } = {}) {
    this.memberManager = memberManager;
    this.guildManager = guildManager;
    this.auditService = auditService;
    this.moderationService = moderationService;
    this.messageManager = messageManager;
    this.discordClientManager = discordClientManager;
  }

  async kickMember(params) {
    return this.memberManager.kickMember(params);
  }

  async banMember(params) {
    return this.memberManager.banMember(params);
  }

  async unbanMember(params) {
    return this.memberManager.unbanMember(params);
  }

  async timeoutMember(params) {
    return this.memberManager.editMemberTimeout(params);
  }

  async removeTimeout(params) {
    return this.memberManager.removeMemberTimeout(params);
  }

  async getBanList({ guildId, limit = 100 }) {
    return this.guildManager.getGuildBans(guildId, { limit });
  }

  async getAuditLogs({ guildId, limit = 25, userId = null, actionType = null }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    return this.auditService.fetchGuildAuditLogs(guild, { limit, userId, actionType });
  }

  async createModerationCase({
    guildId,
    targetUserId,
    targetUserTag = null,
    moderatorId = null,
    actionType = 'note',
    reason = null,
    durationSeconds = null,
    metadata = {}
  }) {
    await this.discordClientManager.getGuildOrThrow(guildId);
    return this.moderationService.recordModerationAction({
      guildId,
      targetUserId,
      targetUserTag,
      moderatorId,
      actionType,
      reason,
      durationSeconds,
      metadata
    });
  }

  async getModerationCase({ guildId, caseId }) {
    await this.discordClientManager.getGuildOrThrow(guildId);
    return this.moderationService.getModerationCase(guildId, caseId);
  }

  async getModerationHistory({ guildId, targetUserId = null, limit = 50 }) {
    await this.discordClientManager.getGuildOrThrow(guildId);
    return {
      guildId,
      targetUserId: targetUserId || null,
      cases: this.moderationService.getModerationHistory({ guildId, targetUserId, limit })
    };
  }

  async bulkDeleteMessages(params) {
    return this.messageManager.bulkDeleteMessages(params);
  }
}

