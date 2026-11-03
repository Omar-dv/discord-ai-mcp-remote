/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import crypto from 'node:crypto';
import Fastify from 'fastify';
import { ERROR_CODES } from '../../core/constants.js';
import { applySecurityHeaders } from '../middleware/security-headers.js';
import { registerHealthRoutes } from '../routes/health-routes.js';
import { registerOAuthDiscoveryRoutes } from '../routes/oauth-routes.js';
import { registerMcpRoutes } from '../routes/mcp-routes.js';

export function createHttpServer(dependencies) {
  const {
    config,
    databaseManager,
    discordClientManager,
    hostValidator,
    originValidator,
    corsManager,
    rateLimiter,
    requestLimitsManager,
    authenticationManager,
    oauthProvider,
    transportManager,
    logger
  } = dependencies;

  const maxRequestSize = config?.network?.maxRequestSize || 1048576;
  const requestTimeoutMs = config?.network?.requestTimeoutMs || 30000;
  const trustProxy = Boolean(config?.network?.trustProxy);
  const isHttpsPublic = String(config?.network?.publicBaseUrl || '').startsWith('https://');

  const fastify = Fastify({
    logger: false,
    trustProxy,
    bodyLimit: maxRequestSize,
    requestTimeout: requestTimeoutMs,
    genReqId: (req) => {
      const existing = req.headers['x-request-id'];
      if (existing && typeof existing === 'string' && existing.length <= 128) {
        return existing;
      }
      return `req_${crypto.randomUUID()}`;
    }
  });

  fastify.removeAllContentTypeParsers();

  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: maxRequestSize },
    (req, bodyBuffer, done) => {
      req.rawBodyBuffer = bodyBuffer;
      if (!bodyBuffer || bodyBuffer.length === 0) {
        req.jsonParseError = true;
        done(null, undefined);
        return;
      }
      try {
        const parsed = JSON.parse(bodyBuffer.toString('utf8'));
        done(null, parsed);
      } catch {
        req.jsonParseError = true;
        done(null, undefined);
      }
    }
  );

  fastify.addContentTypeParser(
    '*',
    { parseAs: 'buffer', bodyLimit: maxRequestSize },
    (req, bodyBuffer, done) => {
      req.rawBodyBuffer = bodyBuffer;
      done(null, bodyBuffer);
    }
  );

  fastify.addHook('onRequest', async (request, reply) => {
    const isTls = isHttpsPublic || request.protocol === 'https';
    applySecurityHeaders(reply, request.id, isTls);
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error.statusCode === 413 || error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      reply.code(413).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `Payload Too Large: Request body exceeds limit of ${maxRequestSize} bytes.`,
          data: { errorCode: ERROR_CODES.PAYLOAD_TOO_LARGE }
        },
        id: null
      });
      return;
    }

    logger?.warn({ error, requestId: request.id }, 'HTTP request error');
    reply.code(error.statusCode || 500).send({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.statusCode && error.statusCode < 500 ? error.message : 'Internal server error'
      },
      id: null
    });
  });

  registerHealthRoutes(fastify, { databaseManager, discordClientManager });
  registerOAuthDiscoveryRoutes(fastify, { oauthProvider });
  registerMcpRoutes(fastify, {
    config,
    hostValidator,
    originValidator,
    corsManager,
    rateLimiter,
    requestLimitsManager,
    authenticationManager,
    transportManager,
    logger
  });

  return fastify;
}
