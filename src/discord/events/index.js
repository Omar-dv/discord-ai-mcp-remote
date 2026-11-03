/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { Events } from 'discord.js';
import { redactString } from '../../security/secret-redaction.js';

export function registerDiscordEvents(client, logger) {
  if (!client || typeof client.on !== 'function') {
    return;
  }

  client.on(Events.ClientReady, (readyClient) => {
    logger?.info(
      {
        botUserId: readyClient.user?.id,
        botTag: readyClient.user?.tag,
        guildCount: readyClient.guilds?.cache?.size ?? 0
      },
      'Discord client connected and ready'
    );
  });

  client.on(Events.Error, (error) => {
    logger?.error(
      { message: redactString(error?.message || 'Discord client error') },
      'Discord client emitted error event'
    );
  });

  client.on(Events.Warn, (warning) => {
    logger?.warn({ warning: redactString(String(warning)) }, 'Discord client warning');
  });

  client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
    logger?.warn(
      { shardId, code: closeEvent?.code },
      'Discord gateway shard disconnected'
    );
  });

  client.on(Events.ShardReconnecting, (shardId) => {
    logger?.info({ shardId }, 'Discord gateway shard reconnecting');
  });

  client.on(Events.ShardResume, (shardId, replayedEvents) => {
    logger?.info({ shardId, replayedEvents }, 'Discord gateway shard resumed');
  });
}

