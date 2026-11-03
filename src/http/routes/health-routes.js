/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { PROJECT_IDENTITY } from '../../core/constants.js';

export function registerHealthRoutes(fastify, { databaseManager, discordClientManager }) {
  fastify.get('/healthz', async (_request, reply) => {
    const dbUp = Boolean(databaseManager?.isHealthy());
    const discordReady = Boolean(discordClientManager?.isReady());

    const payload = {
      status: dbUp ? 'ok' : 'degraded',
      service: PROJECT_IDENTITY.packageName,
      version: PROJECT_IDENTITY.version,
      transport: PROJECT_IDENTITY.transport,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        http: 'up',
        database: dbUp ? 'up' : 'down',
        discordGateway: discordReady ? 'ready' : 'disconnected'
      }
    };

    reply.code(dbUp ? 200 : 503).send(payload);
  });
}

