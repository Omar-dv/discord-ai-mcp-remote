/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class ApiKeyRepository {
  constructor(db) {
    this.db = db;

    this.insertStmt = this.db.prepare(`
      INSERT INTO api_keys (
        key_id,
        key_prefix,
        key_hash,
        identity_id,
        label,
        scopes_json,
        allowed_guild_ids_json,
        expires_at,
        revoked_at,
        last_used_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
    `);

    this.getByIdStmt = this.db.prepare(`
      SELECT * FROM api_keys WHERE key_id = ?
    `);

    this.listActiveStmt = this.db.prepare(`
      SELECT * FROM api_keys WHERE revoked_at IS NULL ORDER BY created_at DESC
    `);

    this.listAllStmt = this.db.prepare(`
      SELECT * FROM api_keys ORDER BY created_at DESC
    `);

    this.revokeStmt = this.db.prepare(`
      UPDATE api_keys SET revoked_at = ? WHERE key_id = ? AND revoked_at IS NULL
    `);

    this.touchStmt = this.db.prepare(`
      UPDATE api_keys SET last_used_at = ? WHERE key_id = ?
    `);
  }

  createKey({
    keyId,
    keyPrefix,
    keyHash,
    identityId = 'owner',
    label = 'default-key',
    scopes = [],
    allowedGuildIds = [],
    expiresAt = null
  }) {
    const createdAt = new Date().toISOString();
    this.insertStmt.run(
      String(keyId),
      String(keyPrefix),
      String(keyHash),
      String(identityId),
      String(label),
      JSON.stringify(scopes || []),
      JSON.stringify(allowedGuildIds || []),
      expiresAt ? String(expiresAt) : null,
      createdAt
    );
    return this.getKeyById(keyId);
  }

  getKeyById(keyId) {
    const row = this.getByIdStmt.get(String(keyId));
    return row ? this.mapRow(row) : null;
  }

  listActiveKeys() {
    return this.listActiveStmt.all().map((row) => this.mapRow(row));
  }

  listAllKeys() {
    return this.listAllStmt.all().map((row) => {
      const mapped = this.mapRow(row);
      delete mapped.keyHash;
      return mapped;
    });
  }

  revokeKey(keyId) {
    const revokedAt = new Date().toISOString();
    const res = this.revokeStmt.run(revokedAt, String(keyId));
    return res.changes > 0;
  }

  recordKeyUsage(keyId) {
    this.touchStmt.run(new Date().toISOString(), String(keyId));
  }

  mapRow(row) {
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
      keyId: row.key_id,
      keyPrefix: row.key_prefix,
      keyHash: row.key_hash,
      identityId: row.identity_id,
      label: row.label,
      scopes,
      allowedGuildIds,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at
    };
  }
}
