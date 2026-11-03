/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class TransportLifecycleManager {
  constructor({ sessionManager, fastifyServer, logger } = {}) {
    this.sessionManager = sessionManager;
    this.fastifyServer = fastifyServer;
    this.logger = logger;
  }

  async closeAll() {
    if (this.sessionManager) {
      await this.sessionManager.closeAll();
    }
    if (this.fastifyServer) {
      await this.fastifyServer.close();
      this.logger?.info('Fastify HTTP server closed gracefully');
    }
  }
}

