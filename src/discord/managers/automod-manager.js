/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import {
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationActionType
} from 'discord.js';
import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { formatAutoModRule } from '../../utils/formatters.js';

const TRIGGER_TYPE_MAP = Object.freeze({
  keyword: AutoModerationRuleTriggerType.Keyword,
  spam: AutoModerationRuleTriggerType.Spam,
  keyword_preset: AutoModerationRuleTriggerType.KeywordPreset,
  mention_spam: AutoModerationRuleTriggerType.MentionSpam
});

const ACTION_TYPE_MAP = Object.freeze({
  block_message: AutoModerationActionType.BlockMessage,
  send_alert_message: AutoModerationActionType.SendAlertMessage,
  timeout: AutoModerationActionType.Timeout
});

export class AutoModManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  async fetchRuleOrThrow(guild, ruleId) {
    let rule = guild.autoModerationRules?.cache?.get(ruleId) || null;
    if (!rule && typeof guild.autoModerationRules?.fetch === 'function') {
      try {
        rule = await guild.autoModerationRules.fetch(ruleId);
      } catch (error) {
        void error;
        rule = null;
      }
    }

    if (!rule) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `AutoMod rule "${ruleId}" was not found in guild "${guild.name}".`
      );
    }

    return rule;
  }

  normalizeActions(actions = []) {
    return actions.map((action) => {
      const resolvedType =
        typeof action.type === 'number'
          ? action.type
          : ACTION_TYPE_MAP[action.type] ?? AutoModerationActionType.BlockMessage;

      const metadata = {};
      if (action.channelId) {
        metadata.channel = action.channelId;
      }
      if (action.durationSeconds) {
        metadata.durationSeconds = action.durationSeconds;
      }
      if (action.customMessage) {
        metadata.customMessage = action.customMessage;
      }

      return {
        type: resolvedType,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      };
    });
  }

  async listAutoModRules({ guildId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);

    const rulesCollection = await guild.autoModerationRules.fetch();
    const rules = Array.from(rulesCollection.values()).map((r) => formatAutoModRule(r));

    return {
      guildId: guild.id,
      count: rules.length,
      rules
    };
  }

  async getAutoModRule({ guildId, ruleId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);

    const rule = await this.fetchRuleOrThrow(guild, ruleId);
    return formatAutoModRule(rule);
  }

  async createAutoModRule({
    guildId,
    name,
    triggerType = 'keyword',
    triggerMetadata = {},
    actions = [{ type: 'block_message' }],
    enabled = true,
    exemptRoles = [],
    exemptChannels = [],
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);

    const resolvedTrigger =
      typeof triggerType === 'number'
        ? triggerType
        : TRIGGER_TYPE_MAP[triggerType] ?? AutoModerationRuleTriggerType.Keyword;

    const created = await guild.autoModerationRules.create({
      name,
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: resolvedTrigger,
      triggerMetadata,
      actions: this.normalizeActions(actions),
      enabled,
      exemptRoles,
      exemptChannels,
      reason
    });

    return formatAutoModRule(created);
  }

  async editAutoModRule({
    guildId,
    ruleId,
    name,
    triggerMetadata,
    actions,
    enabled,
    exemptRoles,
    exemptChannels,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);

    const rule = await this.fetchRuleOrThrow(guild, ruleId);
    const editPayload = { reason };

    if (name !== undefined) {
      editPayload.name = name;
    }
    if (triggerMetadata !== undefined) {
      editPayload.triggerMetadata = triggerMetadata;
    }
    if (actions !== undefined) {
      editPayload.actions = this.normalizeActions(actions);
    }
    if (enabled !== undefined) {
      editPayload.enabled = enabled;
    }
    if (exemptRoles !== undefined) {
      editPayload.exemptRoles = exemptRoles;
    }
    if (exemptChannels !== undefined) {
      editPayload.exemptChannels = exemptChannels;
    }

    const updated = await rule.edit(editPayload);
    return formatAutoModRule(updated);
  }

  async deleteAutoModRule({ guildId, ruleId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageGuild']);

    const rule = await this.fetchRuleOrThrow(guild, ruleId);
    const snapshot = formatAutoModRule(rule);
    await rule.delete(reason);

    return {
      deleted: true,
      rule: snapshot
    };
  }
}

