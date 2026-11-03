/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS } from '../../core/constants.js';
import {
  guildIdSchema,
  channelIdSchema,
  userIdSchema,
  reasonSchema
} from '../../security/validation.js';

export function registerVoiceTools(registry, { voiceManager }) {
  registry.register({
    name: 'get_voice_channels',
    title: 'Get Voice Channels',
    description: 'List all voice and stage channels in a guild along with connected member counts.',
    category: 'voice',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => voiceManager.getVoiceChannels(guildId)
  });

  registry.register({
    name: 'get_voice_channel_members',
    title: 'Get Voice Channel Members',
    description: 'List all members currently connected to a voice or stage channel and their voice states.',
    category: 'voice',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema
    }),
    handler: async (args) => voiceManager.getVoiceChannelMembers(args)
  });

  registry.register({
    name: 'get_member_voice_state',
    title: 'Get Member Voice State',
    description: 'Retrieve a member current voice connection state, channel, mute/deaf flags, and streaming status.',
    category: 'voice',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => voiceManager.getMemberVoiceState(args)
  });

  registry.register({
    name: 'move_member_to_voice_channel',
    title: 'Move Member to Voice Channel',
    description: 'Move an already connected voice member to another voice channel (requires MoveMembers permission).',
    category: 'voice',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      targetChannelId: channelIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => voiceManager.moveMemberToVoiceChannel(args)
  });

  registry.register({
    name: 'disconnect_member_from_voice',
    title: 'Disconnect Member from Voice',
    description: 'Disconnect a member from their current voice channel (requires MoveMembers permission).',
    category: 'voice',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => voiceManager.disconnectMemberFromVoice(args)
  });

  registry.register({
    name: 'edit_voice_channel',
    title: 'Edit Voice Channel',
    description: 'Update voice channel name, bitrate, user limit, or RTC voice region.',
    category: 'voice',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      name: z.string().trim().min(1).max(DISCORD_LIMITS.MAX_CHANNEL_NAME_LENGTH).optional(),
      bitrate: z.number().int().min(8000).max(384000).optional(),
      userLimit: z.number().int().min(0).max(99).optional(),
      rtcRegion: z.string().trim().nullable().optional(),
      reason: reasonSchema
    }),
    handler: async (args) => voiceManager.editVoiceChannel(args)
  });

  registry.register({
    name: 'set_voice_channel_status',
    title: 'Set Voice Channel Status',
    description: 'Set or clear the status text displayed on a voice channel.',
    category: 'voice',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      status: z.string().trim().max(500)
    }),
    handler: async (args) => voiceManager.setVoiceChannelStatus(args)
  });

  registry.register({
    name: 'set_voice_channel_user_limit',
    title: 'Set Voice Channel User Limit',
    description: 'Set the maximum number of concurrent connected users (0 for unlimited, up to 99) in a voice channel.',
    category: 'voice',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      userLimit: z.number().int().min(0).max(99),
      reason: reasonSchema
    }),
    handler: async (args) => voiceManager.setVoiceChannelUserLimit(args)
  });

  registry.register({
    name: 'set_voice_channel_bitrate',
    title: 'Set Voice Channel Bitrate',
    description: 'Set the audio bitrate (in bits per second, e.g., 64000) of a voice channel.',
    category: 'voice',
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema,
      bitrate: z.number().int().min(8000).max(384000),
      reason: reasonSchema
    }),
    handler: async (args) => voiceManager.setVoiceChannelBitrate(args)
  });
}

