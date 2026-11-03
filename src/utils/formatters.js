/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { CHANNEL_TYPE_NAMES } from '../types/index.js';
import { sanitizeUntrustedText } from '../security/sanitization.js';

export function formatIsoTimestamp(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return String(value);
}

export function formatGuild(guild) {
  if (!guild) {
    return null;
  }
  return {
    id: guild.id,
    name: sanitizeUntrustedText(guild.name, 256),
    description: guild.description ? sanitizeUntrustedText(guild.description, 1024) : null,
    ownerId: guild.ownerId ?? null,
    memberCount: guild.memberCount ?? 0,
    preferredLocale: guild.preferredLocale ?? null,
    verificationLevel: guild.verificationLevel ?? null,
    explicitContentFilter: guild.explicitContentFilter ?? null,
    defaultMessageNotifications: guild.defaultMessageNotifications ?? null,
    mfaLevel: guild.mfaLevel ?? null,
    nsfwLevel: guild.nsfwLevel ?? null,
    premiumTier: guild.premiumTier ?? 0,
    premiumSubscriptionCount: guild.premiumSubscriptionCount ?? 0,
    vanityURLCode: guild.vanityURLCode ?? null,
    iconUrl: typeof guild.iconURL === 'function' ? guild.iconURL({ size: 512 }) : null,
    bannerUrl: typeof guild.bannerURL === 'function' ? guild.bannerURL({ size: 1024 }) : null,
    systemChannelId: guild.systemChannelId ?? null,
    rulesChannelId: guild.rulesChannelId ?? null,
    publicUpdatesChannelId: guild.publicUpdatesChannelId ?? null,
    safetyAlertsChannelId: guild.safetyAlertsChannelId ?? null,
    afkChannelId: guild.afkChannelId ?? null,
    afkTimeout: guild.afkTimeout ?? null,
    features: Array.isArray(guild.features) ? [...guild.features] : [],
    createdAt: formatIsoTimestamp(guild.createdAt ?? guild.createdTimestamp),
    available: guild.available ?? true
  };
}

export function formatPermissionOverwrites(channel) {
  const cache = channel?.permissionOverwrites?.cache;
  if (!cache) {
    return [];
  }
  return Array.from(cache.values()).map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow?.toArray ? overwrite.allow.toArray() : [],
    deny: overwrite.deny?.toArray ? overwrite.deny.toArray() : []
  }));
}

export function formatChannel(channel) {
  if (!channel) {
    return null;
  }
  return {
    id: channel.id,
    guildId: channel.guildId ?? channel.guild?.id ?? null,
    name: sanitizeUntrustedText(channel.name ?? '', 256),
    type: CHANNEL_TYPE_NAMES[channel.type] ?? String(channel.type),
    typeId: channel.type,
    parentId: channel.parentId ?? null,
    position: channel.position ?? channel.rawPosition ?? 0,
    topic: channel.topic ? sanitizeUntrustedText(channel.topic, 1024) : null,
    nsfw: Boolean(channel.nsfw),
    rateLimitPerUser: channel.rateLimitPerUser ?? 0,
    bitrate: channel.bitrate ?? null,
    userLimit: channel.userLimit ?? null,
    rtcRegion: channel.rtcRegion ?? null,
    createdAt: formatIsoTimestamp(channel.createdAt ?? channel.createdTimestamp),
    permissionOverwritesCount: channel.permissionOverwrites?.cache?.size ?? 0
  };
}

export function formatRole(role) {
  if (!role) {
    return null;
  }
  return {
    id: role.id,
    guildId: role.guild?.id ?? null,
    name: sanitizeUntrustedText(role.name ?? '', 256),
    color: role.color ?? 0,
    hexColor: role.hexColor ?? '#000000',
    hoist: Boolean(role.hoist),
    position: role.position ?? role.rawPosition ?? 0,
    permissions: role.permissions?.toArray ? role.permissions.toArray() : [],
    managed: Boolean(role.managed),
    mentionable: Boolean(role.mentionable),
    iconUrl: typeof role.iconURL === 'function' ? role.iconURL({ size: 256 }) : null,
    unicodeEmoji: role.unicodeEmoji ?? null,
    memberCount: role.members?.size ?? 0,
    createdAt: formatIsoTimestamp(role.createdAt ?? role.createdTimestamp)
  };
}

