/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  guildIdSchema,
  channelIdSchema,
  eventIdSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerEventTools(registry, { eventManager }) {
  registry.register({
    name: 'create_scheduled_event',
    title: 'Create Scheduled Event',
    description: 'Create a scheduled voice, stage, or external event in a Discord guild.',
    category: 'event',
    schema: z.object({
      guildId: guildIdSchema,
      name: z.string().trim().min(1).max(100),
      description: z.string().trim().max(1000).optional(),
      scheduledStartTime: z.string().trim().min(1).describe('ISO 8601 start timestamp'),
      scheduledEndTime: z.string().trim().min(1).optional().describe('ISO 8601 end timestamp (required for external events)'),
      entityType: z.enum(['voice', 'stage', 'external']).default('voice'),
      channelId: channelIdSchema.optional().describe('Voice or Stage channel ID (required for voice/stage events)'),
      location: z.string().trim().max(100).optional().describe('Location string (required for external events)'),
      reason: reasonSchema
    }),
    handler: async (args) => eventManager.createScheduledEvent(args)
  });

  registry.register({
    name: 'edit_scheduled_event',
    title: 'Edit Scheduled Event',
    description: 'Modify an existing scheduled event in a Discord guild.',
    category: 'event',
    schema: z.object({
      guildId: guildIdSchema,
      eventId: eventIdSchema,
      name: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(1000).optional(),
      scheduledStartTime: z.string().trim().min(1).optional(),
      scheduledEndTime: z.string().trim().min(1).optional(),
      channelId: channelIdSchema.optional(),
      location: z.string().trim().max(100).optional(),
      status: z.number().int().min(1).max(4).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => eventManager.editScheduledEvent(args)
  });

  registry.register({
    name: 'delete_scheduled_event',
    title: 'Delete Scheduled Event',
    description: 'Delete a scheduled event in a Discord guild (destructive operation requiring confirmation).',
    category: 'event',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      eventId: eventIdSchema,
      ...confirmationFields
    }),
    handler: async (args) => eventManager.deleteScheduledEvent(args)
  });

  registry.register({
    name: 'get_scheduled_event',
    title: 'Get Scheduled Event',
    description: 'Retrieve details for a specific scheduled event in a guild.',
    category: 'event',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      eventId: eventIdSchema
    }),
    handler: async (args) => eventManager.getScheduledEvent(args)
  });

  registry.register({
    name: 'list_scheduled_events',
    title: 'List Scheduled Events',
    description: 'List all scheduled events in a Discord guild.',
    category: 'event',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema
    }),
    handler: async (args) => eventManager.listScheduledEvents(args)
  });

  registry.register({
    name: 'get_scheduled_event_users',
    title: 'Get Scheduled Event Users',
    description: 'List users who have subscribed (marked interested) to a scheduled event.',
    category: 'event',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      eventId: eventIdSchema,
      limit: z.number().int().min(1).max(100).optional()
    }),
    handler: async (args) => eventManager.getScheduledEventUsers(args)
  });
}

