/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel
} from 'discord.js';
import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { formatScheduledEvent, formatUser } from '../../utils/formatters.js';

const ENTITY_TYPE_MAP = Object.freeze({
  stage: GuildScheduledEventEntityType.StageInstance,
  voice: GuildScheduledEventEntityType.Voice,
  external: GuildScheduledEventEntityType.External
});

export class EventManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  async fetchEventOrThrow(guild, eventId) {
    let event = guild.scheduledEvents?.cache?.get(eventId) || null;
    if (!event && typeof guild.scheduledEvents?.fetch === 'function') {
      try {
        event = await guild.scheduledEvents.fetch(eventId);
      } catch (error) {
        void error;
        event = null;
      }
    }

    if (!event) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Scheduled event "${eventId}" was not found in guild "${guild.name}".`
      );
    }

    return event;
  }

  async createScheduledEvent({
    guildId,
    name,
    description = undefined,
    scheduledStartTime,
    scheduledEndTime = undefined,
    entityType = 'voice',
    channelId = undefined,
    location = undefined,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageEvents']);

    const resolvedEntityType = ENTITY_TYPE_MAP[entityType] ?? GuildScheduledEventEntityType.Voice;

    if (resolvedEntityType === GuildScheduledEventEntityType.External) {
      if (!location || !scheduledEndTime) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'External scheduled events require both a location and scheduledEndTime.'
        );
      }
    } else if (!channelId) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Voice and Stage scheduled events require a channelId.'
      );
    }

    const createPayload = {
      name,
      description,
      scheduledStartTime: new Date(scheduledStartTime),
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: resolvedEntityType,
      reason
    };

    if (scheduledEndTime) {
      createPayload.scheduledEndTime = new Date(scheduledEndTime);
    }
    if (channelId) {
      createPayload.channel = channelId;
    }
    if (location) {
      createPayload.entityMetadata = { location };
    }

    const created = await guild.scheduledEvents.create(createPayload);
    return formatScheduledEvent(created);
  }

  async editScheduledEvent({
    guildId,
    eventId,
    name,
    description,
    scheduledStartTime,
    scheduledEndTime,
    channelId,
    location,
    status,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageEvents']);

    const event = await this.fetchEventOrThrow(guild, eventId);
    const editPayload = { reason };

    if (name !== undefined) {
      editPayload.name = name;
    }
    if (description !== undefined) {
      editPayload.description = description;
    }
    if (scheduledStartTime !== undefined) {
      editPayload.scheduledStartTime = new Date(scheduledStartTime);
    }
    if (scheduledEndTime !== undefined) {
      editPayload.scheduledEndTime = new Date(scheduledEndTime);
    }
    if (channelId !== undefined) {
      editPayload.channel = channelId;
    }
    if (location !== undefined) {
      editPayload.entityMetadata = { location };
    }
    if (status !== undefined) {
      editPayload.status = status;
    }

    const updated = await event.edit(editPayload);
    return formatScheduledEvent(updated);
  }

  async deleteScheduledEvent({ guildId, eventId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageEvents']);

    const event = await this.fetchEventOrThrow(guild, eventId);
    const snapshot = formatScheduledEvent(event);
    await event.delete();

    return {
      deleted: true,
      event: snapshot
    };
  }

  async getScheduledEvent({ guildId, eventId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const event = await this.fetchEventOrThrow(guild, eventId);
    return formatScheduledEvent(event);
  }

  async listScheduledEvents({ guildId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const eventsCollection = await guild.scheduledEvents.fetch();
    const events = Array.from(eventsCollection.values()).map((evt) =>
      formatScheduledEvent(evt)
    );

    return {
      guildId: guild.id,
      count: events.length,
      events
    };
  }

  async getScheduledEventUsers({ guildId, eventId, limit = 100 }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const event = await this.fetchEventOrThrow(guild, eventId);
    const clampedLimit = Math.min(100, Math.max(1, Number(limit) || 100));

    const subscribers = await event.fetchSubscribers({ limit: clampedLimit });
    const users = Array.from(subscribers.values()).map((sub) =>
      formatUser(sub.user ?? sub)
    );

    return {
      guildId: guild.id,
      eventId: event.id,
      count: users.length,
      users
    };
  }
}