export function formatUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    username: sanitizeUntrustedText(user.username ?? '', 128),
    globalName: user.globalName ? sanitizeUntrustedText(user.globalName, 128) : null,
    discriminator: user.discriminator ?? '0',
    tag: sanitizeUntrustedText(user.tag ?? user.username ?? '', 160),
    bot: Boolean(user.bot),
    system: Boolean(user.system),
    avatarUrl: typeof user.displayAvatarURL === 'function' ? user.displayAvatarURL({ size: 512 }) : null,
    bannerUrl: typeof user.bannerURL === 'function' ? user.bannerURL({ size: 1024 }) : null,
    accentColor: user.accentColor ?? null,
    createdAt: formatIsoTimestamp(user.createdAt ?? user.createdTimestamp)
  };
}

export function formatMember(member) {
  if (!member) {
    return null;
  }
  const roles = member.roles?.cache
    ? Array.from(member.roles.cache.values())
        .filter((role) => role.id !== member.guild?.id)
        .map((role) => ({
          id: role.id,
          name: sanitizeUntrustedText(role.name, 128),
          position: role.position
        }))
    : [];

  return {
    id: member.id ?? member.user?.id,
    guildId: member.guild?.id ?? null,
    nickname: member.nickname ? sanitizeUntrustedText(member.nickname, 64) : null,
    displayName: sanitizeUntrustedText(member.displayName ?? member.user?.username ?? '', 128),
    user: formatUser(member.user),
    joinedAt: formatIsoTimestamp(member.joinedAt ?? member.joinedTimestamp),
    premiumSince: formatIsoTimestamp(member.premiumSince ?? member.premiumSinceTimestamp),
    communicationDisabledUntil: formatIsoTimestamp(
      member.communicationDisabledUntil ?? member.communicationDisabledUntilTimestamp
    ),
    isTimedOut:
      typeof member.isCommunicationDisabled === 'function'
        ? member.isCommunicationDisabled()
        : Boolean(
            member.communicationDisabledUntilTimestamp &&
              member.communicationDisabledUntilTimestamp > Date.now()
          ),
    pending: Boolean(member.pending),
    manageable: Boolean(member.manageable),
    kickable: Boolean(member.kickable),
    bannable: Boolean(member.bannable),
     moderatable: Boolean(member.moderatable),
    highestRole: member.roles?.highest
      ? {
          id: member.roles.highest.id,
          name: sanitizeUntrustedText(member.roles.highest.name, 128),
          position: member.roles.highest.position
        }
      : null,
    roles,
    avatarUrl:
      typeof member.displayAvatarURL === 'function'
        ? member.displayAvatarURL({ size: 512 })
        : formatUser(member.user)?.avatarUrl ?? null
  };
}

export function formatVoiceState(voiceState) {
  if (!voiceState) {
    return null;
  }
  return {
    userId: voiceState.id ?? voiceState.member?.id ?? null,
    guildId: voiceState.guild?.id ?? null,
    channelId: voiceState.channelId ?? null,
    channelName: voiceState.channel?.name
      ? sanitizeUntrustedText(voiceState.channel.name, 128)
      : null,
    serverDeaf: Boolean(voiceState.serverDeaf),
    serverMute: Boolean(voiceState.serverMute),
    selfDeaf: Boolean(voiceState.selfDeaf),
    selfMute: Boolean(voiceState.selfMute),
    selfVideo: Boolean(voiceState.selfVideo),
    streaming: Boolean(voiceState.streaming),
    suppress: Boolean(voiceState.suppress),
    requestToSpeakTimestamp: formatIsoTimestamp(voiceState.requestToSpeakTimestamp)
  };
}

