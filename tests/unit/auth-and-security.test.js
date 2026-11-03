/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { describe, expect, it } from 'vitest';
import { AUTH_SCOPES, ERROR_CODES } from '../../src/core/constants.js';
import { ConfigurationManager } from '../../src/core/config.js';
import { DatabaseManager } from '../../src/database/database.js';
import {
  ApiKeyManager,
  constantTimeCompareHex,
  generateRawApiKey,
  hashApiKey
} from '../../src/auth/api-keys.js';
import {
  generatePkceChallenge,
  OAuthResourceProvider,
  verifyPkceS256
} from '../../src/auth/oauth/oauth-provider.js';
import { AuthenticationManager } from '../../src/auth/authentication.js';
import { AuthorizationManager } from '../../src/auth/authorization.js';
import { OriginValidator } from '../../src/security/origin-validator.js';
import { HostValidator } from '../../src/security/host-validator.js';
import { RateLimiter } from '../../src/security/rate-limiter.js';
import { RequestLimitsManager } from '../../src/security/request-limits.js';
import { ConfirmationManager } from '../../src/security/confirmation.js';
import {
  clearRegisteredSecrets,
  redactObject,
  redactString,
  registerSecretForRedaction
} from '../../src/security/secret-redaction.js';

describe('API Key Generation, Verification, Rotation, & Revocation', () => {
  it('generates cryptographically secure API keys, stores only SHA-256 hashes, and verifies in constant time', () => {
    const db = new DatabaseManager({ databasePath: ':memory:' }).initialize();
    const apiKeyManager = new ApiKeyManager({ apiKeyRepo: db.apiKeyRepo });

    const created = apiKeyManager.createApiKey({
      identityId: 'owner',
      label: 'primary-key',
      scopes: [AUTH_SCOPES.READ, AUTH_SCOPES.MESSAGES_WRITE],
      allowedGuildIds: ['555555555555555555']
    });

    expect(created.plaintextKey.startsWith('damcp_live_')).toBe(true);
    expect(created.keyHash).toBe(hashApiKey(created.plaintextKey));
    expect(constantTimeCompareHex(created.keyHash, hashApiKey(created.plaintextKey))).toBe(true);
    expect(constantTimeCompareHex(created.keyHash, hashApiKey('wrong_key'))).toBe(false);

    const verified = apiKeyManager.verifyKey(created.plaintextKey);
    expect(verified.identityId).toBe('owner');
    expect(verified.scopes).toContain(AUTH_SCOPES.MESSAGES_WRITE);
    expect(verified.allowedGuildIds).toEqual(['555555555555555555']);

    const rotated = apiKeyManager.rotateApiKey(created.keyId, { label: 'rotated-key' });
    expect(rotated.keyId).not.toBe(created.keyId);

    expect(() => apiKeyManager.verifyKey(created.plaintextKey)).toThrowError(/Invalid or revoked/);

    const verifiedRotated = apiKeyManager.verifyKey(rotated.plaintextKey);
    expect(verifiedRotated.keyId).toBe(rotated.keyId);

    apiKeyManager.revokeApiKey(rotated.keyId);
    expect(() => apiKeyManager.verifyKey(rotated.plaintextKey)).toThrowError(/Invalid or revoked/);

    db.close();
  });
});

describe('OAuth 2.1 Resource Server & PKCE S256', () => {
  it('verifies PKCE S256 challenges and builds RFC 9728 Protected Resource Metadata', async () => {
    const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk_valid_verifier_12345';
    const challenge = generatePkceChallenge(codeVerifier);
    expect(verifyPkceS256(codeVerifier, challenge)).toBe(true);
    expect(verifyPkceS256('wrong_code_verifier_value_that_is_at_least_43_chars_long', challenge)).toBe(false);

    const configManager = new ConfigurationManager(
      {
        PUBLIC_BASE_URL: 'https://mcp.example.com',
        MCP_PATH: '/mcp',
        AUTH_MODE: 'hybrid',
        OAUTH_ISSUER_URL: 'https://auth.example.com'
      },
      { requireToken: false }
    );

    const db = new DatabaseManager({ databasePath: ':memory:' }).initialize();
    const oauthProvider = new OAuthResourceProvider({
      config: configManager.config,
      oauthRepo: db.oauthRepo
    });

    expect(oauthProvider.isEnabled()).toBe(true);
    const prm = oauthProvider.getProtectedResourceMetadata();
    expect(prm.resource).toBe('https://mcp.example.com/mcp');
    expect(prm.authorization_servers).toContain('https://auth.example.com');

    const rawToken = 'oauth_access_token_xyz_123';
    const tokenHash = hashApiKey(rawToken);
    db.oauthRepo.storeToken({
      tokenId: 'tok_1',
      tokenHash,
      clientId: 'claude-web',
      identityId: 'oauth_user_1',
      scopes: [AUTH_SCOPES.READ],
      allowedGuildIds: ['555555555555555555'],
      audience: 'https://mcp.example.com/mcp',
      expiresAt: new Date(Date.now() + 3600_000).toISOString()
    });

    const authInfo = await oauthProvider.verifyAccessToken(rawToken);
    expect(authInfo.clientId).toBe('claude-web');
    expect(authInfo.extra.identityId).toBe('oauth_user_1');
    expect(authInfo.scopes).toEqual([AUTH_SCOPES.READ]);

    db.close();
  });
});

