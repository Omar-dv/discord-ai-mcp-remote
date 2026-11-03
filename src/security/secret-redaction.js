/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

const SENSITIVE_KEY_PATTERN = /^(token|discord_?token|bot_?token|webhook_?token|access_?token|refresh_?token|client_?secret|secret|secret_?key|api_?key|plaintext_?key|password|passwd|authorization|private_?key|credential|credentials)$/i;

const DISCORD_TOKEN_REGEX = /\b[A-Za-z\d_-]{23,28}\.[A-Za-z\d_-]{6,7}\.[A-Za-z\d_-]{27,}\b/g;

const API_KEY_REGEX = /\bdamcp_live_[a-f0-9]{12}_[A-Za-z0-9_-]{20,}\b/g;

const WEBHOOK_URL_TOKEN_REGEX = /(https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/)([A-Za-z0-9_-]+)/gi;

const BEARER_TOKEN_REGEX = /(Bearer\s+|Bot\s+)[A-Za-z0-9._~+/=-]{16,}/gi;

const registeredSecrets = new Set();

export function registerSecretForRedaction(secretValue) {
  if (typeof secretValue === 'string' && secretValue.trim().length >= 8) {
    registeredSecrets.add(secretValue.trim());
  }
}

export function clearRegisteredSecrets() {
  registeredSecrets.clear();
}

export function redactString(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return input;
  }

  let output = input;

  for (const secret of registeredSecrets) {
    if (secret && output.includes(secret)) {
      output = output.split(secret).join('[REDACTED_SECRET]');
    }
  }

  output = output.replace(WEBHOOK_URL_TOKEN_REGEX, '$1[REDACTED_WEBHOOK_TOKEN]');
  output = output.replace(DISCORD_TOKEN_REGEX, '[REDACTED_DISCORD_TOKEN]');
  output = output.replace(API_KEY_REGEX, '[REDACTED_API_KEY]');
  output = output.replace(BEARER_TOKEN_REGEX, '$1[REDACTED_TOKEN]');

  return output;
}

export function isSensitiveKey(key) {
  if (typeof key !== 'string') {
    return false;
  }
  if (key === 'confirmationToken') {
    return false;
  }
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function redactObject(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item, seen));
  }

  const redacted = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof entryValue === 'bigint') {
      redacted[key] = entryValue.toString();
    } else {
      redacted[key] = redactObject(entryValue, seen);
    }
  }

  return redacted;
}
