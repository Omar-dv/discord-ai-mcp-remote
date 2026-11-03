/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import crypto from 'node:crypto';
import {
  buildOAuthProtectedResourceMetadata,
  getOAuthProtectedResourceMetadataUrl,
  OAuthError,
  OAuthErrorCode
} from '@modelcontextprotocol/server';
import { ALL_AUTH_SCOPES, ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { normalizeScopes } from '../scopes.js';

export function generatePkceChallenge(codeVerifier) {
  if (!codeVerifier || typeof codeVerifier !== 'string' || codeVerifier.length < 43 || codeVerifier.length > 128) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'PKCE code_verifier must be between 43 and 128 characters.'
    );
  }
  return crypto.createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
}

export function verifyPkceS256(codeVerifier, expectedChallenge) {
  if (!codeVerifier || !expectedChallenge) {
    return false;
  }
  try {
    const computed = generatePkceChallenge(codeVerifier);
    const bufA = Buffer.from(computed, 'utf8');
    const bufB = Buffer.from(String(expectedChallenge), 'utf8');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export class OAuthResourceProvider {
  constructor({ config, oauthRepo, logger } = {}) {
    this.config = config;
    this.oauthRepo = oauthRepo;
    this.logger = logger;
  }

  isEnabled() {
    const mode = this.config?.auth?.mode;
    return (mode === 'oauth' || mode === 'hybrid') && Boolean(this.config?.auth?.oauth?.issuerUrl);
  }

  getResourceServerUrl() {
    const base = this.config?.network?.publicBaseUrl || 'http://127.0.0.1:3000';
    const mcpPath = this.config?.network?.mcpPath || '/mcp';
    return new URL(`${base.replace(/\/+$/, '')}${mcpPath}`);
  }

  getProtectedResourceMetadataUrl() {
    return getOAuthProtectedResourceMetadataUrl(this.getResourceServerUrl());
  }

  getAuthorizationServerMetadata() {
    const issuerUrl = this.config?.auth?.oauth?.issuerUrl;
    if (!issuerUrl) {
      return null;
    }
    const cleanIssuer = issuerUrl.replace(/\/+$/, '');
    return {
      issuer: cleanIssuer,
      authorization_endpoint: `${cleanIssuer}/authorize`,
      token_endpoint: `${cleanIssuer}/token`,
      revocation_endpoint: `${cleanIssuer}/revoke`,
      introspection_endpoint:
        this.config?.auth?.oauth?.tokenIntrospectionUrl || `${cleanIssuer}/introspect`,
      jwks_uri: this.config?.auth?.oauth?.jwksUri || `${cleanIssuer}/.well-known/jwks.json`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
      scopes_supported: ALL_AUTH_SCOPES
    };
  }

  getProtectedResourceMetadata() {
    if (!this.isEnabled()) {
      return null;
    }
    const oauthMetadata = this.getAuthorizationServerMetadata();
    return buildOAuthProtectedResourceMetadata({
      oauthMetadata,
      resourceServerUrl: this.getResourceServerUrl(),
      scopesSupported: ALL_AUTH_SCOPES,
      resourceName: 'Discord AI MCP Remote',
      dangerouslyAllowInsecureIssuerUrl: Boolean(this.config?.auth?.oauth?.allowInsecureIssuer)
    });
  }

  normalizeAudience(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  validateAudience(tokenAud) {
    const expectedAudience = this.normalizeAudience(
      this.config?.auth?.oauth?.audience || this.getResourceServerUrl().href
    );
    if (!expectedAudience) {
      return true;
    }
    const audiences = Array.isArray(tokenAud) ? tokenAud : [tokenAud];
    return audiences.some((aud) => this.normalizeAudience(aud) === expectedAudience);
  }

  async verifyAccessToken(token) {
    if (!this.isEnabled()) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, 'OAuth authentication is not enabled.');
    }

    if (this.oauthRepo) {
      const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
      const localToken = this.oauthRepo.getTokenByHash(tokenHash);
      if (localToken) {
        if (localToken.revokedAt) {
          throw new OAuthError(OAuthErrorCode.InvalidToken, 'OAuth access token has been revoked.');
        }
        const expiresAtEpoch = Math.floor(new Date(localToken.expiresAt).getTime() / 1000);
        if (expiresAtEpoch <= Math.floor(Date.now() / 1000)) {
          throw new OAuthError(OAuthErrorCode.InvalidToken, 'OAuth access token has expired.');
        }
        if (!this.validateAudience(localToken.audience)) {
          throw new OAuthError(
            OAuthErrorCode.InvalidToken,
            'OAuth token audience does not match this MCP resource server.'
          );
        }
        const scopes = normalizeScopes(localToken.scopes);
        return {
          token,
          clientId: localToken.clientId,
          scopes,
          expiresAt: expiresAtEpoch,
          resource: new URL(localToken.audience || this.getResourceServerUrl().href),
          extra: {
            identityId: localToken.identityId,
            allowedGuildIds: localToken.allowedGuildIds || [],
            authMethod: 'oauth'
          }
        };
      }
    }

    throw new OAuthError(OAuthErrorCode.InvalidToken, 'Unrecognized or invalid OAuth access token.');
  }
}

