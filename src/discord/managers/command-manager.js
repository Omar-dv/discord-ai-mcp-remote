/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ApplicationCommandType } from 'discord.js';
import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';
import { formatApplicationCommand } from '../../utils/formatters.js';

const SLASH_COMMAND_NAME_REGEX = /^[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u;

export class CommandManager {
  constructor({ discordClientManager } = {}) {
    this.discordClientManager = discordClientManager;
  }

  async resolveCommandContainer(guildId = null) {
    const client = this.discordClientManager.ensureReady();
    if (guildId) {
      const guild = await this.discordClientManager.getGuildOrThrow(guildId);
      if (!guild.commands) {
        throw new AppError(
          ERROR_CODES.UNSUPPORTED_OPERATION,
          `Guild command manager is not available for guild "${guildId}".`
        );
      }
      return { container: guild.commands, scope: 'guild', guildId: guild.id };
    }

    if (!client.application?.commands) {
      throw new AppError(
        ERROR_CODES.BOT_NOT_READY,
        'Bot application command manager is not initialized.'
      );
    }

    return {
      container: client.application.commands,
      scope: 'global',
      guildId: null
    };
  }

  validateSlashCommandName(name) {
    if (
      typeof name !== 'string' ||
      name !== name.toLowerCase() ||
      !SLASH_COMMAND_NAME_REGEX.test(name)
    ) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid slash command name "${name}". Must be 1-32 lowercase characters without spaces.`
      );
    }
  }

  async listApplicationCommands({ guildId = null } = {}) {
    const { container, scope } = await this.resolveCommandContainer(guildId);
    const commandsCollection = await container.fetch();
    const commands = Array.from(commandsCollection.values()).map((cmd) =>
      formatApplicationCommand(cmd)
    );

    return {
      scope,
      guildId: guildId || null,
      note: 'Only application commands owned by this configured bot application are listed or managed.',
      count: commands.length,
      commands
    };
  }

  async listGuildApplicationCommands({ guildId }) {
    return this.listApplicationCommands({ guildId });
  }

  async getApplicationCommand({ commandId, guildId = null }) {
    const { container, scope } = await this.resolveCommandContainer(guildId);
    let command = container.cache?.get(commandId) || null;
    if (!command && typeof container.fetch === 'function') {
      try {
        command = await container.fetch(commandId);
      } catch (error) {
        void error;
        command = null;
      }
    }

    if (!command) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Application command "${commandId}" belonging to this bot was not found in ${scope} scope.`
      );
    }

    return formatApplicationCommand(command);
  }

  async createApplicationCommand({
    guildId = null,
    name,
    description,
    options = [],
    nsfw = false
  }) {
    this.validateSlashCommandName(name);
    const { container } = await this.resolveCommandContainer(guildId);

    const created = await container.create({
      name,
      description,
      type: ApplicationCommandType.ChatInput,
      options,
      nsfw
    });

    return formatApplicationCommand(created);
  }

  async editApplicationCommand({
    commandId,
    guildId = null,
    name = undefined,
    description = undefined,
    options = undefined,
    nsfw = undefined
  }) {
    if (name !== undefined) {
      this.validateSlashCommandName(name);
    }

    const { container } = await this.resolveCommandContainer(guildId);
    const editPayload = {};
    if (name !== undefined) {
      editPayload.name = name;
    }
    if (description !== undefined) {
      editPayload.description = description;
    }
    if (options !== undefined) {
      editPayload.options = options;
    }
    if (nsfw !== undefined) {
      editPayload.nsfw = nsfw;
    }

    const updated = await container.edit(commandId, editPayload);
    return formatApplicationCommand(updated);
  }

  async deleteApplicationCommand({ commandId, guildId = null }) {
    const existing = await this.getApplicationCommand({ commandId, guildId });
    const { container } = await this.resolveCommandContainer(guildId);
    await container.delete(commandId);

    return {
      deleted: true,
      command: existing
    };
  }
}

