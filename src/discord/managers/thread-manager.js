/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ChannelType } from 'discord.js';
import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { formatThread } from '../../utils/formatters.js';

export class ThreadManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  assertThreadChannel(channel) {
    const isThread =
      typeof channel.isThread === 'function'
        ? channel.isThread()
        : [
            ChannelType.PublicThread,
            ChannelType.PrivateThread,
            ChannelType.AnnouncementThread
          ].includes(channel.type);

    if (!isThread) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Channel "${channel.name || channel.id}" (${channel.id}) is not a thread channel.`
      );
    }
  }

  async createThread({
    guildId = null,
    channelId,
    name,
    autoArchiveDuration = 1440,
    type = 'public_thread',
    invitable = false,
    rateLimitPerUser = 0,
    reason = undefined
  }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    const threadType =
      type === 'private_thread' ? ChannelType.PrivateThread : ChannelType.PublicThread;

    const requiredPerm =
      threadType === ChannelType.PrivateThread
        ? 'CreatePrivateThreads'
        : 'CreatePublicThreads';

    this.permissionService.ensureBotChannelPermissions(channel, ['ViewChannel', requiredPerm]);

    if (!channel.threads || typeof channel.threads.create !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Channel "${channel.name || channel.id}" does not support standalone thread creation.`
      );
    }

    const thread = await channel.threads.create({
      name,
      autoArchiveDuration,
      type: threadType,
      invitable,
      rateLimitPerUser,
      reason
    });

    return formatThread(thread);
  }

  async deleteThread({ guildId = null, threadId, reason = undefined }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    this.permissionService.ensureBotChannelPermissions(thread, ['ManageThreads']);

    const snapshot = formatThread(thread);
    await thread.delete(reason);

    return {
      deleted: true,
      thread: snapshot
    };
  }

  async archiveThread({ guildId = null, threadId, reason = undefined }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    this.permissionService.ensureBotChannelPermissions(thread, ['ManageThreads']);

    const updated = await thread.setArchived(true, reason);
    return formatThread(updated);
  }

  async unarchiveThread({ guildId = null, threadId, reason = undefined }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    this.permissionService.ensureBotChannelPermissions(thread, ['ManageThreads']);

    const updated = await thread.setArchived(false, reason);
    return formatThread(updated);
  }

  async lockThread({ guildId = null, threadId, reason = undefined }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    this.permissionService.ensureBotChannelPermissions(thread, ['ManageThreads']);

    const updated = await thread.setLocked(true, reason);
    return formatThread(updated);
  }

  async unlockThread({ guildId = null, threadId, reason = undefined }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    this.permissionService.ensureBotChannelPermissions(thread, ['ManageThreads']);

    const updated = await thread.setLocked(false, reason);
    return formatThread(updated);
  }

  async joinThread({ guildId = null, threadId }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    await thread.join();

    return {
      joined: true,
      thread: formatThread(thread)
    };
  }

  async leaveThread({ guildId = null, threadId }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    await thread.leave();

    return {
      left: true,
      thread: formatThread(thread)
    };
  }

  async addThreadMember({ guildId = null, threadId, userId }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    this.permissionService.ensureBotChannelPermissions(thread, ['ViewChannel', 'SendMessagesInThreads']);

    await thread.members.add(userId);
    return {
      added: true,
      threadId: thread.id,
      userId
    };
  }

  async removeThreadMember({ guildId = null, threadId, userId }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    this.permissionService.ensureBotChannelPermissions(thread, ['ManageThreads']);

    await thread.members.remove(userId);
    return {
      removed: true,
      threadId: thread.id,
      userId
    };
  }

  async getThreadInfo({ guildId = null, threadId }) {
    const thread = await this.discordClientManager.getChannelOrThrow(threadId, guildId);
    this.assertThreadChannel(thread);
    return formatThread(thread);
  }

  async listActiveThreads({ guildId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    let threads = [];

    if (typeof guild.channels?.fetchActiveThreads === 'function') {
      const fetched = await guild.channels.fetchActiveThreads();
      threads = Array.from(fetched.threads.values()).map((t) => formatThread(t));
    } else if (guild.channels?.cache) {
      threads = Array.from(guild.channels.cache.values())
        .filter((ch) => typeof ch.isThread === 'function' && ch.isThread() && !ch.archived)
        .map((t) => formatThread(t));
    }

    return {
      guildId: guild.id,
      count: threads.length,
      threads
    };
  }

  async listArchivedThreads({ guildId = null, channelId, type = 'public', limit = 25 }) {
    const channel = await this.discordClientManager.getChannelOrThrow(channelId, guildId);
    this.permissionService.ensureBotChannelPermissions(channel, [
      'ViewChannel',
      'ReadMessageHistory'
    ]);

    if (!channel.threads || typeof channel.threads.fetchArchived !== 'function') {
      throw new AppError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `Channel "${channel.id}" does not support fetching archived threads.`
      );
    }

    const clampedLimit = Math.min(100, Math.max(1, Number(limit) || 25));
    const fetched = await channel.threads.fetchArchived({
      type: type === 'private' ? 'private' : 'public',
      limit: clampedLimit
    });

    const threads = Array.from(fetched.threads.values()).map((t) => formatThread(t));

    return {
      channelId: channel.id,
      type,
      count: threads.length,
      hasMore: Boolean(fetched.hasMore),
      threads
    };
  }
}