describe('Origin, Host, Rate Limiter, Request Limits, Confirmation, & Redaction', () => {
  it('validates Origin and Host headers against DNS rebinding and untrusted domains', () => {
    const originValidator = new OriginValidator({
      allowedOrigins: ['localhost', '127.0.0.1', 'https://mcp.example.com']
    });

    expect(originValidator.validate(undefined).ok).toBe(true);
    expect(originValidator.validate('https://mcp.example.com').ok).toBe(true);
    expect(originValidator.validate('http://localhost:3000').ok).toBe(true);
    expect(originValidator.validate('https://evil.attacker.com').ok).toBe(false);
    expect(originValidator.validate('null').ok).toBe(false);

    const hostValidator = new HostValidator({
      allowedHosts: ['localhost', '127.0.0.1', 'mcp.example.com']
    });

    expect(hostValidator.validate('mcp.example.com').ok).toBe(true);
    expect(hostValidator.validate('127.0.0.1:3000').ok).toBe(true);
    expect(hostValidator.validate('evil-rebind.com').ok).toBe(false);
    expect(hostValidator.validate('').ok).toBe(false);
  });

  it('enforces multi-tier rate limits, request size limits, concurrency limits, confirmation tokens, and secret redaction', () => {
    const limiter = new RateLimiter({
      enabled: true,
      authFailuresPerMinute: 2
    });
    limiter.consume('auth_failure', '192.0.2.1');
    limiter.consume('auth_failure', '192.0.2.1');
    expect(() => limiter.consume('auth_failure', '192.0.2.1')).toThrowError(/Rate limit exceeded/);

    const limitsManager = new RequestLimitsManager({
      maxRequestSize: 1024,
      maxConcurrentRequests: 2
    });
    expect(() => limitsManager.assertContentLengthAllowed('2048')).toThrowError(/exceeds maximum allowed limit/);

    const release1 = limitsManager.acquireConcurrencySlot();
    const release2 = limitsManager.acquireConcurrencySlot();
    expect(() => limitsManager.acquireConcurrencySlot()).toThrowError(/concurrent request limit/);
    release1();
    release2();

    const confirmation = new ConfirmationManager({ requireConfirmation: true });
    let token = null;
    try {
      confirmation.requireConfirmation('delete_channel', {
        guildId: '555555555555555555',
        channelId: '666666666666666662'
      }, 'Delete channel');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.CONFIRMATION_REQUIRED);
      token = err.details.confirmationToken;
    }
    expect(token).toBeTruthy();

    const verified = confirmation.requireConfirmation('delete_channel', {
      guildId: '555555555555555555',
      channelId: '666666666666666662',
      confirm: true,
      confirmationToken: token
    }, 'Delete channel');
    expect(verified).toBe(true);

    const generated = generateRawApiKey();
    registerSecretForRedaction('my_custom_secret_token_999');
    const redactedText = redactString(`Key: ${generated.plaintextKey} and my_custom_secret_token_999`);
    expect(redactedText).toContain('[REDACTED_API_KEY]');
    expect(redactedText).toContain('[REDACTED_SECRET]');
    expect(redactedText).not.toContain(generated.plaintextKey);

    const redactedObj = redactObject({
      apiKey: generated.plaintextKey,
      clientSecret: 'oauth_secret_abc',
      safeField: 'hello'
    });
    expect(redactedObj.apiKey).toBe('[REDACTED]');
    expect(redactedObj.clientSecret).toBe('[REDACTED]');
    expect(redactedObj.safeField).toBe('hello');
    clearRegisteredSecrets();
  });

  it('enforces AuthenticationManager and AuthorizationManager scope and guild checks', async () => {
    const generated = generateRawApiKey();
    const configManager = new ConfigurationManager(
      {
        AUTH_MODE: 'api_key',
        API_KEY_HASH: generated.keyHash,
        API_KEY_SCOPES: 'discord:read',
        ALLOWED_GUILD_IDS: '555555555555555555'
      },
      { requireToken: false }
    );

    const apiKeyManager = new ApiKeyManager({ config: configManager.config });
    const authManager = new AuthenticationManager({
      config: configManager.config,
      apiKeyManager
    });
    const authzManager = new AuthorizationManager({
      config: configManager.config
    });

    const authContext = await authManager.authenticateRequest({
      authorizationHeader: `Bearer ${generated.plaintextKey}`
    });

    expect(authContext.identity.identityId).toBe('owner');

    authzManager.runWithAuthContext(authContext, () => {
      expect(() =>
        authzManager.assertToolAuthorized({}, {
          toolName: 'get_guild_info',
          category: 'guild',
          readOnly: true,
          guildId: '555555555555555555'
        })
      ).not.toThrow();

      expect(() =>
        authzManager.assertToolAuthorized({}, {
          toolName: 'delete_channel',
          category: 'channel',
          readOnly: false,
          guildId: '555555555555555555'
        })
      ).toThrowError(/Insufficient authorization scopes/);

      expect(() =>
        authzManager.assertToolAuthorized({}, {
          toolName: 'get_guild_info',
          category: 'guild',
          readOnly: true,
          guildId: '999999999999999999'
        })
      ).toThrowError(/not authorized to access or manage Discord guild/);
    });
  });
});
