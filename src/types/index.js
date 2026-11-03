/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { GatewayIntentBits, ChannelType } from 'discord.js';

export const CHANNEL_TYPE_MAP = Object.freeze({
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  category: ChannelType.GuildCategory,
  announcement: ChannelType.GuildAnnouncement,
  stage: ChannelType.GuildStageVoice,
  forum: ChannelType.GuildForum,
  media: ChannelType.GuildMedia,
  public_thread: ChannelType.PublicThread,
  private_thread: ChannelType.PrivateThread,
  announcement_thread: ChannelType.AnnouncementThread
});

export const CHANNEL_TYPE_NAMES = Object.freeze({
  [ChannelType.GuildText]: 'text',
  [ChannelType.DM]: 'dm',
  [ChannelType.GuildVoice]: 'voice',
  [ChannelType.GroupDM]: 'group_dm',
  [ChannelType.GuildCategory]: 'category',
  [ChannelType.GuildAnnouncement]: 'announcement',
  [ChannelType.AnnouncementThread]: 'announcement_thread',
  [ChannelType.PublicThread]: 'public_thread',
  [ChannelType.PrivateThread]: 'private_thread',
  [ChannelType.GuildStageVoice]: 'stage',
  [ChannelType.GuildDirectory]: 'directory',
  [ChannelType.GuildForum]: 'forum',
  [ChannelType.GuildMedia]: 'media'
});

export const PRIVILEGED_INTENT_NAMES = Object.freeze({
  GuildMembers: GatewayIntentBits.GuildMembers,
  GuildPresences: GatewayIntentBits.GuildPresences,
  MessageContent: GatewayIntentBits.MessageContent
});

export const BASE_GATEWAY_INTENTS = Object.freeze([
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildExpressions,
  GatewayIntentBits.GuildIntegrations,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildScheduledEvents,
  GatewayIntentBits.AutoModerationConfiguration,
  GatewayIntentBits.AutoModerationExecution
]);

