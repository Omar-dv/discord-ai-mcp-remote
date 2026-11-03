/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export const PROJECT_IDENTITY = Object.freeze({
  name: 'Discord AI MCP Remote',
  packageName: 'discord-ai-mcp-remote',
  edition: 'remote',
  version: '1.0.0',
  license: 'MIT',
  copyright: 'Copyright (c) 2026 Omar ElSabbagh. Licensed under the MIT License.',
  transport: 'streamable-http',
  creator: Object.freeze({
    name: 'Omar ElSabbagh',
    country: 'Egypt',
    role: 'Project Creator, Owner, and Professional Programmer',
    discordCommunity: 'EnzoCord'
  }),
  officialAttribution:
    'This project was created by Omar ElSabbagh, a professional programmer from Egypt and the owner of the EnzoCord Discord community.'
});

export const AUTH_SCOPES = Object.freeze({
  READ: 'discord:read',
  MESSAGES_READ: 'discord:messages:read',
  MESSAGES_WRITE: 'discord:messages:write',
  CHANNELS_READ: 'discord:channels:read',
  CHANNELS_WRITE: 'discord:channels:write',
  ROLES_READ: 'discord:roles:read',
  ROLES_WRITE: 'discord:roles:write',
  MEMBERS_READ: 'discord:members:read',
  MEMBERS_MODERATE: 'discord:members:moderate',
  GUILD_MANAGE: 'discord:guild:manage',
  WEBHOOKS_MANAGE: 'discord:webhooks:manage',
  AUTOMOD_MANAGE: 'discord:automod:manage',
  BACKUP_READ: 'discord:backup:read',
  BACKUP_WRITE: 'discord:backup:write',
  BOT_MANAGE: 'discord:bot:manage',
  ADMIN: 'discord:admin'
});

export const ALL_AUTH_SCOPES = Object.freeze(Object.values(AUTH_SCOPES));

export const DISCORD_LIMITS = Object.freeze({
  MAX_MESSAGE_LENGTH: 2000,
  MAX_EMBED_TITLE_LENGTH: 256,
  MAX_EMBED_DESCRIPTION_LENGTH: 4096,
  MAX_EMBED_FIELDS: 25,
  MAX_EMBED_FIELD_NAME_LENGTH: 256,
  MAX_EMBED_FIELD_VALUE_LENGTH: 1024,
  MAX_EMBED_FOOTER_LENGTH: 2048,
  MAX_EMBED_AUTHOR_LENGTH: 256,
  MAX_EMBEDS_PER_MESSAGE: 10,
  MAX_BULK_DELETE_COUNT: 100,
  MIN_BULK_DELETE_COUNT: 2,
  BULK_DELETE_MAX_AGE_MS: 14 * 24 * 60 * 60 * 1000,
  MAX_AUDIT_LOG_LIMIT: 100,
  MAX_MESSAGE_FETCH_LIMIT: 100,
  MAX_MEMBER_LIST_LIMIT: 1000,
  MAX_CHANNEL_NAME_LENGTH: 100,
  MAX_CHANNEL_TOPIC_LENGTH: 1024,
  MAX_SLOWMODE_SECONDS: 21600,
  MAX_NICKNAME_LENGTH: 32,
  MAX_REASON_LENGTH: 512,
  MAX_TIMEOUT_DAYS: 28,
  MAX_EMOJI_SIZE_BYTES: 256 * 1024,
  MAX_STICKER_SIZE_BYTES: 512 * 1024
});

export const DESTRUCTIVE_OPERATIONS = Object.freeze(new Set([
  'delete_channel',
  'delete_role',
  'set_role_permissions',
  'set_channel_permissions',
  'remove_channel_permission',
  'kick_member',
  'ban_member',
  'timeout_member',
  'edit_member_timeout',
  'delete_message',
  'bulk_delete_messages',
  'delete_thread',
  'delete_emoji',
  'delete_sticker',
  'delete_invite',
  'delete_webhook',
  'delete_scheduled_event',
  'delete_automod_rule',
  'create_application_command',
  'edit_application_command',
  'delete_application_command'
]));

export const LOG_LEVELS = Object.freeze([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent'
]);

export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INVALID_ORIGIN: 'INVALID_ORIGIN',
  INVALID_HOST: 'INVALID_HOST',
  GUILD_ACCESS_DENIED: 'GUILD_ACCESS_DENIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_LIMIT_EXCEEDED: 'SESSION_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  CONCURRENCY_LIMIT_EXCEEDED: 'CONCURRENCY_LIMIT_EXCEEDED',
  INVALID_GUILD_ID: 'INVALID_GUILD_ID',
  INVALID_CHANNEL_ID: 'INVALID_CHANNEL_ID',
  INVALID_USER_ID: 'INVALID_USER_ID',
  INVALID_ROLE_ID: 'INVALID_ROLE_ID',
  NOT_FOUND: 'NOT_FOUND',
  MISSING_PERMISSIONS: 'MISSING_PERMISSIONS',
  ROLE_HIERARCHY_VIOLATION: 'ROLE_HIERARCHY_VIOLATION',
  GUILD_OWNER_PROTECTED: 'GUILD_OWNER_PROTECTED',
  MISSING_INTENTS: 'MISSING_INTENTS',
  MISSING_ACCESS: 'MISSING_ACCESS',
  CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  DISCORD_API_ERROR: 'DISCORD_API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  BOT_NOT_READY: 'BOT_NOT_READY',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});
