/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ResourceTemplate } from '@modelcontextprotocol/server';
import { AUTH_SCOPES, ERROR_CODES, PROJECT_IDENTITY } from '../../core/constants.js';
import { assertValidSnowflake } from '../../security/validation.js';
import { redactObject } from '../../security/secret-redaction.js';
import { normalizeError } from '../../utils/errors.js';

function buildJsonResourceResponse(uri, payload) {
  return {
    contents: [
      {
        uri: typeof uri === 'string' ? uri : uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(redactObject(payload), null, 2)
      }
    ]
  };
}

export class ResourceRegistry {
  constructor({
    mcpServer,
    authorizationManager,
    botManager,
    guildManager,
    memberManager,
    diagnosticsService,
    permissionService,
    discordClientManager,
    logger
  } = {}) {
    this.mcpServer = mcpServer;
    this.authorizationManager = authorizationManager;
    this.botManager = botManager;
    this.guildManager = guildManager;
    this.memberManager = memberManager;
    this.diagnosticsService = diagnosticsService;
    this.permissionService = permissionService;
    this.discordClientManager = discordClientManager;
    this.logger = logger;
    this.staticResources = new Map();
    this.templateResources = new Map();
  }

  registerStatic({ name, uri, title, description, requiredScopes = [AUTH_SCOPES.READ], handler }) {
    const wrappedRead = async (uriObj, ctx = {}) => {
      try {
        if (this.authorizationManager) {
          this.authorizationManager.assertResourceAuthorized(ctx, {
            uri,
            requiredScopes
          });
        }
        const data = await handler(uriObj, ctx);
        return buildJsonResourceResponse(uriObj || uri, {
          ok: true,
          uri,
          data
        });
      } catch (error) {
        const normalized = normalizeError(error);
        return buildJsonResourceResponse(uriObj || uri, {
          ok: false,
          uri,
          error: normalized.toPublicObject()
        });
      }
    };

    const handle = this.mcpServer.registerResource(
      name,
      uri,
      {
        title,
        description,
        mimeType: 'application/json'
      },
      wrappedRead
    );

    const record = {
      name,
      uri,
      title,
      description,
      requiredScopes,
      isTemplate: false,
      read: wrappedRead,
      handle
    };

    this.staticResources.set(uri, record);
    return record;
  }

  registerTemplate({
    name,
    uriTemplate,
    title,
    description,
    suffix,
    requiredScopes = [AUTH_SCOPES.READ],
    handler
  }) {
    const listCallback = async (ctx = {}) => {
      if (!this.discordClientManager?.isReady()) {
        return { resources: [] };
      }
      const rawGuilds = this.discordClientManager.client?.guilds?.cache
        ? Array.from(this.discordClientManager.client.guilds.cache.values())
        : [];
      const guilds = this.authorizationManager
        ? this.authorizationManager.filterAccessibleGuilds(ctx, rawGuilds)
        : rawGuilds;
      return {
        resources: guilds.map((g) => ({
          uri: `discord://guild/${g.id}/${suffix}`,
          name: `${g.name} - ${title}`,
          description,
          mimeType: 'application/json'
        }))
      };
    };

    const completeGuildId = async (value, ctx = {}) => {
      if (!this.discordClientManager?.isReady()) {
        return [];
      }
      const rawGuilds = this.discordClientManager.client?.guilds?.cache
        ? Array.from(this.discordClientManager.client.guilds.cache.values())
        : [];
      const guilds = this.authorizationManager
        ? this.authorizationManager.filterAccessibleGuilds(ctx, rawGuilds)
        : rawGuilds;
      return guilds.map((g) => g.id).filter((id) => id.startsWith(value || ''));
    };

    const template = new ResourceTemplate(uriTemplate, {
      list: listCallback,
      complete: {
        guildId: completeGuildId
      }
    });

    const wrappedRead = async (uriObj, variables = {}, ctx = {}) => {
      const rawGuildId = Array.isArray(variables.guildId)
        ? variables.guildId[0]
        : variables.guildId;
      try {
        const guildId = assertValidSnowflake(
          rawGuildId,
          ERROR_CODES.INVALID_GUILD_ID,
          'guildId'
        );
        if (this.authorizationManager) {
          this.authorizationManager.assertResourceAuthorized(ctx, {
            uri: `discord://guild/${guildId}/${suffix}`,
            guildId,
            requiredScopes
          });
        }
        const data = await handler(guildId, uriObj, ctx);
        return buildJsonResourceResponse(uriObj || `discord://guild/${guildId}/${suffix}`, {
          ok: true,
          uri: typeof uriObj === 'string' ? uriObj : uriObj?.href,
          guildId,
          data
        });
      } catch (error) {
        const normalized = normalizeError(error);
        return buildJsonResourceResponse(
          uriObj || `discord://guild/${rawGuildId || 'unknown'}/${suffix}`,
          {
            ok: false,
            guildId: rawGuildId || null,
            error: normalized.toPublicObject()
          }
        );
      }
    };

    const handle = this.mcpServer.registerResource(
      name,
      template,
      {
        title,
        description,
        mimeType: 'application/json'
      },
      wrappedRead
    );

    const record = {
      name,
      uriTemplate,
      title,
      description,
      requiredScopes,
      isTemplate: true,
      read: wrappedRead,
      handle
    };

    this.templateResources.set(uriTemplate, record);
    return record;
  }

