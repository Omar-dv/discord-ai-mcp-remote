#!/usr/bin/env node
/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { DiscordRemoteMcpApplication } from '../src/core/application.js';
import { PROJECT_IDENTITY } from '../src/core/constants.js';

async function runDiagnostics() {
  const checks = {
    project: PROJECT_IDENTITY.name,
    version: PROJECT_IDENTITY.version,
    officialAttribution: PROJECT_IDENTITY.officialAttribution,
    timestamp: new Date().toISOString(),
    nodeRuntime: {
      version: process.version,
      major: Number(process.versions.node.split('.')[0]),
      compatible: Number(process.versions.node.split('.')[0]) >= 20
    },
    configuration: null,
    httpBinding: null,
    tlsAndReverseProxy: null,
    authentication: null,
    database: null,
    mcpServer: null,
    discordGateway: null,
    status: 'healthy'
  };

  let app = null;
  try {
    app = new DiscordRemoteMcpApplication({ requireToken: false });
    app.initializeCore();

    const safeConfig = app.configManager.getSafePublicConfig();
    checks.configuration = {
      valid: true,
      hasDiscordToken: safeConfig.hasDiscordToken,
      enabledIntents: safeConfig.enabledIntents
    };

    checks.httpBinding = {
      host: safeConfig.network.host,
      port: safeConfig.network.port,
      mcpPath: safeConfig.network.mcpPath,
      publicBaseUrl: safeConfig.network.publicBaseUrl,
      isLocalhostBound: ['127.0.0.1', 'localhost', '::1'].includes(safeConfig.network.host),
      allowedHosts: safeConfig.network.allowedHosts,
      allowedOrigins: safeConfig.network.allowedOrigins
    };

    const usesHttpsPublic = safeConfig.network.publicBaseUrl.startsWith('https://');
    checks.tlsAndReverseProxy = {
      publicEndpointUsesHttps: usesHttpsPublic,
      trustProxyEnabled: safeConfig.network.trustProxy,
      recommendation:
        !usesHttpsPublic && safeConfig.nodeEnv === 'production'
          ? 'Configure HTTPS via Nginx, Caddy, or Cloudflare Tunnel for internet-facing deployments.'
          : 'Configuration valid'
    };

    const activeDbKeys = app.databaseManager.apiKeyRepo.listActiveKeys();
    const hasActiveCredential =
      Boolean(safeConfig.auth.hasEnvApiKeyHash) ||
      activeDbKeys.length > 0 ||
      Boolean(safeConfig.auth.oauthConfigured);

    checks.authentication = {
      mode: safeConfig.auth.mode,
      hasEnvApiKeyHash: safeConfig.auth.hasEnvApiKeyHash,
      activeDatabaseApiKeys: activeDbKeys.length,
      oauthConfigured: safeConfig.auth.oauthConfigured,
      ready: hasActiveCredential
    };

    checks.database = {
      healthy: app.databaseManager.isHealthy(),
      path: safeConfig.databasePath,
      migrations: app.databaseManager.getAppliedMigrations()
    };

    checks.mcpServer = {
      ready: true,
      transport: PROJECT_IDENTITY.transport,
      sessionMode: safeConfig.session.mode,
      registeredToolsCount: app.mcpServer.toolRegistry.registeredTools.size,
      staticResourcesCount: app.mcpServer.resourceRegistry.staticResources.size,
      templateResourcesCount: app.mcpServer.resourceRegistry.templateResources.size,
      registeredPromptsCount: app.mcpServer.promptRegistry.registeredPrompts.size
    };

    checks.discordGateway = {
      tokenConfigured: safeConfig.hasDiscordToken,
      status: app.discordClientManager.isReady() ? 'connected' : 'standby_not_connected'
    };

    if (!checks.nodeRuntime.compatible || !checks.database.healthy) {
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.status = 'error';
    checks.error = {
      code: error.code || 'DIAGNOSTICS_ERROR',
      message: error.message
    };
  } finally {
    if (app) {
      await app.shutdown().catch(() => {});
    }
  }

  process.stdout.write(JSON.stringify(checks, null, 2) + '\n');
  if (checks.status === 'error') {
    process.exit(1);
  }
}

runDiagnostics();
