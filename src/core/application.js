/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ConfigurationManager } from './config.js';
import { createLogger } from '../utils/logger.js';
import { registerSecretForRedaction } from '../security/secret-redaction.js';
import { ConfirmationManager } from '../security/confirmation.js';
import { RateLimiter } from '../security/rate-limiter.js';
import { RequestLimitsManager } from '../security/request-limits.js';
import { OriginValidator } from '../security/origin-validator.js';
import { HostValidator } from '../security/host-validator.js';
import { DatabaseManager } from '../database/database.js';
import { ApiKeyManager } from '../auth/api-keys.js';
import { OAuthResourceProvider } from '../auth/oauth/oauth-provider.js';
import { AuthenticationManager } from '../auth/authentication.js';
import { AuthorizationManager } from '../auth/authorization.js';
import { DiscordClientManager } from '../discord/client.js';
import { PermissionService } from '../services/permissions/permission-service.js';
import { AuditService } from '../services/audit/audit-service.js';
import { ModerationService } from '../services/moderation/moderation-service.js';
import { DiagnosticsService } from '../services/diagnostics/diagnostics-service.js';
import { BackupService } from '../services/backup/backup-service.js';
import { BotManager } from '../discord/managers/bot-manager.js';
import { GuildManager } from '../discord/managers/guild-manager.js';
import { ChannelManager } from '../discord/managers/channel-manager.js';
import { VoiceManager } from '../discord/managers/voice-manager.js';
import { RoleManager } from '../discord/managers/role-manager.js';
import { MemberManager } from '../discord/managers/member-manager.js';
import { ModerationManager } from '../discord/managers/moderation-manager.js';
import { MessageManager } from '../discord/managers/message-manager.js';
import { ThreadManager } from '../discord/managers/thread-manager.js';
import { EmojiManager } from '../discord/managers/emoji-manager.js';
import { StickerManager } from '../discord/managers/sticker-manager.js';
import { InviteManager } from '../discord/managers/invite-manager.js';
import { WebhookManager } from '../discord/managers/webhook-manager.js';
import { EventManager } from '../discord/managers/event-manager.js';
import { AutoModManager } from '../discord/managers/automod-manager.js';
import { CommandManager } from '../discord/managers/command-manager.js';
import { DiscordMcpServer } from '../mcp/server.js';
import { SessionManager } from '../transport/sessions.js';
import { StreamableHttpTransportManager } from '../transport/http.js';
import { TransportLifecycleManager } from '../transport/lifecycle.js';
import { CorsManager } from '../http/middleware/cors.js';
import { createHttpServer } from '../http/plugins/index.js';

