/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import * as z from 'zod/v4';
import { GatewayIntentBits } from 'discord.js';
import { ALL_AUTH_SCOPES, ERROR_CODES, LOG_LEVELS } from './constants.js';
import { AppError } from '../utils/errors.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT_DIR = path.resolve(MODULE_DIR, '../..');

dotenv.config({ path: path.resolve(PROJECT_ROOT_DIR, '.env'), quiet: true });

const booleanFromEnv = (defaultValue) =>
  z
    .preprocess((val) => {
      if (val === undefined || val === null || val === '') {
        return defaultValue;
      }
      if (typeof val === 'boolean') {
        return val;
      }
      const normalized = String(val).trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
      return val;
    }, z.boolean());

const integerFromEnv = (defaultValue, min, max) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') {
      return defaultValue;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
  }, z.number().int().min(min).max(max));

const csvListFromEnv = (defaultList = []) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') {
      return defaultList;
    }
    if (Array.isArray(val)) {
      return val.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(val)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(z.string()));

const resolveFromRoot = (targetPath) => {
  if (!targetPath || targetPath === ':memory:') {
    return targetPath;
  }
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(PROJECT_ROOT_DIR, targetPath);
};

export const ENV_SCHEMA = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: integerFromEnv(3000, 0, 65535),
  MCP_PATH: z
    .string()
    .trim()
    .default('/mcp')
    .refine((p) => p.startsWith('/'), {
      message: 'MCP_PATH must start with a forward slash (/)'
    }),
  PUBLIC_BASE_URL: z.string().trim().default('http://127.0.0.1:3000'),
  DISCORD_TOKEN: z.string().trim().optional().default(''),
  DISCORD_APPLICATION_ID: z
    .string()
    .trim()
    .regex(/^(\d{17,20})?$/, 'Invalid Discord Application ID format')
    .optional()
    .default(''),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  DATABASE_PATH: z.string().trim().min(1).default('./data/database.sqlite'),
  BACKUP_DIRECTORY: z.string().trim().min(1).default('./data/backups'),
  AUTH_MODE: z.enum(['api_key', 'oauth', 'hybrid']).default('api_key'),
  API_KEY_HASH: z.string().trim().optional().default(''),
  API_KEY_SCOPES: csvListFromEnv(ALL_AUTH_SCOPES),
  ALLOWED_ORIGINS: csvListFromEnv(['localhost', '127.0.0.1', '[::1]']),
  ALLOWED_HOSTS: csvListFromEnv(['localhost', '127.0.0.1', '[::1]']),
  ALLOWED_GUILD_IDS: csvListFromEnv([]),
  CORS_ENABLED: booleanFromEnv(true),
  TRUST_PROXY: booleanFromEnv(false),
  SESSION_MODE: z.enum(['stateless', 'stateful']).default('stateless'),
  SESSION_TTL: integerFromEnv(1800, 60, 86400),
  MAX_SESSIONS_PER_IDENTITY: integerFromEnv(10, 1, 500),
  MAX_TOTAL_SESSIONS: integerFromEnv(200, 1, 5000),
  MAX_REQUEST_SIZE: integerFromEnv(1048576, 4096, 16777216),
  REQUEST_TIMEOUT_MS: integerFromEnv(30000, 1000, 300000),
  TOOL_TIMEOUT_MS: integerFromEnv(25000, 1000, 180000),
  MAX_CONCURRENT_REQUESTS: integerFromEnv(50, 1, 1000),
  RATE_LIMIT_ENABLED: booleanFromEnv(true),
  RATE_LIMIT_GLOBAL_PER_MINUTE: integerFromEnv(300, 10, 10000),
  RATE_LIMIT_IDENTITY_PER_MINUTE: integerFromEnv(120, 5, 5000),
  RATE_LIMIT_TOOL_CALLS_PER_MINUTE: integerFromEnv(90, 5, 2000),
  RATE_LIMIT_AUTH_FAILURES_PER_MINUTE: integerFromEnv(10, 1, 200),
  RATE_LIMIT_MAX_MESSAGES_PER_MINUTE: integerFromEnv(30, 1, 300),
  RATE_LIMIT_MAX_DESTRUCTIVE_PER_MINUTE: integerFromEnv(10, 1, 100),
  REQUIRE_CONFIRMATION_FOR_DESTRUCTIVE: booleanFromEnv(true),
  ENABLE_AUDIT_HISTORY: booleanFromEnv(true),
  AUDIT_RETENTION_DAYS: integerFromEnv(90, 1, 3650),
  INTENT_GUILDS: booleanFromEnv(true),
  INTENT_GUILD_MEMBERS: booleanFromEnv(false),
  INTENT_GUILD_MODERATION: booleanFromEnv(true),
  INTENT_GUILD_EMOJIS_AND_STICKERS: booleanFromEnv(true),
  INTENT_GUILD_INTEGRATIONS: booleanFromEnv(true),
  INTENT_GUILD_WEBHOOKS: booleanFromEnv(true),
  INTENT_GUILD_INVITES: booleanFromEnv(true),
  INTENT_GUILD_VOICE_STATES: booleanFromEnv(true),
  INTENT_GUILD_PRESENCES: booleanFromEnv(false),
  INTENT_GUILD_MESSAGES: booleanFromEnv(true),
  INTENT_GUILD_MESSAGE_REACTIONS: booleanFromEnv(true),
  INTENT_MESSAGE_CONTENT: booleanFromEnv(false),
  INTENT_GUILD_SCHEDULED_EVENTS: booleanFromEnv(true),
  INTENT_AUTO_MODERATION_CONFIGURATION: booleanFromEnv(true),
  INTENT_AUTO_MODERATION_EXECUTION: booleanFromEnv(true),
  OAUTH_ISSUER_URL: z.string().trim().optional().default(''),
  OAUTH_AUDIENCE: z.string().trim().optional().default(''),
  OAUTH_JWKS_URI: z.string().trim().optional().default(''),
  OAUTH_TOKEN_INTROSPECTION_URL: z.string().trim().optional().default(''),
  OAUTH_CLIENT_ID: z.string().trim().optional().default(''),
  OAUTH_CLIENT_SECRET: z.string().trim().optional().default(''),
  OAUTH_ALLOW_INSECURE_ISSUER: booleanFromEnv(false)
});

