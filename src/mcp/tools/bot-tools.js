/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { guildIdSchema, channelIdSchema } from '../../security/validation.js';

export function registerBotTools(registry, { botManager }) {
  registry.register({
    name: 'get_bot_info',
    title: 'Get Bot Info',
    description: 'Retrieve Discord bot identity, user profile, application ID, and project attribution.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotInfo()
  });

  registry.register({
    name: 'get_bot_status',
    title: 'Get Bot Status',
    description: 'Retrieve current Discord bot connection state, online presence, and activities.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotStatus()
  });

  registry.register({
    name: 'get_bot_application',
    title: 'Get Bot Application',
    description: 'Retrieve Discord Developer Portal application metadata for the configured bot.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotApplication()
  });

  registry.register({
    name: 'get_bot_guilds',
    title: 'Get Bot Guilds',
    description: 'List all Discord servers (guilds) that the bot is currently connected to.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotGuilds()
  });

  registry.register({
    name: 'get_bot_permissions',
    title: 'Get Bot Permissions',
    description: 'Inspect the bot granted and missing permissions in a specific guild and optional channel.',
    category: 'bot',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      channelId: channelIdSchema.optional()
    }),
    handler: async (args) => botManager.getBotPermissions(args)
  });

  registry.register({
    name: 'get_bot_latency',
    title: 'Get Bot Latency',
    description: 'Measure current Discord WebSocket Gateway ping latency in milliseconds.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotLatency()
  });

  registry.register({
    name: 'get_bot_uptime',
    title: 'Get Bot Uptime',
    description: 'Retrieve bot session uptime and Node.js process uptime.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotUptime()
  });

  registry.register({
    name: 'get_bot_version',
    title: 'Get Bot Version',
    description: 'Retrieve Discord AI MCP version, Discord.js version, Node.js runtime version, and creator attribution.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotVersion()
  });

  registry.register({
    name: 'get_bot_configuration',
    title: 'Get Bot Configuration',
    description: 'Retrieve active non-sensitive bot configuration, intents preset, and security rate limits.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotConfiguration()
  });

  registry.register({
    name: 'get_bot_statistics',
    title: 'Get Bot Statistics',
    description: 'Retrieve aggregate bot statistics including guild count, approximate members, cache sizes, and memory usage.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotStatistics()
  });

  registry.register({
    name: 'get_bot_gateway_status',
    title: 'Get Bot Gateway Status',
    description: 'Inspect Discord Gateway WebSocket connection status and shard health.',
    category: 'bot',
    readOnly: true,
    schema: z.object({}),
    handler: async () => botManager.getBotGatewayStatus()
  });

  registry.register({
    name: 'get_bot_invite_url',
    title: 'Get Bot Invite URL',
    description: 'Generate an OAuth2 bot invite URL with customizable Discord permission flags.',
    category: 'bot',
    readOnly: true,
    schema: z.object({
      permissions: z
        .array(z.string().trim().min(1))
        .optional()
        .describe('Optional list of Discord permission names to include in the invite URL')
    }),
    handler: async (args) => botManager.getBotInviteUrl(args)
  });
}