export class DiscordRemoteMcpApplication {
  constructor({
    env = process.env,
    requireToken = true,
    customClient = null,
    loggerDestination = undefined
  } = {}) {
    this.configManager = new ConfigurationManager(env, { requireToken });
    this.config = this.configManager.config;

    if (this.config.discordToken) {
      registerSecretForRedaction(this.config.discordToken);
    }
    if (this.config.auth.oauth.clientSecret) {
      registerSecretForRedaction(this.config.auth.oauth.clientSecret);
    }

    this.logger = createLogger({
      level: this.config.logLevel,
      destination: loggerDestination
    });

    this.databaseManager = new DatabaseManager({
      databasePath: this.config.databasePath,
      enableAuditHistory: this.config.security.enableAuditHistory,
      logger: this.logger
    });

    this.confirmationManager = new ConfirmationManager({
      requireConfirmation: this.config.security.requireConfirmationForDestructive
    });

    this.rateLimiter = new RateLimiter({
      enabled: this.config.rateLimit.enabled,
      globalPerMinute: this.config.rateLimit.globalPerMinute,
      identityPerMinute: this.config.rateLimit.identityPerMinute,
      toolCallsPerMinute: this.config.rateLimit.toolCallsPerMinute,
      authFailuresPerMinute: this.config.rateLimit.authFailuresPerMinute,
      maxMessagesPerMinute: this.config.rateLimit.maxMessagesPerMinute,
      maxDestructivePerMinute: this.config.rateLimit.maxDestructivePerMinute
    });

    this.requestLimitsManager = new RequestLimitsManager({
      maxRequestSize: this.config.network.maxRequestSize,
      requestTimeoutMs: this.config.network.requestTimeoutMs,
      toolTimeoutMs: this.config.network.toolTimeoutMs,
      maxConcurrentRequests: this.config.network.maxConcurrentRequests
    });

    this.originValidator = new OriginValidator({
      allowedOrigins: this.config.network.allowedOrigins,
      logger: this.logger
    });

    this.hostValidator = new HostValidator({
      allowedHosts: this.config.network.allowedHosts,
      trustProxy: this.config.network.trustProxy,
      logger: this.logger
    });

    this.corsManager = new CorsManager({
      config: this.config,
      originValidator: this.originValidator
    });

    const resolvedClient = customClient?.client || customClient;
    this.discordClientManager = new DiscordClientManager({
      config: this.config,
      logger: this.logger,
      clientInstance: resolvedClient
    });

    this.permissionService = new PermissionService({
      config: this.config,
      configManager: this.configManager,
      logger: this.logger
    });

    this.auditService = new AuditService({
      databaseManager: this.databaseManager,
      permissionService: this.permissionService,
      logger: this.logger
    });

    this.moderationService = new ModerationService({
      databaseManager: this.databaseManager,
      permissionService: this.permissionService,
      logger: this.logger
    });

    this.diagnosticsService = new DiagnosticsService({
      discordClientManager: this.discordClientManager,
      config: this.config,
      configManager: this.configManager,
      databaseManager: this.databaseManager,
      permissionService: this.permissionService
    });

    this.backupService = new BackupService({
      config: this.config,
      configManager: this.configManager,
      databaseManager: this.databaseManager,
      auditService: this.auditService,
      permissionService: this.permissionService,
      logger: this.logger
    });

    const managerDeps = {
      config: this.config,
      discordClientManager: this.discordClientManager,
      configManager: this.configManager,
      databaseManager: this.databaseManager,
      permissionService: this.permissionService,
      moderationService: this.moderationService,
      auditService: this.auditService,
      diagnosticsService: this.diagnosticsService,
      backupService: this.backupService,
      rateLimiter: this.rateLimiter,
      confirmationManager: this.confirmationManager,
      logger: this.logger
    };

    this.botManager = new BotManager(managerDeps);
    this.guildManager = new GuildManager(managerDeps);
    this.channelManager = new ChannelManager(managerDeps);
    this.voiceManager = new VoiceManager(managerDeps);
    this.roleManager = new RoleManager(managerDeps);
    this.memberManager = new MemberManager({
      ...managerDeps,
      roleManager: this.roleManager,
      voiceManager: this.voiceManager
    });
    this.messageManager = new MessageManager(managerDeps);
    this.moderationManager = new ModerationManager({
      ...managerDeps,
      memberManager: this.memberManager,
      guildManager: this.guildManager,
      messageManager: this.messageManager
    });
    this.threadManager = new ThreadManager(managerDeps);
    this.emojiManager = new EmojiManager(managerDeps);
    this.stickerManager = new StickerManager(managerDeps);
    this.inviteManager = new InviteManager(managerDeps);
    this.webhookManager = new WebhookManager({
      ...managerDeps,
      messageManager: this.messageManager
    });
    this.eventManager = new EventManager(managerDeps);
    this.autoModManager = new AutoModManager(managerDeps);
    this.commandManager = new CommandManager(managerDeps);

    this.apiKeyManager = null;
    this.oauthProvider = null;
    this.authenticationManager = null;
    this.authorizationManager = new AuthorizationManager({
      config: this.config,
      logger: this.logger
    });

    this.mcpServer = null;
    this.sessionManager = null;
    this.transportManager = null;
    this.httpServer = null;
    this.transportLifecycle = null;
    this.started = false;
  }