export function formatMessage(message) {
  if (!message) {
    return null;
  }
  const attachments = message.attachments
    ? Array.from(message.attachments.values()).map((att) => ({
        id: att.id,
        name: sanitizeUntrustedText(att.name ?? '', 256),
        url: att.url,
        contentType: att.contentType ?? null,
        size: att.size ?? 0
      }))
    : [];

  const embeds = Array.isArray(message.embeds)
    ? message.embeds.map((embed) => ({
        title: embed.title ? sanitizeUntrustedText(embed.title, 256) : null,
        description: embed.description ? sanitizeUntrustedText(embed.description, 4096) : null,
        url: embed.url ?? null,
        color: embed.color ?? null,
        fieldsCount: embed.fields?.length ?? 0
      }))
    : [];

  const reactions = message.reactions?.cache
    ? Array.from(message.reactions.cache.values()).map((reaction) => ({
        emoji: reaction.emoji?.id
          ? `${reaction.emoji.name}:${reaction.emoji.id}`
          : reaction.emoji?.name ?? '',
        count: reaction.count ?? 0,
        me: Boolean(reaction.me)
      }))
    : [];

  return {
    id: message.id,
    channelId: message.channelId,
    guildId: message.guildId ?? null,
    author: formatUser(message.author),
    content: sanitizeUntrustedText(message.content ?? '', 4000),
    createdAt: formatIsoTimestamp(message.createdAt ?? message.createdTimestamp),
    editedAt: formatIsoTimestamp(message.editedAt ?? message.editedTimestamp),
    pinned: Boolean(message.pinned),
    tts: Boolean(message.tts),
    system: Boolean(message.system),
    url: message.url ?? null,
    reference: message.reference
      ? {
          messageId: message.reference.messageId ?? null,
          channelId: message.reference.channelId ?? null,
          guildId: message.reference.guildId ?? null
        }
      : null,
    attachments,
    embeds,
    reactions,
    hasThread: Boolean(message.hasThread),
    threadId: message.thread?.id ?? null
  };
}

export function formatThread(thread) {
  if (!thread) {
    return null;
  }
  return {
    id: thread.id,
    guildId: thread.guildId ?? thread.guild?.id ?? null,
    parentId: thread.parentId ?? null,
    ownerId: thread.ownerId ?? null,
    name: sanitizeUntrustedText(thread.name ?? '', 256),
    type: CHANNEL_TYPE_NAMES[thread.type] ?? String(thread.type),
    archived: Boolean(thread.archived),
    autoArchiveDuration: thread.autoArchiveDuration ?? null,
    archiveTimestamp: formatIsoTimestamp(thread.archiveTimestamp),
    locked: Boolean(thread.locked),
    invitable: Boolean(thread.invitable),
    rateLimitPerUser: thread.rateLimitPerUser ?? 0,
    messageCount: thread.messageCount ?? 0,
    memberCount: thread.memberCount ?? 0,
    createdAt: formatIsoTimestamp(thread.createdAt ?? thread.createdTimestamp)
  };
}

export function formatEmoji(emoji) {
  if (!emoji) {
    return null;
  }
  return {
    id: emoji.id,
    guildId: emoji.guild?.id ?? null,
    name: sanitizeUntrustedText(emoji.name ?? '', 128),
    animated: Boolean(emoji.animated),
    available: emoji.available ?? true,
    managed: Boolean(emoji.managed),
    requiresColons: emoji.requiresColons ?? true,
    identifier: emoji.identifier ?? null,
    imageUrl: typeof emoji.imageURL === 'function' ? emoji.imageURL({ size: 256 }) : emoji.url ?? null,
    roles: emoji.roles?.cache ? Array.from(emoji.roles.cache.keys()) : [],
    createdAt: formatIsoTimestamp(emoji.createdAt ?? emoji.createdTimestamp)
  };
}

