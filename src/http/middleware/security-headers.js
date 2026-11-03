/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export function applySecurityHeaders(reply, requestId, isHttps = false) {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('X-XSS-Protection', '0');
  reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  reply.header('X-Permitted-Cross-Domain-Policies', 'none');
  if (requestId) {
    reply.header('X-Request-Id', String(requestId));
  }
  if (isHttps) {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}
