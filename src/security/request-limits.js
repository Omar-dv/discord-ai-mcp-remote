/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { DISCORD_LIMITS, ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

export class RequestLimitsManager {
  constructor({
    maxRequestSize = 1048576,
    requestTimeoutMs = 30000,
    toolTimeoutMs = 25000,
    maxConcurrentRequests = 50,
    maxAttachmentSizeBytes = DISCORD_LIMITS.MAX_STICKER_SIZE_BYTES
  } = {}) {
    this.maxRequestSize = maxRequestSize;
    this.requestTimeoutMs = requestTimeoutMs;
    this.toolTimeoutMs = toolTimeoutMs;
    this.maxConcurrentRequests = maxConcurrentRequests;
    this.maxAttachmentSizeBytes = maxAttachmentSizeBytes;
    this.activeRequests = 0;
  }

  assertContentLengthAllowed(contentLengthHeader) {
    if (contentLengthHeader === undefined || contentLengthHeader === null || contentLengthHeader === '') {
      return;
    }
    const byteLength = Number(contentLengthHeader);
    if (!Number.isNaN(byteLength) && byteLength > this.maxRequestSize) {
      throw new AppError(
        ERROR_CODES.PAYLOAD_TOO_LARGE,
        `Request payload size (${byteLength} bytes) exceeds maximum allowed limit of ${this.maxRequestSize} bytes.`,
        {
          byteLength,
          maxRequestSize: this.maxRequestSize
        }
      );
    }
  }

  assertBodySizeAllowed(rawBodyOrString) {
    if (!rawBodyOrString) {
      return;
    }
    const byteLength = Buffer.isBuffer(rawBodyOrString)
      ? rawBodyOrString.byteLength
      : Buffer.byteLength(
          typeof rawBodyOrString === 'string'
            ? rawBodyOrString
            : JSON.stringify(rawBodyOrString),
          'utf8'
        );
    if (byteLength > this.maxRequestSize) {
      throw new AppError(
        ERROR_CODES.PAYLOAD_TOO_LARGE,
        `Request payload size (${byteLength} bytes) exceeds maximum allowed limit of ${this.maxRequestSize} bytes.`,
        {
          byteLength,
          maxRequestSize: this.maxRequestSize
        }
      );
    }
  }

  acquireConcurrencySlot() {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      throw new AppError(
        ERROR_CODES.CONCURRENCY_LIMIT_EXCEEDED,
        `Server maximum concurrent request limit (${this.maxConcurrentRequests}) reached. Please retry shortly.`,
        {
          activeRequests: this.activeRequests,
          maxConcurrentRequests: this.maxConcurrentRequests
        }
      );
    }
    this.activeRequests += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.activeRequests = Math.max(0, this.activeRequests - 1);
      }
    };
  }

  async runWithToolTimeout(operationName, promiseFactory) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new AppError(
            ERROR_CODES.NETWORK_ERROR,
            `Tool execution "${operationName}" timed out after ${this.toolTimeoutMs}ms.`
          )
        );
      }, this.toolTimeoutMs);
    });

    try {
      return await Promise.race([promiseFactory(), timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