export function formatSticker(sticker) {
  if (!sticker) {
    return null;
  }
  return {
    id: sticker.id,
    guildId: sticker.guildId ?? sticker.guild?.id ?? null,
    name: sanitizeUntrustedText(sticker.name ?? '', 128),
    description: sticker.description ? sanitizeUntrustedText(sticker.description, 512) : null,
    tags: sticker.tags ? sanitizeUntrustedText(sticker.tags, 256) : null,
    format: sticker.format ?? null,
    available: sticker.available ?? true,
    url: sticker.url ?? null,
    createdAt: formatIsoTimestamp(sticker.createdAt ?? sticker.createdTimestamp)
  };
}

export function formatInvite(invite) {
  if (!invite) {
    return null;
  }
  return {
    code: invite.code,
    url: invite.url ?? `https://discord.gg/${invite.code}`,
    guildId: invite.guild?.id ?? null,
    channelId: invite.channelId ?? invite.channel?.id ?? null,
    channelName: invite.channel?.name ? sanitizeUntrustedText(invite.channel.name, 128) : null,
    inviter: invite.inviter ? formatUser(invite.inviter) : null,
    uses: invite.uses ?? 0,
    maxUses: invite.maxUses ?? 0,
    maxAge: invite.maxAge ?? 0,
    temporary: Boolean(invite.temporary),
    createdAt: formatIsoTimestamp(invite.createdAt ?? invite.createdTimestamp),
    expiresAt: formatIsoTimestamp(invite.expiresAt ?? invite.expiresTimestamp)
  };
}

export function formatWebhook(webhook) {
  if (!webhook) {
    return null;
  }
  return {
    id: webhook.id,
    guildId: webhook.guildId ?? null,
    channelId: webhook.channelId ?? null,
    name: sanitizeUntrustedText(webhook.name ?? '', 128),
    type: webhook.type ?? null,
    avatarUrl: typeof webhook.avatarURL === 'function' ? webhook.avatarURL() : null,
    owner: webhook.owner ? formatUser(webhook.owner) : null,
    applicationId: webhook.applicationId ?? null,
    sourceGuildId: webhook.sourceGuild?.id ?? null,
    sourceChannelId: webhook.sourceChannel?.id ?? null,
    createdAt: formatIsoTimestamp(webhook.createdAt ?? webhook.createdTimestamp),
    tokenRedacted: true
  };
}

export function formatScheduledEvent(event) {
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    guildId: event.guildId ?? event.guild?.id ?? null,
    channelId: event.channelId ?? null,
    creatorId: event.creatorId ?? null,
    name: sanitizeUntrustedText(event.name ?? '', 256),
    description: event.description ? sanitizeUntrustedText(event.description, 1024) : null,
    scheduledStartAt: formatIsoTimestamp(event.scheduledStartAt ?? event.scheduledStartTimestamp),
    scheduledEndAt: formatIsoTimestamp(event.scheduledEndAt ?? event.scheduledEndTimestamp),
    privacyLevel: event.privacyLevel ?? null,
    status: event.status ?? null,
    entityType: event.entityType ?? null,
    entityId: event.entityId ?? null,
    location: event.entityMetadata?.location
      ? sanitizeUntrustedText(event.entityMetadata.location, 256)
      : null,
    userCount: event.userCount ?? 0,
    url: event.url ?? null,
    imageUrl: typeof event.coverImageURL === 'function' ? event.coverImageURL({ size: 1024 }) : null,
    createdAt: formatIsoTimestamp(event.createdAt ?? event.createdTimestamp)
  };
}

