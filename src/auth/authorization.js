/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { AUTH_SCOPES, ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';
import { getRequiredScopesForTool, hasSatisfiedScope } from './scopes.js';

export const requestAuthStorage = new AsyncLocalStorage();

export class AuthorizationManager {
  constructor({ config, logger } = {}) {
    this.config = config;
    this.logger = logger;
  }

  runWithAuthContext(authContext, callback) {
    return requestAuthStorage.run(authContext, callback);
  }

  getCurrentAuthContext() {
    return requestAuthStorage.getStore() || null;
  }

  resolveIdentity(ctx = {}) {
    const storeContext = this.getCurrentAuthContext();
    if (storeContext?.identity) {
      return storeContext.identity;
    }

    const authInfo = ctx?.http?.authInfo || ctx?.authInfo;
    if (authInfo) {
      return {
        identityId: authInfo.extra?.identityId || authInfo.clientId || 'authenticated',
        keyId: authInfo.extra?.keyId || authInfo.clientId || 'key',
        scopes: authInfo.scopes || [],
        allowedGuildIds: authInfo.extra?.allowedGuildIds || [],
        authMethod: authInfo.extra?.authMethod || 'bearer'
      };
    }

    return null;
  }

  assertAuthenticated(ctx = {}) {
    const identity = this.resolveIdentity(ctx);
    if (!identity || !identity.identityId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Unauthenticated execution is strictly prohibited on the Remote MCP server.'
      );
    }
    return identity;
  }

  assertScopes(identity, requiredScopes = [], targetName = 'operation') {
    if (!hasSatisfiedScope(identity.scopes, requiredScopes)) {
      this.logger?.warn(
        {
          identityId: identity.identityId,
          targetName,
          requiredScopes,
          grantedScopes: identity.scopes
        },
        'Authorization denied due to insufficient scopes'
      );
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_SCOPE,
        `Insufficient authorization scopes for "${targetName}". Required one of: [${requiredScopes.join(', ')}].`,
        {
          target: targetName,
          requiredScopes,
          grantedScopes: identity.scopes
        }
      );
    }
  }

  isGuildAllowedForIdentity(identity, guildId) {
    if (!guildId) {
      return true;
    }
    const cleanGuildId = String(guildId).trim();

    const serverAllowedGuilds = this.config?.auth?.allowedGuildIds || [];
    if (serverAllowedGuilds.length > 0 && !serverAllowedGuilds.includes(cleanGuildId)) {
      return false;
    }

    const identityAllowedGuilds = identity?.allowedGuildIds || [];
    if (identityAllowedGuilds.length > 0 && !identityAllowedGuilds.includes(cleanGuildId)) {
      return false;
    }

    return true;
  }

  assertGuildAccess(identity, guildId, targetName = 'operation') {
    if (!guildId) {
      return;
    }
    if (!this.isGuildAllowedForIdentity(identity, guildId)) {
      this.logger?.warn(
        {
          identityId: identity?.identityId,
          guildId,
          targetName
        },
        'Authorization denied due to guild access restriction'
      );
      throw new AppError(
        ERROR_CODES.GUILD_ACCESS_DENIED,
        `Identity "${identity?.identityId || 'unknown'}" is not authorized to access or manage Discord guild "${guildId}".`,
        {
          guildId,
          identityId: identity?.identityId || null
        }
      );
    }
  }

  assertToolAuthorized(ctx, { toolName, category, readOnly, requiredScopes, guildId }) {
    const identity = this.assertAuthenticated(ctx);
    const scopesToCheck =
      Array.isArray(requiredScopes) && requiredScopes.length > 0
        ? requiredScopes
        : getRequiredScopesForTool(toolName, category, readOnly);

    this.assertScopes(identity, scopesToCheck, toolName);
    if (guildId) {
      this.assertGuildAccess(identity, guildId, toolName);
    }
    return identity;
  }

  assertResourceAuthorized(ctx, { uri, guildId = null, requiredScopes = [AUTH_SCOPES.READ] }) {
    const identity = this.assertAuthenticated(ctx);
    this.assertScopes(identity, requiredScopes, uri);
    if (guildId) {
      this.assertGuildAccess(identity, guildId, uri);
    }
    return identity;
  }

  filterAccessibleGuilds(ctx, guilds = []) {
    const identity = this.resolveIdentity(ctx);
    if (!identity) {
      return [];
    }
    return guilds.filter((g) => this.isGuildAllowedForIdentity(identity, g.id));
  }
}