function computeGatewayIntentsBitfield(intentsObj) {
  const flags = [];
  if (intentsObj.guilds) flags.push(GatewayIntentBits.Guilds);
  if (intentsObj.guildMembers) flags.push(GatewayIntentBits.GuildMembers);
  if (intentsObj.guildModeration) flags.push(GatewayIntentBits.GuildModeration);
  if (intentsObj.guildEmojisAndStickers) flags.push(GatewayIntentBits.GuildEmojisAndStickers);
  if (intentsObj.guildIntegrations) flags.push(GatewayIntentBits.GuildIntegrations);
  if (intentsObj.guildWebhooks) flags.push(GatewayIntentBits.GuildWebhooks);
  if (intentsObj.guildInvites) flags.push(GatewayIntentBits.GuildInvites);
  if (intentsObj.guildVoiceStates) flags.push(GatewayIntentBits.GuildVoiceStates);
  if (intentsObj.guildPresences) flags.push(GatewayIntentBits.GuildPresences);
  if (intentsObj.guildMessages) flags.push(GatewayIntentBits.GuildMessages);
  if (intentsObj.guildMessageReactions) flags.push(GatewayIntentBits.GuildMessageReactions);
  if (intentsObj.messageContent) flags.push(GatewayIntentBits.MessageContent);
  if (intentsObj.guildScheduledEvents) flags.push(GatewayIntentBits.GuildScheduledEvents);
  if (intentsObj.autoModerationConfiguration) flags.push(GatewayIntentBits.AutoModerationConfiguration);
  if (intentsObj.autoModerationExecution) flags.push(GatewayIntentBits.AutoModerationExecution);
  return flags;
}

export class ConfigurationManager {
  constructor(rawEnv = process.env, options = {}) {
    this.rawEnv = rawEnv;
    this.requireToken = options.requireToken ?? true;
    this.configFilePath = options.configFilePath || null;
    this.config = this.loadAndValidate();
  }

  loadConfigFile() {
    const candidatePath =
      this.configFilePath ||
      this.rawEnv.CONFIG_FILE_PATH ||
      path.resolve(PROJECT_ROOT_DIR, 'config/config.json');
    if (candidatePath && fs.existsSync(candidatePath)) {
      try {
        const rawJson = fs.readFileSync(candidatePath, 'utf8');
        return JSON.parse(rawJson);
      } catch (err) {
        throw new AppError(
          ERROR_CODES.CONFIGURATION_ERROR,
          `Failed to parse configuration file at ${candidatePath}: ${err.message}`
        );
      }
    }
    return {};
  }

  loadAndValidate() {
    const fileOverrides = this.loadConfigFile();
    const mergedEnv = { ...fileOverrides, ...this.rawEnv };
    const parsed = ENV_SCHEMA.safeParse(mergedEnv);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      throw new AppError(
        ERROR_CODES.CONFIGURATION_ERROR,
        `Invalid environment configuration: ${issues.map((i) => `${i.field} (${i.message})`).join(', ')}`,
        { issues }
      );
    }

