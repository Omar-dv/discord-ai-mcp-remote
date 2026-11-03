/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

export function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }
  const trimmed = authorizationHeader.trim();
  const match = /^Bearer\s+([^\s]+)$/i.exec(trimmed);
  return match ? match[1] : null;
}

export class AuthenticationManager {
  constructor({ config, apiKeyManager, oauthProvider, rateLimiter, logger } = {}) {
    this.config = config;
    this.apiKeyManager = apiKeyManager;
    this.oauthProvider = oauthProvider;
    this.rateLimiter = rateLimiter;
    this.logger = logger;
  }

  async authenticateRequest({ authorizationHeader, clientIp = 'unknown', requestId = null } = {}) {
    const token = extractBearerToken(authorizationHeader);
    if (!token) {
      this.recordAuthFailure(clientIp, requestId, 'Missing or malformed Authorization Bearer header');
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required. Provide a valid Bearer credential in the Authorization header.',
        { wwwAuthenticate: this.buildWwwAuthenticateHeader('invalid_token', 'Missing Bearer token') }
      );
    }

    const mode = this.config?.auth?.mode || 'api_key';

    if (mode === 'api_key' || mode === 'hybrid') {
      try {
        const verifiedKey = this.apiKeyManager.verifyKey(token);
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        const identity = {
          identityId: verifiedKey.identityId,
          keyId: verifiedKey.keyId,
          label: verifiedKey.label,
          scopes: verifiedKey.scopes,
          allowedGuildIds: verifiedKey.allowedGuildIds,
          authMethod: 'api_key',
          expiresAt
        };
        return {
          identity,
          authInfo: {
            token: '[REDACTED]',
            clientId: verifiedKey.identityId,
            scopes: verifiedKey.scopes,
            expiresAt,
            extra: {
              identityId: verifiedKey.identityId,
              keyId: verifiedKey.keyId,
              label: verifiedKey.label,
              allowedGuildIds: verifiedKey.allowedGuildIds,
              authMethod: 'api_key'
            }
          }
        };
      } catch (apiKeyErr) {
        if (mode === 'api_key') {
          this.recordAuthFailure(clientIp, requestId, apiKeyErr.message);
          throw new AppError(
            ERROR_CODES.UNAUTHORIZED,
            'Invalid or expired API key.',
            { wwwAuthenticate: this.buildWwwAuthenticateHeader('invalid_token', 'Invalid API key') }
          );
        }
      }
    }

    if (mode === 'oauth' || mode === 'hybrid') {
      try {
        const oauthInfo = await this.oauthProvider.verifyAccessToken(token);
        const identity = {
          identityId: oauthInfo.extra?.identityId || oauthInfo.clientId,
          keyId: `oauth:${oauthInfo.clientId}`,
          label: `OAuth Client (${oauthInfo.clientId})`,
          scopes: oauthInfo.scopes,
          allowedGuildIds: oauthInfo.extra?.allowedGuildIds || [],
          authMethod: 'oauth',
          expiresAt: oauthInfo.expiresAt
        };
        return {
          identity,
          authInfo: {
            ...oauthInfo,
            token: '[REDACTED]'
          }
        };
      } catch (oauthErr) {
        this.recordAuthFailure(clientIp, requestId, oauthErr.message);
        throw new AppError(
          ERROR_CODES.UNAUTHORIZED,
          'Invalid or expired OAuth access token.',
          { wwwAuthenticate: this.buildWwwAuthenticateHeader('invalid_token', 'Invalid access token') }
        );
      }
    }

    this.recordAuthFailure(clientIp, requestId, 'Unsupported authentication mode');
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication failed.');
  }

  recordAuthFailure(clientIp, requestId, reason) {
    this.logger?.warn(
      { clientIp, requestId, reason },
      'Authentication failure on protected MCP endpoint'
    );
    if (this.rateLimiter) {
      this.rateLimiter.consume('auth_failure', clientIp || 'unknown');
    }
  }

  buildWwwAuthenticateHeader(errorCode = 'invalid_token', description = 'Authentication required') {
    const parts = [`Bearer error="${errorCode}"`, `error_description="${description}"`];
    if (this.oauthProvider?.isEnabled()) {
      const metadataUrl = this.oauthProvider.getProtectedResourceMetadataUrl();
      if (metadataUrl) {
        parts.push(`resource_metadata="${metadataUrl}"`);
      }
    }
    return parts.join(', ');
  }
}

