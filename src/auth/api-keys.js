/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import crypto from 'node:crypto';
import { ALL_AUTH_SCOPES, ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';
import { normalizeScopes } from './scopes.js';

const KEY_PREFIX = 'damcp_live_';

export function generateRawApiKey() {
  const randomPart = crypto.randomBytes(32).toString('base64url');
  const keyId = crypto.randomBytes(6).toString('hex');
  const plaintextKey = `${KEY_PREFIX}${keyId}_${randomPart}`;
  const keyHash = hashApiKey(plaintextKey);
  return {
    keyId,
    keyPrefix: `${KEY_PREFIX}${keyId}`,
    plaintextKey,
    keyHash
  };
}

export function hashApiKey(plaintextKey) {
  if (!plaintextKey || typeof plaintextKey !== 'string') {
    throw new AppError(ERROR_CODES.INVALID_API_KEY, 'Invalid API key provided for hashing.');
  }
  return crypto.createHash('sha256').update(plaintextKey.trim(), 'utf8').digest('hex');
}

export function constantTimeCompareHex(hashA, hashB) {
  if (typeof hashA !== 'string' || typeof hashB !== 'string') {
    return false;
  }
  const cleanA = hashA.trim().toLowerCase();
  const cleanB = hashB.trim().toLowerCase();
  if (cleanA.length !== 64 || cleanB.length !== 64) {
    return false;
  }
  try {
    const bufA = Buffer.from(cleanA, 'hex');
    const bufB = Buffer.from(cleanB, 'hex');
    if (bufA.length !== bufB.length || bufA.length !== 32) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export class ApiKeyManager {
  constructor({ apiKeyRepo, config, logger } = {}) {
    this.apiKeyRepo = apiKeyRepo;
    this.config = config;
    this.logger = logger;
  }

  createApiKey({
    identityId = 'owner',
    label = 'default-owner-key',
    scopes = ALL_AUTH_SCOPES,
    allowedGuildIds = [],
    expiresAt = null
  } = {}) {
    const generated = generateRawApiKey();
    const validScopes = normalizeScopes(scopes);

    if (this.apiKeyRepo) {
      this.apiKeyRepo.createKey({
        keyId: generated.keyId,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        identityId,
        label,
        scopes: validScopes,
        allowedGuildIds,
        expiresAt
      });
    }

    this.logger?.info(
      {
        keyId: generated.keyId,
        identityId,
        label,
        scopesCount: validScopes.length
      },
      'Created new API key'
    );

    return {
      keyId: generated.keyId,
      keyPrefix: generated.keyPrefix,
      plaintextKey: generated.plaintextKey,
      keyHash: generated.keyHash,
      identityId,
      label,
      scopes: validScopes,
      allowedGuildIds,
      expiresAt
    };
  }

  rotateApiKey(oldKeyId, options = {}) {
    if (!this.apiKeyRepo) {
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'API key repository is required for key rotation.'
      );
    }

    const existing = this.apiKeyRepo.getKeyById(oldKeyId);
    if (!existing) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `API key with ID "${oldKeyId}" was not found.`
      );
    }

    this.apiKeyRepo.revokeKey(oldKeyId);
    const created = this.createApiKey({
      identityId: options.identityId || existing.identityId,
      label: options.label || `${existing.label}-rotated`,
      scopes: options.scopes || existing.scopes,
      allowedGuildIds: options.allowedGuildIds || existing.allowedGuildIds,
      expiresAt: options.expiresAt !== undefined ? options.expiresAt : existing.expiresAt
    });

    this.logger?.info(
      { oldKeyId, newKeyId: created.keyId, identityId: created.identityId },
      'Rotated API key'
    );

    return created;
  }

  revokeApiKey(keyId) {
    if (!this.apiKeyRepo) {
      return false;
    }
    const revoked = this.apiKeyRepo.revokeKey(keyId);
    if (revoked) {
      this.logger?.info({ keyId }, 'Revoked API key');
    }
    return revoked;
  }

  verifyKey(plaintextKey) {
    if (!plaintextKey || typeof plaintextKey !== 'string') {
      throw new AppError(ERROR_CODES.INVALID_API_KEY, 'Missing or invalid API key.');
    }

    const incomingHash = hashApiKey(plaintextKey);
    const configuredEnvHash = this.config?.auth?.apiKeyHash;

    if (configuredEnvHash && constantTimeCompareHex(incomingHash, configuredEnvHash)) {
      return {
        keyId: 'env-owner-key',
        identityId: 'owner',
        label: 'Environment Configured Owner Key',
        scopes: normalizeScopes(this.config?.auth?.apiKeyScopes || ALL_AUTH_SCOPES),
        allowedGuildIds: this.config?.auth?.allowedGuildIds || [],
        authMethod: 'api_key'
      };
    }

    if (this.apiKeyRepo) {
      const activeKeys = this.apiKeyRepo.listActiveKeys();
      for (const candidate of activeKeys) {
        if (constantTimeCompareHex(incomingHash, candidate.keyHash)) {
          if (candidate.expiresAt && new Date(candidate.expiresAt).getTime() <= Date.now()) {
            throw new AppError(ERROR_CODES.INVALID_API_KEY, 'API key has expired.');
          }
          this.apiKeyRepo.recordKeyUsage(candidate.keyId);
          return {
            keyId: candidate.keyId,
            identityId: candidate.identityId,
            label: candidate.label,
            scopes: normalizeScopes(candidate.scopes),
            allowedGuildIds: candidate.allowedGuildIds || [],
            authMethod: 'api_key'
          };
        }
      }
    }

    throw new AppError(ERROR_CODES.INVALID_API_KEY, 'Invalid or revoked API key.');
  }
}