    const data = parsed.data;
    const placeholderTokens = new Set([
      '',
      'YOUR_DISCORD_BOT_TOKEN',
      'REPLACE_WITH_YOUR_BOT_TOKEN',
      'TOKEN_HERE'
    ]);

    if (this.requireToken && placeholderTokens.has(data.DISCORD_TOKEN)) {
      throw new AppError(
        ERROR_CODES.CONFIGURATION_ERROR,
        'DISCORD_TOKEN is missing or set to a placeholder value. Please configure a valid Discord Bot Token in your .env file.'
      );
    }

    let publicHostname;
    try {
      const parsedUrl = new URL(data.PUBLIC_BASE_URL);
      publicHostname = parsedUrl.hostname;
    } catch {
      throw new AppError(
        ERROR_CODES.CONFIGURATION_ERROR,
        `PUBLIC_BASE_URL must be a valid URL (received: ${data.PUBLIC_BASE_URL}).`
      );
    }

    const allowedHostsSet = new Set([
      ...data.ALLOWED_HOSTS.map((h) => h.toLowerCase()),
      publicHostname.toLowerCase()
    ]);

    const allowedOriginsSet = new Set([
      ...data.ALLOWED_ORIGINS.map((o) => o.toLowerCase()),
      publicHostname.toLowerCase()
    ]);

    const intentsObj = Object.freeze({
      guilds: data.INTENT_GUILDS,
      guildMembers: data.INTENT_GUILD_MEMBERS,
      guildModeration: data.INTENT_GUILD_MODERATION,
      guildEmojisAndStickers: data.INTENT_GUILD_EMOJIS_AND_STICKERS,
      guildIntegrations: data.INTENT_GUILD_INTEGRATIONS,
      guildWebhooks: data.INTENT_GUILD_WEBHOOKS,
      guildInvites: data.INTENT_GUILD_INVITES,
      guildVoiceStates: data.INTENT_GUILD_VOICE_STATES,
      guildPresences: data.INTENT_GUILD_PRESENCES,
      guildMessages: data.INTENT_GUILD_MESSAGES,
      guildMessageReactions: data.INTENT_GUILD_MESSAGE_REACTIONS,
      messageContent: data.INTENT_MESSAGE_CONTENT,
      guildScheduledEvents: data.INTENT_GUILD_SCHEDULED_EVENTS,
      autoModerationConfiguration: data.INTENT_AUTO_MODERATION_CONFIGURATION,
      autoModerationExecution: data.INTENT_AUTO_MODERATION_EXECUTION
    });

    const resolvedDatabasePath = resolveFromRoot(data.DATABASE_PATH);
    const resolvedBackupDir = resolveFromRoot(data.BACKUP_DIRECTORY);
    const isTokenConfigured = Boolean(
      data.DISCORD_TOKEN && !placeholderTokens.has(data.DISCORD_TOKEN)
    );
    const gatewayIntents = computeGatewayIntentsBitfield(intentsObj);

