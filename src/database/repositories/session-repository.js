/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class SessionRepository {
  constructor(db) {
    this.db = db;

    this.insertStmt = this.db.prepare(`
      INSERT INTO mcp_sessions (
        session_id,
        identity_id,
        auth_method,
        created_at,
        last_active_at,
        expires_at,
        terminated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)
    `);

    this.getStmt = this.db.prepare(`
      SELECT * FROM mcp_sessions WHERE session_id = ?
    `);

    this.touchStmt = this.db.prepare(`
      UPDATE mcp_sessions
      SET last_active_at = ?, expires_at = ?
      WHERE session_id = ? AND terminated_at IS NULL
    `);

    this.terminateStmt = this.db.prepare(`
      UPDATE mcp_sessions
      SET terminated_at = ?
      WHERE session_id = ? AND terminated_at IS NULL
    `);

    this.listActiveByIdentityStmt = this.db.prepare(`
      SELECT * FROM mcp_sessions
      WHERE identity_id = ? AND terminated_at IS NULL AND expires_at > ?
    `);
  }

  createSession({ sessionId, identityId, authMethod = 'api_key', expiresAt }) {
    const nowIso = new Date().toISOString();
    this.insertStmt.run(
      String(sessionId),
      String(identityId),
      String(authMethod),
      nowIso,
      nowIso,
      String(expiresAt)
    );
    return this.getSession(sessionId);
  }

  getSession(sessionId) {
    const row = this.getStmt.get(String(sessionId));
    if (!row) {
      return null;
    }
    return {
      sessionId: row.session_id,
      identityId: row.identity_id,
      authMethod: row.auth_method,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      expiresAt: row.expires_at,
      terminatedAt: row.terminated_at
    };
  }

  touchSession(sessionId, newExpiresAt) {
    this.touchStmt.run(new Date().toISOString(), String(newExpiresAt), String(sessionId));
  }

  terminateSession(sessionId) {
    const res = this.terminateStmt.run(new Date().toISOString(), String(sessionId));
    return res.changes > 0;
  }

  listActiveByIdentity(identityId) {
    return this.listActiveByIdentityStmt.all(String(identityId), new Date().toISOString());
  }
}
