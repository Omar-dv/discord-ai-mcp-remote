/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

export class RateLimiter {
  constructor({
    enabled = true,
    globalPerMinute = 300,
    identityPerMinute = 120,
    toolCallsPerMinute = 90,
    authFailuresPerMinute = 10,
    maxMessagesPerMinute = 30,
    maxDestructivePerMinute = 10,
    windowMs = 60_000,
    rateLimitRepo = null
  } = {}) {
    this.enabled = Boolean(enabled);
    this.windowMs = windowMs;
    this.rateLimitRepo = rateLimitRepo;
    this.buckets = new Map();
    this.limits = {
      global: globalPerMinute,
      identity: identityPerMinute,
      api_key: identityPerMinute,
      tool: toolCallsPerMinute,
      auth_failure: authFailuresPerMinute,
      message: maxMessagesPerMinute,
      destructive: maxDestructivePerMinute
    };
  }

  getLimitForCategory(category) {
    return this.limits[category] || this.limits.tool || 60;
  }

  consume(category, key = 'global', cost = 1) {
    if (!this.enabled) {
      return {
        allowed: true,
        remaining: this.getLimitForCategory(category),
        resetInMs: this.windowMs
      };
    }

    const limit = this.getLimitForCategory(category);
    const now = Date.now();
    const bucketKey = `${category}:${key}`;

    if (this.rateLimitRepo) {
      const dbResult = this.rateLimitRepo.consumeBucket({
        bucketKey,
        limit,
        windowMs: this.windowMs,
        cost,
        now
      });
      if (!dbResult.allowed) {
        throw new AppError(
          ERROR_CODES.RATE_LIMITED,
          `Rate limit exceeded for ${category} (${limit} operations per ${Math.round(this.windowMs / 1000)}s). Try again in ${Math.ceil(dbResult.resetInMs / 1000)}s.`,
          {
            category,
            key,
            limit,
            resetInMs: dbResult.resetInMs
          }
        );
      }
      return dbResult;
    }

    let timestamps = this.buckets.get(bucketKey) || [];
    timestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    if (timestamps.length + cost > limit) {
      const oldest = timestamps[0] || now;
      const resetInMs = Math.max(1000, this.windowMs - (now - oldest));
      throw new AppError(
        ERROR_CODES.RATE_LIMITED,
        `Rate limit exceeded for ${category} (${limit} operations per ${Math.round(this.windowMs / 1000)}s). Try again in ${Math.ceil(resetInMs / 1000)}s.`,
        {
          category,
          key,
          limit,
          resetInMs
        }
      );
    }

    for (let i = 0; i < cost; i += 1) {
      timestamps.push(now);
    }
    this.buckets.set(bucketKey, timestamps);

    return {
      allowed: true,
      remaining: Math.max(0, limit - timestamps.length),
      resetInMs: this.windowMs
    };
  }

  reset() {
    this.buckets.clear();
    if (this.rateLimitRepo) {
      this.rateLimitRepo.clearAll();
    }
  }
}

