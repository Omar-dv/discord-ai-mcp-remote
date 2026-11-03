/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import crypto from 'node:crypto';
import { DESTRUCTIVE_OPERATIONS, ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

function canonicalizePayload(payload) {
  if (payload === null || payload === undefined || typeof payload !== 'object') {
    return JSON.stringify(payload);
  }

  if (Array.isArray(payload)) {
    return `[${payload.map((item) => canonicalizePayload(item)).join(',')}]`;
  }

  const excludedKeys = new Set(['confirm', 'confirmationToken']);
  const sortedKeys = Object.keys(payload)
    .filter((key) => !excludedKeys.has(key) && payload[key] !== undefined)
    .sort();

  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizePayload(payload[key])}`
  );
  return `{${entries.join(',')}}`;
}

export class ConfirmationManager {
  constructor({ ttlSeconds = 300, secret = crypto.randomBytes(32).toString('hex') } = {}) {
    this.ttlMs = Math.max(30, Number(ttlSeconds) || 300) * 1000;
    this.secret = secret;
    this.pendingConfirmations = new Map();
  }

  isDestructiveOperation(operationName) {
    return DESTRUCTIVE_OPERATIONS.has(operationName);
  }

  computePayloadHash(operationName, params = {}) {
    const canonical = canonicalizePayload(params);
    return crypto
      .createHmac('sha256', this.secret)
      .update(`${operationName}:${canonical}`)
      .digest('hex');
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [token, record] of this.pendingConfirmations.entries()) {
      if (record.expiresAt <= now || record.consumed) {
        this.pendingConfirmations.delete(token);
      }
    }
  }

  createConfirmationRequest(operationName, params = {}, summary = '') {
    this.cleanupExpired();

    const payloadHash = this.computePayloadHash(operationName, params);
    const tokenBytes = crypto.randomBytes(16).toString('hex');
    const confirmationToken = `confirm_${tokenBytes}`;
    const createdAt = Date.now();
    const expiresAt = createdAt + this.ttlMs;

    const sanitizedParams = { ...params };
    delete sanitizedParams.confirm;
    delete sanitizedParams.confirmationToken;

    const record = {
      confirmationToken,
      operationName,
      payloadHash,
      parameters: sanitizedParams,
      summary: summary || `Confirm destructive operation: ${operationName}`,
      createdAt,
      expiresAt,
      consumed: false
    };

    this.pendingConfirmations.set(confirmationToken, record);

    return {
      confirmationToken,
      operationName,
      parameters: sanitizedParams,
      summary: record.summary,
      expiresAt: new Date(expiresAt).toISOString(),
      ttlSeconds: Math.round(this.ttlMs / 1000),
      instructions:
        'Present the operationName, target parameters, and summary to the user. Only after the user explicitly approves this exact action, invoke the tool again with confirm: true and this exact confirmationToken.'
    };
  }

  cancelConfirmation(confirmationToken) {
    this.cleanupExpired();
    const existed = this.pendingConfirmations.delete(confirmationToken);
    return {
      cancelled: existed,
      confirmationToken
    };
  }

  getPendingConfirmation(confirmationToken) {
    this.cleanupExpired();
    const record = this.pendingConfirmations.get(confirmationToken);
    if (!record) {
      return null;
    }
    return {
      confirmationToken: record.confirmationToken,
      operationName: record.operationName,
      parameters: record.parameters,
      summary: record.summary,
      expiresAt: new Date(record.expiresAt).toISOString()
    };
  }

  requireConfirmation(operationName, params = {}, summary = '') {
    this.cleanupExpired();

    const { confirm, confirmationToken } = params || {};

    if (confirm !== true || !confirmationToken || typeof confirmationToken !== 'string') {
      const pending = this.createConfirmationRequest(operationName, params, summary);
      throw new AppError(
        ERROR_CODES.CONFIRMATION_REQUIRED,
        `Destructive operation "${operationName}" requires explicit user confirmation. Ask the user to approve this exact operation, then re-invoke "${operationName}" with confirm: true and confirmationToken: "${pending.confirmationToken}".`,
        {
          confirmationRequired: true,
          ...pending
        }
      );
    }

    const record = this.pendingConfirmations.get(confirmationToken);
    if (!record) {
      const pending = this.createConfirmationRequest(operationName, params, summary);
      throw new AppError(
        ERROR_CODES.CONFIRMATION_REQUIRED,
        `Invalid or expired confirmationToken for "${operationName}". A new confirmationToken "${pending.confirmationToken}" has been issued. Obtain explicit user approval before retrying.`,
        {
          confirmationRequired: true,
          ...pending
        }
      );
    }

    if (record.operationName !== operationName) {
      throw new AppError(
        ERROR_CODES.CONFIRMATION_REQUIRED,
        `Confirmation token "${confirmationToken}" was issued for "${record.operationName}", not "${operationName}".`,
        {
          expectedOperation: record.operationName,
          attemptedOperation: operationName
        }
      );
    }

    const expectedHash = this.computePayloadHash(operationName, params);
    if (record.payloadHash !== expectedHash) {
      const pending = this.createConfirmationRequest(operationName, params, summary);
      throw new AppError(
        ERROR_CODES.CONFIRMATION_REQUIRED,
        `Parameters for "${operationName}" changed after confirmation token was issued. A new confirmationToken "${pending.confirmationToken}" has been generated for the updated parameters.`,
        {
          confirmationRequired: true,
          ...pending
        }
      );
    }

    record.consumed = true;
    this.pendingConfirmations.delete(confirmationToken);
    return true;
  }
}