  initializeCore() {
    this.databaseManager.initialize();

    this.apiKeyManager = new ApiKeyManager({
      apiKeyRepo: this.databaseManager.apiKeyRepo,
      config: this.config,
      logger: this.logger
    });

    this.oauthProvider = new OAuthResourceProvider({
      config: this.config,
      oauthRepo: this.databaseManager.oauthRepo,
      logger: this.logger
    });

    this.authenticationManager = new AuthenticationManager({
      config: this.config,
      apiKeyManager: this.apiKeyManager,
      oauthProvider: this.oauthProvider,
      rateLimiter: this.rateLimiter,
      logger: this.logger
    });

    this.mcpServer = new DiscordMcpServer({
      config: this.config,
      discordClientManager: this.discordClientManager,
      configManager: this.configManager,
      databaseManager: this.databaseManager,
      authorizationManager: this.authorizationManager,
      permissionService: this.permissionService,
      moderationService: this.moderationService,
      auditService: this.auditService,
      diagnosticsService: this.diagnosticsService,
      backupService: this.backupService,
      confirmationManager: this.confirmationManager,
      rateLimiter: this.rateLimiter,
      requestLimitsManager: this.requestLimitsManager,
      botManager: this.botManager,
      guildManager: this.guildManager,
      channelManager: this.channelManager,
      voiceManager: this.voiceManager,
      roleManager: this.roleManager,
      memberManager: this.memberManager,
      moderationManager: this.moderationManager,
      messageManager: this.messageManager,
      threadManager: this.threadManager,
      emojiManager: this.emojiManager,
      stickerManager: this.stickerManager,
      inviteManager: this.inviteManager,
      webhookManager: this.webhookManager,
      eventManager: this.eventManager,
      autoModManager: this.autoModManager,
      commandManager: this.commandManager,
      logger: this.logger
    });

    this.sessionManager = new SessionManager({
      mode: this.config.session.mode,
      ttlSeconds: this.config.session.ttlSeconds,
      maxSessionsPerIdentity: this.config.session.maxSessionsPerIdentity,
      maxTotalSessions: this.config.session.maxTotalSessions,
      sessionRepo: this.databaseManager.sessionRepo,
      logger: this.logger
    });

    if (this.config.session.mode === 'stateful') {
      this.sessionManager.startCleanupInterval();
    }

    this.transportManager = new StreamableHttpTransportManager({
      discordMcpServer: this.mcpServer,
      sessionManager: this.sessionManager,
      authorizationManager: this.authorizationManager,
      config: this.config,
      logger: this.logger
    });

    this.httpServer = createHttpServer({
      config: this.config,
      databaseManager: this.databaseManager,
      discordClientManager: this.discordClientManager,
      hostValidator: this.hostValidator,
      originValidator: this.originValidator,
      corsManager: this.corsManager,
      rateLimiter: this.rateLimiter,
      requestLimitsManager: this.requestLimitsManager,
      authenticationManager: this.authenticationManager,
      oauthProvider: this.oauthProvider,
      transportManager: this.transportManager,
      logger: this.logger
    });

    this.transportLifecycle = new TransportLifecycleManager({
      sessionManager: this.sessionManager,
      fastifyServer: this.httpServer,
      logger: this.logger
    });

    return this;
  }

  async start({ connectDiscord = true, listenHttp = true } = {}) {
    if (!this.mcpServer) {
      this.initializeCore();
    }

    if (connectDiscord) {
      await this.discordClientManager.connect();
    }

    let listenAddress = null;
    if (listenHttp) {
      listenAddress = await this.httpServer.listen({
        host: this.config.network.host,
        port: this.config.network.port
      });
      this.logger.info(
        {
          address: listenAddress,
          mcpEndpoint: `${listenAddress}${this.config.network.mcpPath}`,
          healthEndpoint: `${listenAddress}/healthz`,
          sessionMode: this.config.session.mode,
          authMode: this.config.auth.mode
        },
        'Discord AI MCP Remote HTTP server started'
      );
    }

    this.started = true;
    return {
      address: listenAddress,
      app: this
    };
  }

  async shutdown() {
    this.logger?.info('Shutting down Discord AI MCP Remote application');
    await this.transportLifecycle?.closeAll();
    await this.mcpServer?.close();
    await this.discordClientManager?.disconnect();
    this.databaseManager?.close();
    this.started = false;
  }
}
