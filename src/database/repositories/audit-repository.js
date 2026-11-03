/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { redactObject } from '../../security/secret-redaction.js';

export class AuditRepository {
  constructor(db, { enabled = true } = {}) {
    this.db = db;
    this.enabled = Boolean(enabled);

    this.insertStmt = this.db.prepare(`
      INSERT INTO local_audit_logs (
        tool_name,
        category,
        identity_id,
        guild_id,
        target_id,
        status,
        is_destructive,
        duration_ms,
        details_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.listByGuildStmt = this.db.prepare(`
      SELECT * FROM local_audit_logs
      WHERE guild_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    this.listByGuildAndIdentityStmt = this.db.prepare(`
      SELECT * FROM local_audit_logs
      WHERE guild_id = ? AND identity_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    this.listRecentStmt = this.db.prepare(`
      SELECT * FROM local_audit_logs
      ORDER BY id DESC
      LIMIT ?
    `);

    this.listRecentByIdentityStmt = this.db.prepare(`
      SELECT * FROM local_audit_logs
      WHERE identity_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    this.pruneStmt = this.db.prepare(`
      DELETE FROM local_audit_logs
      WHERE created_at < ?
    `);
  }

  record({
    toolName,
    category = 'general',
    identityId = 'owner',
    guildId = null,
    targetId = null,
    status = 'success',
    isDestructive = false,
    durationMs = 0,
    details = null
  }) {
    if (!this.enabled) {
      return null;
    }

    const createdAt = new Date().toISOString();
    const safeDetails = details ? JSON.stringify(redactObject(details)) : null;

    const result = this.insertStmt.run(
      String(toolName),
      String(category),
      String(identityId || 'owner'),
      guildId ? String(guildId) : null,
      targetId ? String(targetId) : null,
      String(status),
      isDestructive ? 1 : 0,
      Math.max(0, Math.round(Number(durationMs) || 0)),
      safeDetails,
      createdAt
    );

    return {
      id: Number(result.lastInsertRowid),
      toolName,
      category,
      identityId: identityId || 'owner',
      guildId,
      targetId,
      status,
      isDestructive: Boolean(isDestructive),
      durationMs,
      createdAt
    };
  }

  recordEvent(params) {
    return this.record(params);
  }

  list({ guildId = null, identityId = null, limit = 50 } = {}) {
    const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 500);
    let rows;
    if (guildId && identityId) {
      rows = this.listByGuildAndIdentityStmt.all(String(guildId), String(identityId), safeLimit);
    } else if (guildId) {
      rows = this.listByGuildStmt.all(String(guildId), safeLimit);
    } else if (identityId) {
      rows = this.listRecentByIdentityStmt.all(String(identityId), safeLimit);
    } else {
      rows = this.listRecentStmt.all(safeLimit);
    }

    return rows.map((row) => {
      let details = null;
      if (row.details_json) {
        try {
          details = JSON.parse(row.details_json);
        } catch {
          details = null;
        }
      }
      return {
        id: row.id,
        toolName: row.tool_name,
        category: row.category,
        identityId: row.identity_id || 'owner',
        guildId: row.guild_id,
        targetId: row.target_id,
        status: row.status,
        isDestructive: Boolean(row.is_destructive),
        durationMs: row.duration_ms,
        details,
        createdAt: row.created_at
      };
    });
  }

  getAuditHistory(params = {}) {
    return this.list(params);
  }

  pruneOlderThanDays(days = 90) {
    const cutoff = new Date(Date.now() - Number(days) * 86400 * 1000).toISOString();
    const res = this.pruneStmt.run(cutoff);
    return res.changes;
  }
}
