/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';

export class ModerationService {
  constructor({ databaseManager, logger } = {}) {
    this.databaseManager = databaseManager;
    this.logger = logger;
  }

  get repo() {
    const repo = this.databaseManager?.moderationRepo;
    if (!repo) {
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Moderation repository is unavailable because the database is not initialized.'
      );
    }
    return repo;
  }

  recordModerationAction({
    guildId,
    targetUserId,
    targetUserTag = null,
    moderatorId = null,
    actionType,
    reason = null,
    durationSeconds = null,
    metadata = {}
  }) {
    const created = this.repo.createCase({
      guildId,
      targetUserId,
      targetUserTag,
      moderatorId,
      actionType,
      reason,
      durationSeconds,
      metadata
    });

    this.logger?.info(
      {
        caseId: created?.caseId,
        guildId,
        targetUserId,
        actionType
      },
      'Recorded moderation case in local SQLite database'
    );

    return created;
  }

  getModerationCase(guildId, caseId) {
    const found = this.repo.getCase(guildId, caseId);
    if (!found) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Moderation case #${caseId} was not found in guild "${guildId}".`
      );
    }
    return found;
  }

  getModerationHistory({ guildId, targetUserId = null, limit = 50 }) {
    return this.repo.getHistory({ guildId, targetUserId, limit });
  }
}

