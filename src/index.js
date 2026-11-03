#!/usr/bin/env node
/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { pathToFileURL } from 'node:url';
import { DiscordRemoteMcpApplication } from './core/application.js';
import { ApplicationLifecycleManager } from './core/lifecycle.js';

export async function bootstrap() {
  const app = new DiscordRemoteMcpApplication();
  const lifecycle = new ApplicationLifecycleManager({ app, logger: app.logger });
  lifecycle.registerSignalHandlers();
  await app.start({ connectDiscord: true, listenHttp: true });
  return app;
}

const isMainModule =
  (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) ||
  (process.env.pm_exec_path && import.meta.url === pathToFileURL(process.env.pm_exec_path).href);

if (isMainModule) {
  bootstrap().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        level: 'fatal',
        code: error.code || 'STARTUP_FAILED',
        message: error.message
      }) + '\n'
    );
    process.exit(1);
  });
}

