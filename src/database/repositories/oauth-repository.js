/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class OAuthRepository {
  constructor(db) {
    this.db = db;

    this.insertStmt = this.db.prepare(`
      INSERT INTO oauth_tokens (
        token_id,
        token_hash,
        refresh_token_hash,
        client_id,
        identity_id,
        scopes_json,
        allowed_guild_ids_json,
        audience,
        expires_at,
        revoked_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `);

    this.getByHashStmt = this.db.prepare(`
      SELECT * FROM oauth_tokens WHERE token_hash = ?
    `);

    this.revokeByTokenIdStmt = this.db.prepare(`
      UPDATE oauth_tokens SET revoked_at = ? WHERE token_id = ? AND revoked_at IS NULL
    `);
  }

  storeToken({
    tokenId,
    tokenHash,
    refreshTokenHash = null,
    clientId,
    identityId,
    scopes = [],
    allowedGuildIds = [],
    audience,
    expiresAt
  }) {
    const createdAt = new Date().toISOString();
    this.insertStmt.run(
      String(tokenId),
      String(tokenHash),
      refreshTokenHash ? String(refreshTokenHash) : null,
      String(clientId),
      String(identityId),
      JSON.stringify(scopes || []),
      JSON.stringify(allowedGuildIds || []),
      String(audience),
      String(expiresAt),
      createdAt
    );
    return this.getTokenByHash(tokenHash);
  }

  getTokenByHash(tokenHash) {
    const row = this.getByHashStmt.get(String(tokenHash));
    if (!row) {
      return null;
    }
    let scopes;
    let allowedGuildIds;
    try {
      scopes = JSON.parse(row.scopes_json || '[]');
    } catch {
      scopes = [];
    }
    try {
      allowedGuildIds = JSON.parse(row.allowed_guild_ids_json || '[]');
    } catch {
      allowedGuildIds = [];
    }
    return {
      tokenId: row.token_id,
      tokenHash: row.token_hash,
      refreshTokenHash: row.refresh_token_hash,
      clientId: row.client_id,
      identityId: row.identity_id,
      scopes,
      allowedGuildIds,
      audience: row.audience,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at
    };
  }

  revokeToken(tokenId) {
    const res = this.revokeByTokenIdStmt.run(new Date().toISOString(), String(tokenId));
    return res.changes > 0;
  }
}
