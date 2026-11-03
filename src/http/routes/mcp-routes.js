/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { Readable } from 'node:stream';
import { ERROR_CODES } from '../../core/constants.js';
import { createSecurityAndAuthPreHandler } from '../middleware/auth-middleware.js';

export function registerMcpRoutes(
  fastify,
  {
    config,
    hostValidator,
    originValidator,
    corsManager,
    rateLimiter,
    requestLimitsManager,
    authenticationManager,
    transportManager,
    logger
  }
) {
  const mcpPath = config?.network?.mcpPath || '/mcp';

  const preHandler = createSecurityAndAuthPreHandler({
    hostValidator,
    originValidator,
    corsManager,
    rateLimiter,
    requestLimitsManager,
    authenticationManager
  });

  fastify.options(mcpPath, async (request, reply) => {
    const hostResult = hostValidator.validate(
      request.headers.host,
      request.headers['x-forwarded-host']
    );
    if (!hostResult.ok) {
      reply.code(403).send({
        jsonrpc: '2.0',
        error: { code: -32000, message: hostResult.message },
        id: null
      });
      return;
    }

    const originResult = originValidator.validate(request.headers.origin);
    if (!originResult.ok) {
      reply.code(403).send({
        jsonrpc: '2.0',
        error: { code: -32000, message: originResult.message },
        id: null
      });
      return;
    }

    const corsResult = corsManager.applyCorsHeaders(request, reply);
    if (!corsResult.handledPreflight) {
      reply.code(204).send();
    }
  });

  fastify.route({
    method: ['POST', 'GET', 'DELETE', 'PUT', 'PATCH'],
    url: mcpPath,
    preHandler,
    handler: async (request, reply) => {
      if (reply.sent) {
        return;
      }

      let releaseSlot;
      try {
        releaseSlot = requestLimitsManager.acquireConcurrencySlot();
      } catch (concurrencyErr) {
        reply.code(429).send({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: concurrencyErr.message,
            data: { errorCode: ERROR_CODES.CONCURRENCY_LIMIT_EXCEEDED }
          },
          id: null
        });
        return;
      }

      try {
        const protocol = request.protocol || 'http';
        const host = request.headers.host || '127.0.0.1:3000';
        const fullUrl = `${protocol}://${host}${request.url}`;

        const webResponse = await transportManager.handleHttpExchange({
          url: fullUrl,
          method: request.method,
          headers: request.headers,
          rawBodyBuffer: request.rawBodyBuffer,
          parsedBody: request.body,
          authContext: request.authContext
        });

        reply.code(webResponse.status);
        webResponse.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        const contentType = webResponse.headers.get('content-type') || '';

        if (!webResponse.body) {
          releaseSlot();
          reply.send();
          return;
        }

        if (contentType.includes('text/event-stream')) {
          const nodeStream = Readable.fromWeb(webResponse.body);
          nodeStream.once('close', releaseSlot);
          nodeStream.once('error', releaseSlot);
          return reply.send(nodeStream);
        }

        const textBody = await webResponse.text();
        releaseSlot();
        return reply.send(textBody);
      } catch (error) {
        releaseSlot?.();
        logger?.error({ error, requestId: request.id }, 'Unhandled error in MCP HTTP exchange');
        if (!reply.sent) {
          reply.code(500).send({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error'
            },
            id: null
          });
        }
      }
    }
  });
}
