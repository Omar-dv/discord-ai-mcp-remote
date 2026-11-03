/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  guildIdSchema,
  commandIdSchema,
  confirmationFields
} from '../../security/validation.js';

const commandOptionSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,32}$/, 'Option name must be 1-32 lowercase alphanumeric, underscore, or hyphen characters.'),
  description: z.string().trim().min(1).max(100),
  type: z.number().int().min(1).max(11).default(3),
  required: z.boolean().optional()
});

export function registerCommandTools(registry, { commandManager }) {
  registry.register({
    name: 'list_application_commands',
    title: 'List Application Commands',
    description: 'List global or guild slash commands belonging to this configured bot application.',
    category: 'command',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema.optional()
    }),
    handler: async (args) => commandManager.listApplicationCommands(args)
  });

  registry.register({
    name: 'list_guild_application_commands',
    title: 'List Guild Application Commands',
    description: 'List guild-scoped slash commands belonging to this configured bot application.',
    category: 'command',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema
    }),
    handler: async (args) => commandManager.listGuildApplicationCommands(args)
  });

  registry.register({
    name: 'get_application_command',
    title: 'Get Application Command',
    description: 'Retrieve details for a specific slash command belonging to this bot application.',
    category: 'command',
    readOnly: true,
    schema: z.object({
      commandId: commandIdSchema,
      guildId: guildIdSchema.optional()
    }),
    handler: async (args) => commandManager.getApplicationCommand(args)
  });

  registry.register({
    name: 'create_application_command',
    title: 'Create Application Command',
    description:
      'Register a new slash command metadata definition on this bot application (requires confirmation; does not execute arbitrary code).',
    category: 'command',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema.optional(),
      name: z
        .string()
        .trim()
        .regex(/^[a-z0-9_-]{1,32}$/, 'Command name must be 1-32 lowercase characters without spaces.'),
      description: z.string().trim().min(1).max(100),
      options: z.array(commandOptionSchema).max(25).optional(),
      nsfw: z.boolean().optional(),
      ...confirmationFields
    }),
    handler: async (args) => commandManager.createApplicationCommand(args)
  });

  registry.register({
    name: 'edit_application_command',
    title: 'Edit Application Command',
    description:
      'Edit an existing slash command definition belonging to this bot application (requires confirmation).',
    category: 'command',
    destructive: true,
    schema: z.object({
      commandId: commandIdSchema,
      guildId: guildIdSchema.optional(),
      name: z
        .string()
        .trim()
        .regex(/^[a-z0-9_-]{1,32}$/)
        .optional(),
      description: z.string().trim().min(1).max(100).optional(),
      options: z.array(commandOptionSchema).max(25).optional(),
      nsfw: z.boolean().optional(),
      ...confirmationFields
    }),
    handler: async (args) => commandManager.editApplicationCommand(args)
  });

  registry.register({
    name: 'delete_application_command',
    title: 'Delete Application Command',
    description:
      'Delete an application command belonging to this bot application (destructive operation requiring confirmation).',
    category: 'command',
    destructive: true,
    schema: z.object({
      commandId: commandIdSchema,
      guildId: guildIdSchema.optional(),
      ...confirmationFields
    }),
    handler: async (args) => commandManager.deleteApplicationCommand(args)
  });
}

