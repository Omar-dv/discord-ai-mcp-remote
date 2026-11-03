/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class RateLimitRepository {
  constructor(db) {
    this.db = db;
    this.getStmt = this.db.prepare(`
      SELECT timestamps_json, updated_at FROM rate_limit_buckets WHERE bucket_key = ?
    `);
    this.upsertStmt = this.db.prepare(`
      INSERT INTO rate_limit_buckets (bucket_key, timestamps_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        timestamps_json = excluded.timestamps_json,
        updated_at = excluded.updated_at
    `);
    this.clearStmt = this.db.prepare('DELETE FROM rate_limit_buckets');
  }

  consumeBucket({ bucketKey, limit, windowMs, cost = 1, now = Date.now() }) {
    const tx = this.db.transaction(() => {
      const row = this.getStmt.get(String(bucketKey));
      let timestamps = [];
      if (row?.timestamps_json) {
        try {
          timestamps = JSON.parse(row.timestamps_json);
        } catch {
          timestamps = [];
        }
      }
      timestamps = timestamps.filter((ts) => now - ts < windowMs);

      if (timestamps.length + cost > limit) {
        const oldest = timestamps[0] || now;
        const resetInMs = Math.max(1000, windowMs - (now - oldest));
        return {
          allowed: false,
          remaining: 0,
          resetInMs
        };
      }

      for (let i = 0; i < cost; i += 1) {
        timestamps.push(now);
      }
      this.upsertStmt.run(String(bucketKey), JSON.stringify(timestamps), now);
      return {
        allowed: true,
        remaining: Math.max(0, limit - timestamps.length),
        resetInMs: windowMs
      };
    });

    return tx();
  }

  clearAll() {
    this.clearStmt.run();
  }
}
