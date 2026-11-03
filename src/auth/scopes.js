/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ALL_AUTH_SCOPES, AUTH_SCOPES } from '../core/constants.js';

export const CATEGORY_SCOPE_MAP = Object.freeze({
  bot: {
    read: [AUTH_SCOPES.READ],
    write: [AUTH_SCOPES.BOT_MANAGE]
  },
  guild: {
    read: [AUTH_SCOPES.READ],
    write: [AUTH_SCOPES.GUILD_MANAGE]
  },
  channel: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.CHANNELS_READ],
    write: [AUTH_SCOPES.CHANNELS_WRITE]
  },
  voice: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.CHANNELS_READ],
    write: [AUTH_SCOPES.CHANNELS_WRITE, AUTH_SCOPES.MEMBERS_MODERATE]
  },
  role: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.ROLES_READ],
    write: [AUTH_SCOPES.ROLES_WRITE]
  },
  member: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.MEMBERS_READ],
    write: [AUTH_SCOPES.MEMBERS_MODERATE]
  },
  moderation: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.MEMBERS_READ],
    write: [AUTH_SCOPES.MEMBERS_MODERATE]
  },
  message: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.MESSAGES_READ],
    write: [AUTH_SCOPES.MESSAGES_WRITE]
  },
  thread: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.CHANNELS_READ],
    write: [AUTH_SCOPES.CHANNELS_WRITE]
  },
  emoji: {
    read: [AUTH_SCOPES.READ],
    write: [AUTH_SCOPES.GUILD_MANAGE]
  },
  sticker: {
    read: [AUTH_SCOPES.READ],
    write: [AUTH_SCOPES.GUILD_MANAGE]
  },
  invite: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.CHANNELS_READ],
    write: [AUTH_SCOPES.CHANNELS_WRITE, AUTH_SCOPES.GUILD_MANAGE]
  },
  webhook: {
    read: [AUTH_SCOPES.WEBHOOKS_MANAGE],
    write: [AUTH_SCOPES.WEBHOOKS_MANAGE]
  },
  event: {
    read: [AUTH_SCOPES.READ],
    write: [AUTH_SCOPES.GUILD_MANAGE]
  },
  automod: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.AUTOMOD_MANAGE],
    write: [AUTH_SCOPES.AUTOMOD_MANAGE]
  },
  audit: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.MEMBERS_MODERATE],
    write: [AUTH_SCOPES.MEMBERS_MODERATE]
  },
  utility: {
    read: [AUTH_SCOPES.READ],
    write: [AUTH_SCOPES.GUILD_MANAGE]
  },
  backup: {
    read: [AUTH_SCOPES.BACKUP_READ],
    write: [AUTH_SCOPES.BACKUP_WRITE]
  },
  command: {
    read: [AUTH_SCOPES.READ, AUTH_SCOPES.BOT_MANAGE],
    write: [AUTH_SCOPES.BOT_MANAGE]
  }
});

export function getRequiredScopesForTool(toolName, category, readOnly) {
  if (toolName === 'assign_role' || toolName === 'remove_role' || toolName === 'assign_role_to_member' || toolName === 'remove_role_from_member') {
    return [AUTH_SCOPES.ROLES_WRITE];
  }
  if (toolName === 'export_guild_backup' || toolName === 'export_roles_backup' || toolName === 'export_channels_backup') {
    return [AUTH_SCOPES.BACKUP_WRITE];
  }
  if (toolName === 'validate_backup_manifest' || toolName === 'get_backup_summary') {
    return [AUTH_SCOPES.BACKUP_READ];
  }

  const normalizedCategory = String(category || 'general').toLowerCase();
  const entry = CATEGORY_SCOPE_MAP[normalizedCategory];
  if (!entry) {
    return readOnly ? [AUTH_SCOPES.READ] : [AUTH_SCOPES.GUILD_MANAGE];
  }
  return readOnly ? entry.read : entry.write;
}

export function hasSatisfiedScope(grantedScopes = [], requiredScopes = []) {
  if (!Array.isArray(requiredScopes) || requiredScopes.length === 0) {
    return true;
  }
  const grantedSet = new Set(grantedScopes);
  if (grantedSet.has(AUTH_SCOPES.ADMIN) || grantedSet.has('*')) {
    return true;
  }
  return requiredScopes.some((scope) => grantedSet.has(scope));
}

export function normalizeScopes(scopes = []) {
  if (!Array.isArray(scopes)) {
    return [];
  }
  const validSet = new Set(ALL_AUTH_SCOPES);
  return Array.from(
    new Set(
      scopes
        .map((s) => String(s).trim())
        .filter((s) => validSet.has(s) || s === '*')
    )
  );
}

