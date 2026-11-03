/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { validateHostHeader } from '@modelcontextprotocol/server';
import { ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

export function normalizeAllowedHostnames(allowedHosts = []) {
  const hostnames = new Set(['localhost', '127.0.0.1', '[::1]']);

  for (const raw of allowedHosts) {
    const item = String(raw || '').trim();
    if (!item) {
      continue;
    }
    if (item.includes('://')) {
      try {
        const parsed = new URL(item);
        hostnames.add(parsed.hostname.toLowerCase());
        continue;
      } catch {
        void 0;
      }
    }
    const withoutPort = item.startsWith('[')
      ? item.replace(/\]:\d+$/, ']')
      : item.split(':')[0];
    hostnames.add(withoutPort.toLowerCase());
  }

  return Array.from(hostnames);
}

export class HostValidator {
  constructor({ allowedHosts = ['localhost', '127.0.0.1', '[::1]'], trustProxy = false, logger } = {}) {
    this.allowedHostnames = normalizeAllowedHostnames(allowedHosts);
    this.trustProxy = Boolean(trustProxy);
    this.logger = logger;
  }

  validate(hostHeader, forwardedHostHeader = null) {
    const effectiveHost =
      this.trustProxy && forwardedHostHeader
        ? String(forwardedHostHeader).split(',')[0].trim()
        : hostHeader;

    const result = validateHostHeader(effectiveHost, this.allowedHostnames);
    if (!result.ok) {
      this.logger?.warn(
        {
          hostHeader: effectiveHost,
          errorCode: result.errorCode,
          allowedHostnames: this.allowedHostnames
        },
        'Rejected request due to invalid or untrusted Host header'
      );
      return {
        ok: false,
        errorCode: ERROR_CODES.INVALID_HOST,
        message: `Host header "${effectiveHost || ''}" is not in the trusted host allowlist.`
      };
    }

    return {
      ok: true,
      hostname: result.hostname
    };
  }

  assertValid(hostHeader, forwardedHostHeader = null) {
    const res = this.validate(hostHeader, forwardedHostHeader);
    if (!res.ok) {
      throw new AppError(ERROR_CODES.INVALID_HOST, res.message, {
        hostHeader
      });
    }
    return res;
  }
}
