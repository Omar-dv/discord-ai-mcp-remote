/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import pino from 'pino';
import { LOG_LEVELS, PROJECT_IDENTITY } from '../core/constants.js';
import { redactObject, redactString } from '../security/secret-redaction.js';

export function createLogger({ level = 'info', destination } = {}) {
  const validLevel = LOG_LEVELS.includes(level?.toLowerCase?.()) ? level.toLowerCase() : 'info';
  const targetStream = destination || pino.destination({ fd: 2, sync: false });

  const baseLogger = pino(
    {
      name: PROJECT_IDENTITY.packageName,
      level: validLevel,
      redact: {
        paths: [
          'token',
          'discordToken',
          'DISCORD_TOKEN',
          'botToken',
          'webhookToken',
          'password',
          'secret',
          'authorization',
          '*.token',
          '*.discordToken',
          '*.botToken',
          '*.webhookToken',
          '*.password',
          '*.secret',
          '*.authorization'
        ],
        censor: '[REDACTED]'
      },
      formatters: {
        level(label) {
          return { level: label };
        },
        log(object) {
          return redactObject(object);
        }
      },
      hooks: {
        logMethod(inputArgs, method) {
          const sanitizedArgs = inputArgs.map((arg) => {
            if (typeof arg === 'string') {
              return redactString(arg);
            }
            if (arg instanceof Error) {
              return {
                type: arg.name,
                code: arg.code,
                message: redactString(arg.message)
              };
            }
            return redactObject(arg);
          });
          return method.apply(this, sanitizedArgs);
        }
      },
      timestamp: pino.stdTimeFunctions.isoTime
    },
    targetStream
  );

  return baseLogger;
}

