/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { validateOriginHeader } from '@modelcontextprotocol/server';
import { ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

export function normalizeAllowedOriginHostnames(allowedOrigins = []) {
  const hostnames = new Set(['localhost', '127.0.0.1', '[::1]']);

  for (const raw of allowedOrigins) {
    const item = String(raw || '').trim();
    if (!item) {
      continue;
    }
    if (item.includes('://')) {
      if (item.endsWith('://*')) {
        hostnames.add(item.toLowerCase());
        continue;
      }
      try {
        const parsed = new URL(item);
        hostnames.add(parsed.hostname.toLowerCase());
      } catch {
        hostnames.add(item.toLowerCase());
      }
    } else {
      const withoutPort = item.startsWith('[')
        ? item.replace(/\]:\d+$/, ']')
        : item.split(':')[0];
      hostnames.add(withoutPort.toLowerCase());
    }
  }

  return Array.from(hostnames);
}

export class OriginValidator {
  constructor({ allowedOrigins = ['localhost', '127.0.0.1', '[::1]'], logger } = {}) {
    this.allowedOriginHostnames = normalizeAllowedOriginHostnames(allowedOrigins);
    this.logger = logger;
  }

  validate(originHeader) {
    if (originHeader === undefined || originHeader === null || originHeader === '') {
      return { ok: true, origin: null, hostname: null };
    }

    const result = validateOriginHeader(String(originHeader), this.allowedOriginHostnames);
    if (!result.ok) {
      this.logger?.warn(
        {
          originHeader,
          errorCode: result.errorCode,
          allowedOriginHostnames: this.allowedOriginHostnames
        },
        'Rejected request due to invalid or untrusted Origin header'
      );
      return {
        ok: false,
        errorCode: ERROR_CODES.INVALID_ORIGIN,
        message: `Origin "${originHeader}" is not allowed by server security policy.`
      };
    }

    return {
      ok: true,
      origin: result.origin || String(originHeader),
      hostname: result.hostname || null
    };
  }

  assertValid(originHeader) {
    const res = this.validate(originHeader);
    if (!res.ok) {
      throw new AppError(ERROR_CODES.INVALID_ORIGIN, res.message, {
        originHeader
      });
    }
    return res;
  }
}

