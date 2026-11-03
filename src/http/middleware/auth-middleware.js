/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ERROR_CODES } from '../../core/constants.js';

export function createSecurityAndAuthPreHandler({
  hostValidator,
  originValidator,
  corsManager,
  rateLimiter,
  requestLimitsManager,
  authenticationManager
}) {
  return async function securityAndAuthPreHandler(request, reply) {
    const hostResult = hostValidator.validate(
      request.headers.host,
      request.headers['x-forwarded-host']
    );
    if (!hostResult.ok) {
      reply.code(403).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: hostResult.message,
          data: { errorCode: ERROR_CODES.INVALID_HOST }
        },
        id: null
      });
      return;
    }

    const originResult = originValidator.validate(request.headers.origin);
    if (!originResult.ok) {
      reply.code(403).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: originResult.message,
          data: { errorCode: ERROR_CODES.INVALID_ORIGIN }
        },
        id: null
      });
      return;
    }

    const corsResult = corsManager.applyCorsHeaders(request, reply);
    if (corsResult.handledPreflight) {
      return;
    }

    try {
      requestLimitsManager.assertContentLengthAllowed(request.headers['content-length']);
      rateLimiter.consume('global', 'global');
    } catch (limitErr) {
      const status = limitErr.code === ERROR_CODES.PAYLOAD_TOO_LARGE ? 413 : 429;
      reply.code(status).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: limitErr.message,
          data: { errorCode: limitErr.code }
        },
        id: null
      });
      return;
    }

    if (request.jsonParseError) {
      try {
        await authenticationManager.authenticateRequest({
          authorizationHeader: request.headers.authorization,
          clientIp: request.ip,
          requestId: request.id
        });
      } catch (authErr) {
        if (authErr.details?.wwwAuthenticate) {
          reply.header('WWW-Authenticate', authErr.details.wwwAuthenticate);
        }
        const status = authErr.code === ERROR_CODES.RATE_LIMITED ? 429 : 401;
        reply.code(status).send({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: authErr.message,
            data: { errorCode: authErr.code }
          },
          id: null
        });
        return;
      }

      reply.code(400).send({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON payload'
        },
        id: null
      });
      return;
    }

    try {
      const authContext = await authenticationManager.authenticateRequest({
        authorizationHeader: request.headers.authorization,
        clientIp: request.ip,
        requestId: request.id
      });
      rateLimiter.consume('identity', authContext.identity.identityId);
      request.authContext = authContext;
    } catch (authErr) {
      if (authErr.details?.wwwAuthenticate) {
        reply.header('WWW-Authenticate', authErr.details.wwwAuthenticate);
      }
      const status = authErr.code === ERROR_CODES.RATE_LIMITED ? 429 : 401;
      reply.code(status).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: authErr.message,
          data: { errorCode: authErr.code }
        },
        id: null
      });
    }
  };
}

