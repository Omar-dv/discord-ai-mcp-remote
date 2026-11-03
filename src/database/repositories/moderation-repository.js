/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class ModerationRepository {
  constructor(db) {
    this.db = db;
    this.insertStmt = this.db.prepare(`
      INSERT INTO moderation_cases (
        guild_id,
        target_user_id,
        target_tag,
        moderator_id,
        moderator_tag,
        identity_id,
        action_type,
        reason,
        duration_seconds,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = this.db.prepare(`
      SELECT * FROM moderation_cases WHERE case_id = ? AND guild_id = ?
    `);

    this.listByGuildStmt = this.db.prepare(`
      SELECT * FROM moderation_cases
      WHERE guild_id = ?
      ORDER BY case_id DESC
      LIMIT ?
    `);

    this.listByUserStmt = this.db.prepare(`
      SELECT * FROM moderation_cases
      WHERE guild_id = ? AND target_user_id = ?
      ORDER BY case_id DESC
      LIMIT ?
    `);
  }

  createCase({
    guildId,
    targetUserId,
    targetTag = null,
    moderatorId,
    moderatorTag = null,
    identityId = 'owner',
    actionType,
    reason = 'No reason provided',
    durationSeconds = null,
    metadata = null
  }) {
    const createdAt = new Date().toISOString();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const info = this.insertStmt.run(
      String(guildId),
      String(targetUserId),
      targetTag ? String(targetTag) : null,
      String(moderatorId),
      moderatorTag ? String(moderatorTag) : null,
      String(identityId || 'owner'),
      String(actionType),
      String(reason),
      durationSeconds !== null && durationSeconds !== undefined ? Number(durationSeconds) : null,
      metadataJson,
      createdAt
    );

    return this.getCase(guildId, Number(info.lastInsertRowid));
  }

  getCase(guildId, caseId) {
    const row = this.getByIdStmt.get(Number(caseId), String(guildId));
    return row ? this.mapRow(row) : null;
  }

  getHistory({ guildId, targetUserId = null, limit = 50 }) {
    const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 200);
    const rows = targetUserId
      ? this.listByUserStmt.all(String(guildId), String(targetUserId), safeLimit)
      : this.listByGuildStmt.all(String(guildId), safeLimit);

    return rows.map((row) => this.mapRow(row));
  }

  mapRow(row) {
    let metadata = null;
    if (row.metadata_json) {
      try {
        metadata = JSON.parse(row.metadata_json);
      } catch {
        metadata = null;
      }
    }

    return {
      caseId: row.case_id,
      guildId: row.guild_id,
      targetUserId: row.target_user_id,
      targetTag: row.target_tag,
      moderatorId: row.moderator_id,
      moderatorTag: row.moderator_tag,
      identityId: row.identity_id || 'owner',
      actionType: row.action_type,
      reason: row.reason,
      durationSeconds: row.duration_seconds,
      metadata,
      createdAt: row.created_at
    };
  }
}