  listAllResources() {
    return [
      ...Array.from(this.staticResources.values()).map((r) => ({
        name: r.name,
        uri: r.uri,
        title: r.title,
        description: r.description,
        requiredScopes: r.requiredScopes,
        isTemplate: false
      })),
      ...Array.from(this.templateResources.values()).map((r) => ({
        name: r.name,
        uriTemplate: r.uriTemplate,
        title: r.title,
        description: r.description,
        requiredScopes: r.requiredScopes,
        isTemplate: true
      }))
    ];
  }
}

export function registerAllResources(mcpServer, dependencies) {
  const {
    authorizationManager,
    botManager,
    guildManager,
    memberManager,
    diagnosticsService,
    permissionService,
    discordClientManager,
    logger
  } = dependencies;

  const registry = new ResourceRegistry({
    mcpServer,
    authorizationManager,
    botManager,
    guildManager,
    memberManager,
    diagnosticsService,
    permissionService,
    discordClientManager,
    logger
  });

  registry.registerStatic({
    name: 'project_info',
    uri: 'discord://project/info',
    title: 'Project Information',
    description: 'Complete Discord AI MCP Remote project metadata, transport details, and official attribution.',
    handler: async () => ({
      ...PROJECT_IDENTITY,
      architecture: 'Remote Streamable HTTP Model Context Protocol Server for Discord Management'
    })
  });

  registry.registerStatic({
    name: 'project_creator',
    uri: 'discord://project/creator',
    title: 'Project Creator & Owner Attribution',
    description: 'Official creator and owner attribution for Discord AI MCP Remote.',
    handler: async () => ({
      creator: PROJECT_IDENTITY.creator,
      officialAttribution: PROJECT_IDENTITY.officialAttribution,
      copyright: PROJECT_IDENTITY.copyright,
      license: PROJECT_IDENTITY.license
    })
  });

  registry.registerStatic({
    name: 'project_version',
    uri: 'discord://project/version',
    title: 'Project & Runtime Versions',
    description: 'Project version, Discord.js version, Node.js runtime version, and creator attribution.',
    handler: async () => botManager.getBotVersion()
  });

  registry.registerStatic({
    name: 'bot_info',
    uri: 'discord://bot/info',
    title: 'Discord Bot Information',
    description: 'Connected Discord bot user profile, application ID, and guild count.',
    handler: async () => botManager.getBotInfo()
  });

  registry.registerStatic({
    name: 'bot_status',
    uri: 'discord://bot/status',
    title: 'Discord Bot Status',
    description: 'Current Gateway connection status, uptime, and latency.',
    handler: async () => ({
      status: botManager.getBotStatus(),
      gateway: botManager.getBotGatewayStatus()
    })
  });

  registry.registerStatic({
    name: 'bot_permissions',
    uri: 'discord://bot/permissions',
    title: 'Discord Bot Permissions Summary Across Guilds',
    description: 'Summary of bot permissions across all accessible Discord servers.',
    handler: async (_uriObj, ctx) => {
      const client = discordClientManager.ensureReady();
      const rawGuilds = client.guilds?.cache
        ? Array.from(client.guilds.cache.values())
        : [];
      const guilds = authorizationManager
        ? authorizationManager.filterAccessibleGuilds(ctx, rawGuilds)
        : rawGuilds;
      return {
        guildsCount: guilds.length,
        permissionsByGuild: guilds.map((guild) =>
          permissionService.getBotPermissionReport(guild)
        )
      };
    }
  });

  registry.registerStatic({
    name: 'bot_guilds',
    uri: 'discord://bot/guilds',
    title: 'Bot Connected Guilds',
    description: 'List of all Discord guilds the bot is currently connected to and authorized for the caller.',
    handler: async (_uriObj, ctx) => {
      const res = botManager.getBotGuilds();
      if (!authorizationManager) {
        return res;
      }
      const filtered = authorizationManager.filterAccessibleGuilds(ctx, res.guilds || []);
      return {
        count: filtered.length,
        guilds: filtered
      };
    }
  });

  registry.registerStatic({
    name: 'guilds_list',
    uri: 'discord://guilds',
    title: 'Available Discord Guilds',
    description: 'List of all accessible Discord servers and their summary metadata.',
    handler: async (_uriObj, ctx) => {
      const res = guildManager.listGuilds();
      if (!authorizationManager) {
        return res;
      }
      const filtered = authorizationManager.filterAccessibleGuilds(ctx, res.guilds || []);
      return {
        count: filtered.length,
        guilds: filtered
      };
    }
  });

  registry.registerTemplate({
    name: 'guild_info_resource',
    uriTemplate: 'discord://guild/{guildId}/info',
    suffix: 'info',
    title: 'Guild Information',
    description: 'Detailed guild profile, settings, and feature flags for a specific Discord server.',
    handler: async (guildId) => guildManager.getGuildInfo(guildId)
  });

  registry.registerTemplate({
    name: 'guild_channels_resource',
    uriTemplate: 'discord://guild/{guildId}/channels',
    suffix: 'channels',
    title: 'Guild Channels',
    description: 'All channels and categories in the specified Discord server.',
    requiredScopes: [AUTH_SCOPES.READ, AUTH_SCOPES.CHANNELS_READ],
    handler: async (guildId) => guildManager.getGuildChannels(guildId)
  });

  registry.registerTemplate({
    name: 'guild_roles_resource',
    uriTemplate: 'discord://guild/{guildId}/roles',
    suffix: 'roles',
    title: 'Guild Roles',
    description: 'All roles ordered by hierarchy position in the specified Discord server.',
    requiredScopes: [AUTH_SCOPES.READ, AUTH_SCOPES.ROLES_READ],
    handler: async (guildId) => guildManager.getGuildRoles(guildId)
  });

  registry.registerTemplate({
    name: 'guild_members_resource',
    uriTemplate: 'discord://guild/{guildId}/members',
    suffix: 'members',
    title: 'Guild Members',
    description: 'Member count and cached/listed members for the specified Discord server.',
    requiredScopes: [AUTH_SCOPES.READ, AUTH_SCOPES.MEMBERS_READ],
    handler: async (guildId) => memberManager.listGuildMembers({ guildId, limit: 100 })
  });

  registry.registerTemplate({
    name: 'guild_emojis_resource',
    uriTemplate: 'discord://guild/{guildId}/emojis',
    suffix: 'emojis',
    title: 'Guild Emojis',
    description: 'All custom emojis in the specified Discord server.',
    handler: async (guildId) => guildManager.getGuildEmojis(guildId)
  });

  registry.registerTemplate({
    name: 'guild_stickers_resource',
    uriTemplate: 'discord://guild/{guildId}/stickers',
    suffix: 'stickers',
    title: 'Guild Stickers',
    description: 'All custom stickers in the specified Discord server.',
    handler: async (guildId) => guildManager.getGuildStickers(guildId)
  });

  registry.registerTemplate({
    name: 'guild_events_resource',
    uriTemplate: 'discord://guild/{guildId}/events',
    suffix: 'events',
    title: 'Guild Scheduled Events',
    description: 'Scheduled events in the specified Discord server.',
    handler: async (guildId) => guildManager.getGuildEvents(guildId)
  });

  registry.registerTemplate({
    name: 'guild_automod_resource',
    uriTemplate: 'discord://guild/{guildId}/automod',
    suffix: 'automod',
    title: 'Guild AutoMod Rules',
    description: 'Auto Moderation rules configured in the specified Discord server.',
    requiredScopes: [AUTH_SCOPES.READ, AUTH_SCOPES.AUTOMOD_MANAGE],
    handler: async (guildId) => guildManager.getGuildAutoModRules(guildId)
  });

  registry.registerTemplate({
    name: 'guild_audit_logs_resource',
    uriTemplate: 'discord://guild/{guildId}/audit-logs',
    suffix: 'audit-logs',
    title: 'Guild Audit Logs',
    description: 'Recent Discord audit log entries for the specified server.',
    requiredScopes: [AUTH_SCOPES.READ, AUTH_SCOPES.MEMBERS_MODERATE],
    handler: async (guildId) => guildManager.getGuildAuditLogs(guildId, { limit: 25 })
  });

  registry.registerTemplate({
    name: 'guild_statistics_resource',
    uriTemplate: 'discord://guild/{guildId}/statistics',
    suffix: 'statistics',
    title: 'Guild Statistics',
    description: 'Channel, role, member, emoji, sticker, and boost statistics for the server.',
    handler: async (guildId) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.getServerStatistics(guild);
    }
  });

  registry.registerTemplate({
    name: 'guild_security_resource',
    uriTemplate: 'discord://guild/{guildId}/security',
    suffix: 'security',
    title: 'Guild Security Overview',
    description: 'Security evaluation, verification level, MFA status, and high-risk permission findings.',
    handler: async (guildId) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.getServerSecurityOverview(guild);
    }
  });

  registry.registerTemplate({
    name: 'guild_structure_resource',
    uriTemplate: 'discord://guild/{guildId}/structure',
    suffix: 'structure',
    title: 'Guild Structure Tree',
    description: 'Category and channel hierarchy tree of the specified Discord server.',
    handler: async (guildId) => {
      const guild = await discordClientManager.getGuildOrThrow(guildId);
      return diagnosticsService.getServerStructure(guild);
    }
  });

  return registry;
}