    const configObj = {
      nodeEnv: data.NODE_ENV,
      network: Object.freeze({
        host: data.HOST,
        port: data.PORT,
        mcpPath: data.MCP_PATH,
        publicBaseUrl: data.PUBLIC_BASE_URL.replace(/\/+$/, ''),
        publicHostname,
        trustProxy: data.TRUST_PROXY,
        corsEnabled: data.CORS_ENABLED,
        allowedOrigins: Object.freeze(Array.from(allowedOriginsSet)),
        allowedHosts: Object.freeze(Array.from(allowedHostsSet)),
        maxRequestSize: data.MAX_REQUEST_SIZE,
        requestTimeoutMs: data.REQUEST_TIMEOUT_MS,
        toolTimeoutMs: data.TOOL_TIMEOUT_MS,
        maxConcurrentRequests: data.MAX_CONCURRENT_REQUESTS
      }),
      session: Object.freeze({
        mode: data.SESSION_MODE,
        ttlSeconds: data.SESSION_TTL,
        maxSessionsPerIdentity: data.MAX_SESSIONS_PER_IDENTITY,
        maxTotalSessions: data.MAX_TOTAL_SESSIONS
      }),
      auth: Object.freeze({
        mode: data.AUTH_MODE,
        apiKeyHash: data.API_KEY_HASH,
        apiKeyScopes: Object.freeze(data.API_KEY_SCOPES),
        allowedGuildIds: Object.freeze(data.ALLOWED_GUILD_IDS),
        oauth: Object.freeze({
          issuerUrl: data.OAUTH_ISSUER_URL,
          audience:
            data.OAUTH_AUDIENCE ||
            `${data.PUBLIC_BASE_URL.replace(/\/+$/, '')}${data.MCP_PATH}`,
          jwksUri: data.OAUTH_JWKS_URI,
          tokenIntrospectionUrl: data.OAUTH_TOKEN_INTROSPECTION_URL,
          clientId: data.OAUTH_CLIENT_ID,
          clientSecret: data.OAUTH_CLIENT_SECRET,
          allowInsecureIssuer: data.OAUTH_ALLOW_INSECURE_ISSUER
        })
      }),
      discordToken: data.DISCORD_TOKEN,
      isTokenConfigured,
      discordApplicationId: data.DISCORD_APPLICATION_ID || null,
      logLevel: data.LOG_LEVEL,
      databasePath: resolvedDatabasePath,
      resolvedDatabasePath,
      backupDirectory: resolvedBackupDir,
      backupExportDir: resolvedBackupDir,
      resolvedBackupDir,
      enableGuildMembersIntent: data.INTENT_GUILD_MEMBERS,
      enableMessageContentIntent: data.INTENT_MESSAGE_CONTENT,
      enableGuildPresencesIntent: data.INTENT_GUILD_PRESENCES,
      enableAuditHistory: data.ENABLE_AUDIT_HISTORY,
      gatewayIntents,
      rateLimit: Object.freeze({
        enabled: data.RATE_LIMIT_ENABLED,
        globalPerMinute: data.RATE_LIMIT_GLOBAL_PER_MINUTE,
        identityPerMinute: data.RATE_LIMIT_IDENTITY_PER_MINUTE,
        toolCallsPerMinute: data.RATE_LIMIT_TOOL_CALLS_PER_MINUTE,
        authFailuresPerMinute: data.RATE_LIMIT_AUTH_FAILURES_PER_MINUTE,
        maxMessagesPerMinute: data.RATE_LIMIT_MAX_MESSAGES_PER_MINUTE,
        maxDestructivePerMinute: data.RATE_LIMIT_MAX_DESTRUCTIVE_PER_MINUTE
      }),
      security: Object.freeze({
        requireConfirmationForDestructive: data.REQUIRE_CONFIRMATION_FOR_DESTRUCTIVE,
        enableAuditHistory: data.ENABLE_AUDIT_HISTORY,
        auditRetentionDays: data.AUDIT_RETENTION_DAYS
      }),
      intents: intentsObj,
      getPublicSummary() {
        return {
          isTokenConfigured,
          discordApplicationId: data.DISCORD_APPLICATION_ID || null,
          logLevel: data.LOG_LEVEL,
          databasePath: data.DATABASE_PATH,
          backupExportDir: data.BACKUP_DIRECTORY,
          enableMessageContentIntent: data.INTENT_MESSAGE_CONTENT,
          enableGuildMembersIntent: data.INTENT_GUILD_MEMBERS,
          enableGuildPresencesIntent: data.INTENT_GUILD_PRESENCES,
          enableAuditHistory: data.ENABLE_AUDIT_HISTORY,
          sessionMode: data.SESSION_MODE,
          authMode: data.AUTH_MODE
        };
      }
    };

    return Object.freeze(configObj);
  }

  getGatewayIntentsBitfield() {
    return this.config.gatewayIntents;
  }

  getEnabledIntentNames() {
    return Object.entries(this.config.intents)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name);
  }

  getSafePublicConfig() {
    return {
      nodeEnv: this.config.nodeEnv,
      network: {
        host: this.config.network.host,
        port: this.config.network.port,
        mcpPath: this.config.network.mcpPath,
        publicBaseUrl: this.config.network.publicBaseUrl,
        trustProxy: this.config.network.trustProxy,
        corsEnabled: this.config.network.corsEnabled,
        allowedOrigins: this.config.network.allowedOrigins,
        allowedHosts: this.config.network.allowedHosts,
        maxRequestSize: this.config.network.maxRequestSize,
        requestTimeoutMs: this.config.network.requestTimeoutMs,
        toolTimeoutMs: this.config.network.toolTimeoutMs,
        maxConcurrentRequests: this.config.network.maxConcurrentRequests
      },
      session: this.config.session,
      auth: {
        mode: this.config.auth.mode,
        hasEnvApiKeyHash: Boolean(this.config.auth.apiKeyHash),
        allowedGuildIdsCount: this.config.auth.allowedGuildIds.length,
        oauthConfigured: Boolean(this.config.auth.oauth.issuerUrl)
      },
      logLevel: this.config.logLevel,
      databasePath: this.config.databasePath,
      backupDirectory: this.config.backupDirectory,
      hasDiscordToken: Boolean(this.config.discordToken),
      discordApplicationId: this.config.discordApplicationId,
      rateLimit: this.config.rateLimit,
      security: this.config.security,
      intents: this.config.intents,
      enabledIntents: this.getEnabledIntentNames()
    };
  }
}
