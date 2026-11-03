/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: '001_initial_schema',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS moderation_cases (
          case_id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL,
          target_user_id TEXT NOT NULL,
          target_tag TEXT,
          moderator_id TEXT NOT NULL,
          moderator_tag TEXT,
          identity_id TEXT DEFAULT 'owner',
          action_type TEXT NOT NULL,
          reason TEXT NOT NULL,
          duration_seconds INTEGER,
          metadata_json TEXT,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_moderation_cases_guild_id
          ON moderation_cases(guild_id);

        CREATE INDEX IF NOT EXISTS idx_moderation_cases_target_user_id
          ON moderation_cases(guild_id, target_user_id);

        CREATE TABLE IF NOT EXISTS local_audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tool_name TEXT NOT NULL,
          category TEXT NOT NULL,
          identity_id TEXT NOT NULL DEFAULT 'owner',
          guild_id TEXT,
          target_id TEXT,
          status TEXT NOT NULL,
          is_destructive INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          details_json TEXT,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_local_audit_logs_guild_id
          ON local_audit_logs(guild_id);

        CREATE INDEX IF NOT EXISTS idx_local_audit_logs_identity_id
          ON local_audit_logs(identity_id);

        CREATE INDEX IF NOT EXISTS idx_local_audit_logs_created_at
          ON local_audit_logs(created_at);
      `);
    }
  },
  {
    version: 2,
    name: '002_remote_auth_and_sessions',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS auth_identities (
          identity_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          scopes_json TEXT NOT NULL,
          allowed_guild_ids_json TEXT NOT NULL DEFAULT '[]',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS api_keys (
          key_id TEXT PRIMARY KEY,
          key_prefix TEXT NOT NULL,
          key_hash TEXT NOT NULL UNIQUE,
          identity_id TEXT NOT NULL,
          label TEXT NOT NULL,
          scopes_json TEXT NOT NULL,
          allowed_guild_ids_json TEXT NOT NULL DEFAULT '[]',
          expires_at TEXT,
          revoked_at TEXT,
          last_used_at TEXT,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_api_keys_identity_id
          ON api_keys(identity_id);

        CREATE TABLE IF NOT EXISTS oauth_tokens (
          token_id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          refresh_token_hash TEXT,
          client_id TEXT NOT NULL,
          identity_id TEXT NOT NULL,
          scopes_json TEXT NOT NULL,
          allowed_guild_ids_json TEXT NOT NULL DEFAULT '[]',
          audience TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          revoked_at TEXT,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_oauth_tokens_hash
          ON oauth_tokens(token_hash);

        CREATE TABLE IF NOT EXISTS mcp_sessions (
          session_id TEXT PRIMARY KEY,
          identity_id TEXT NOT NULL,
          auth_method TEXT NOT NULL,
          created_at TEXT NOT NULL,
          last_active_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          terminated_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_mcp_sessions_identity_id
          ON mcp_sessions(identity_id);

        CREATE TABLE IF NOT EXISTS rate_limit_buckets (
          bucket_key TEXT PRIMARY KEY,
          timestamps_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
    }
  }
]);
