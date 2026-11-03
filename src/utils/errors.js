/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ERROR_CODES } from '../core/constants.js';
import { redactObject, redactString } from '../security/secret-redaction.js';

const DISCORD_API_ERROR_MAP = Object.freeze({
  10003: { code: ERROR_CODES.INVALID_CHANNEL_ID, message: 'Unknown Discord channel.' },
  10004: { code: ERROR_CODES.INVALID_GUILD_ID, message: 'Unknown Discord guild (server).' },
  10007: { code: ERROR_CODES.INVALID_USER_ID, message: 'Unknown Discord guild member.' },
  10008: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord message.' },
  10011: { code: ERROR_CODES.INVALID_ROLE_ID, message: 'Unknown Discord role.' },
  10013: { code: ERROR_CODES.INVALID_USER_ID, message: 'Unknown Discord user.' },
  10014: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord emoji.' },
  10015: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord webhook.' },
  10026: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord ban.' },
  10060: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord sticker.' },
  10062: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord interaction.' },
  10063: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord application command.' },
  10070: { code: ERROR_CODES.NOT_FOUND, message: 'Unknown Discord scheduled event.' },
  30001: { code: ERROR_CODES.DISCORD_API_ERROR, message: 'Maximum number of guilds reached.' },
  30005: { code: ERROR_CODES.DISCORD_API_ERROR, message: 'Maximum number of guild roles reached (250).' },
  30007: { code: ERROR_CODES.DISCORD_API_ERROR, message: 'Maximum number of webhooks reached.' },
  30008: { code: ERROR_CODES.DISCORD_API_ERROR, message: 'Maximum number of emojis reached.' },
  30013: { code: ERROR_CODES.DISCORD_API_ERROR, message: 'Maximum number of guild channels reached (500).' },
  30039: { code: ERROR_CODES.DISCORD_API_ERROR, message: 'Maximum number of stickers reached.' },
  50001: { code: ERROR_CODES.MISSING_ACCESS, message: 'Discord bot lacks access to the target resource (Missing Access).' },
  50013: { code: ERROR_CODES.MISSING_PERMISSIONS, message: 'Discord bot lacks required permissions to perform this action (Missing Permissions).' },
  50028: { code: ERROR_CODES.ROLE_HIERARCHY_VIOLATION, message: 'Invalid role hierarchy or role position.' },
  50034: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Messages older than 14 days cannot be bulk deleted on Discord.' },
  50035: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid form body rejected by Discord API.' }
});

export class AppError extends Error {
  constructor(code = ERROR_CODES.INTERNAL_ERROR, message = 'An unexpected error occurred.', details = {}) {
    super(redactString(message));
    this.name = 'AppError';
    this.code = code;
    this.details = redactObject(details || {});
  }

  toPublicObject() {
    return {
      code: this.code,
      message: redactString(this.message),
      details: redactObject(this.details || {})
    };
  }
}

export function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error && typeof error === 'object') {
    const discordCode = typeof error.code === 'number' ? error.code : undefined;
    if (discordCode && DISCORD_API_ERROR_MAP[discordCode]) {
      const mapped = DISCORD_API_ERROR_MAP[discordCode];
      return new AppError(
        mapped.code,
        `${mapped.message} (${redactString(error.rawError?.message || error.message || '')})`.trim(),
        {
          discordErrorCode: discordCode,
          httpStatus: error.status ?? undefined
        }
      );
    }

    if (error.status === 429 || error.name === 'RateLimitError') {
      return new AppError(
        ERROR_CODES.RATE_LIMITED,
        'Discord API rate limit encountered. Wait before retrying the operation.',
        {
          httpStatus: 429,
          retryAfter: error.retryAfter ?? undefined
        }
      );
    }

    if (error.status === 403) {
      return new AppError(
        ERROR_CODES.MISSING_PERMISSIONS,
        redactString(error.message || 'Discord rejected the request with HTTP 403 Forbidden.'),
        { httpStatus: 403 }
      );
    }

    if (error.status === 404) {
      return new AppError(
        ERROR_CODES.NOT_FOUND,
        redactString(error.message || 'Requested Discord resource was not found (HTTP 404).'),
        { httpStatus: 404 }
      );
    }

    if (
      typeof error.code === 'string' &&
      ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT'].includes(error.code)
    ) {
      return new AppError(
        ERROR_CODES.NETWORK_ERROR,
        `Network error while communicating with Discord: ${error.code}`,
        { networkCode: error.code }
      );
    }

    if (typeof error.code === 'string' && error.code.startsWith('SQLITE_')) {
      return new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Local SQLite database error occurred while processing the request.',
        { sqliteCode: error.code }
      );
    }
  }

  const safeMessage =
    error instanceof Error
      ? redactString(error.message || 'Unexpected error occurred.')
      : 'Unexpected runtime error occurred.';

  return new AppError(ERROR_CODES.INTERNAL_ERROR, safeMessage);
}

export function formatToolErrorResult(error, toolName) {
  const normalized = normalizeError(error);
  const payload = {
    ok: false,
    tool: toolName,
    error: normalized.toPublicObject(),
    timestamp: new Date().toISOString()
  };

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

export function formatToolSuccessResult(data, toolName, meta = {}) {
  const payload = {
    ok: true,
    tool: toolName,
    data: redactObject(data),
    ...redactObject(meta),
    timestamp: new Date().toISOString()
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

