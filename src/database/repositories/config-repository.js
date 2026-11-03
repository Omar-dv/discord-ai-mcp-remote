/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class ConfigRepository {
  constructor(db) {
    this.db = db;
    this.getStmt = this.db.prepare('SELECT value, updated_at FROM local_config WHERE key = ?');
    this.setStmt = this.db.prepare(`
      INSERT INTO local_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    this.deleteStmt = this.db.prepare('DELETE FROM local_config WHERE key = ?');
    this.listStmt = this.db.prepare('SELECT key, value, updated_at FROM local_config ORDER BY key ASC');
  }

  get(key, defaultValue = null) {
    const row = this.getStmt.get(String(key));
    if (!row) {
      return defaultValue;
    }
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  set(key, value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const updatedAt = new Date().toISOString();
    this.setStmt.run(String(key), serialized, updatedAt);
    return { key: String(key), value, updatedAt };
  }

  delete(key) {
    const result = this.deleteStmt.run(String(key));
    return result.changes > 0;
  }

  listAll() {
    return this.listStmt.all().map((row) => {
      let parsed;
      try {
        parsed = JSON.parse(row.value);
      } catch {
        parsed = row.value;
      }
      return {
        key: row.key,
        value: parsed,
        updatedAt: row.updated_at
      };
    });
  }
}