export function formatAutoModRule(rule) {
  if (!rule) {
    return null;
  }
  return {
    id: rule.id,
    guildId: rule.guild?.id ?? null,
    name: sanitizeUntrustedText(rule.name ?? '', 256),
    creatorId: rule.creatorId ?? null,
    eventType: rule.eventType ?? null,
    triggerType: rule.triggerType ?? null,
    triggerMetadata: rule.triggerMetadata
      ? {
          keywordFilter: Array.isArray(rule.triggerMetadata.keywordFilter)
            ? rule.triggerMetadata.keywordFilter.map((kw) => sanitizeUntrustedText(kw, 128))
            : [],
          regexPatterns: Array.isArray(rule.triggerMetadata.regexPatterns)
            ? rule.triggerMetadata.regexPatterns.map((rx) => sanitizeUntrustedText(rx, 256))
            : [],
          presets: Array.isArray(rule.triggerMetadata.presets) ? [...rule.triggerMetadata.presets] : [],
          allowList: Array.isArray(rule.triggerMetadata.allowList)
            ? rule.triggerMetadata.allowList.map((item) => sanitizeUntrustedText(item, 128))
            : [],
          mentionTotalLimit: rule.triggerMetadata.mentionTotalLimit ?? null,
          mentionRaidProtectionEnabled: Boolean(rule.triggerMetadata.mentionRaidProtectionEnabled)
        }
      : {},
    actions: Array.isArray(rule.actions)
      ? rule.actions.map((action) => ({
          type: action.type,
          metadata: action.metadata
            ? {
                channelId: action.metadata.channelId ?? null,
                durationSeconds: action.metadata.durationSeconds ?? null,
                customMessage: action.metadata.customMessage
                  ? sanitizeUntrustedText(action.metadata.customMessage, 256)
                  : null
              }
            : {}
        }))
      : [],
    enabled: Boolean(rule.enabled),
    exemptRoles: rule.exemptRoles ? Array.from(rule.exemptRoles.keys?.() ?? rule.exemptRoles) : [],
    exemptChannels: rule.exemptChannels
      ? Array.from(rule.exemptChannels.keys?.() ?? rule.exemptChannels)
      : []
  };
}

export function formatAuditLogEntry(entry) {
  if (!entry) {
    return null;
  }
  return {
    id: entry.id,
    action: entry.action,
    actionType: entry.actionType ?? null,
    targetType: entry.targetType ?? null,
    executorId: entry.executorId ?? entry.executor?.id ?? null,
    executorTag: entry.executor ? sanitizeUntrustedText(entry.executor.tag ?? entry.executor.username ?? '', 128) : null,
    targetId: entry.targetId ?? entry.target?.id ?? null,
    reason: entry.reason ? sanitizeUntrustedText(entry.reason, 512) : null,
    changes: Array.isArray(entry.changes)
      ? entry.changes.map((change) => ({
          key: change.key,
          old: change.old ?? null,
          new: change.new ?? null
        }))
      : [],
    extra: entry.extra ? { ...entry.extra } : null,
    createdAt: formatIsoTimestamp(entry.createdAt ?? entry.createdTimestamp)
  };
}

export function formatApplicationCommand(command) {
  if (!command) {
    return null;
  }
  return {
    id: command.id,
    applicationId: command.applicationId ?? null,
    guildId: command.guildId ?? null,
    name: sanitizeUntrustedText(command.name ?? '', 64),
    description: sanitizeUntrustedText(command.description ?? '', 256),
    type: command.type ?? 1,
    defaultMemberPermissions: command.defaultMemberPermissions?.toArray
      ? command.defaultMemberPermissions.toArray()
      : null,
    dmPermission: command.dmPermission ?? null,
    nsfw: Boolean(command.nsfw),
    version: command.version ?? null,
    optionsCount: Array.isArray(command.options) ? command.options.length : 0,
    options: Array.isArray(command.options)
      ? command.options.map((opt) => ({
          name: sanitizeUntrustedText(opt.name ?? '', 64),
          description: sanitizeUntrustedText(opt.description ?? '', 256),
          type: opt.type,
          required: Boolean(opt.required)
        }))
      : [],
    createdAt: formatIsoTimestamp(command.createdAt ?? command.createdTimestamp)
  };
}

