/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class ApplicationLifecycleManager {
  constructor({ app, logger } = {}) {
    this.app = app;
    this.logger = logger;
    this.shuttingDown = false;
  }

  registerSignalHandlers() {
    const handleSignal = async (signal) => {
      if (this.shuttingDown) {
        return;
      }
      this.shuttingDown = true;
      this.logger?.info({ signal }, 'Received termination signal, shutting down gracefully');
      try {
        await this.app.shutdown();
        process.exit(0);
      } catch (error) {
        this.logger?.error({ error, signal }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.once('SIGINT', () => handleSignal('SIGINT'));
    process.once('SIGTERM', () => handleSignal('SIGTERM'));
  }
}

