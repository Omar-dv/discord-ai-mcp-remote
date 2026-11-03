/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import crypto from 'node:crypto';
import { ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

export class SessionManager {
  constructor({
    mode = 'stateless',
    ttlSeconds = 1800,
    maxSessionsPerIdentity = 10,
    maxTotalSessions = 200,
    sessionRepo = null,
    logger = null
  } = {}) {
    this.mode = mode;
    this.ttlMs = Math.max(60, Number(ttlSeconds) || 1800) * 1000;
    this.maxSessionsPerIdentity = Math.max(1, Number(maxSessionsPerIdentity) || 10);
    this.maxTotalSessions = Math.max(1, Number(maxTotalSessions) || 200);
    this.sessionRepo = sessionRepo;
    this.logger = logger;
    this.sessions = new Map();
    this.cleanupTimer = null;
  }

  startCleanupInterval(intervalMs = 60_000) {
    if (this.cleanupTimer) {
      return;
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch((err) => {
        this.logger?.warn({ error: err }, 'Error during expired MCP session cleanup');
      });
    }, intervalMs);
    this.cleanupTimer.unref?.();
  }

  generateSessionId() {
    return `mcp_sess_${crypto.randomBytes(24).toString('base64url')}`;
  }

  getActiveSessionsForIdentity(identityId) {
    const now = Date.now();
    const active = [];
    for (const session of this.sessions.values()) {
      if (session.identityId === identityId && session.expiresAtMs > now && !session.closed) {
        active.push(session);
      }
    }
    return active;
  }

  async createSession({ sessionId: explicitSessionId, identity, mcpServerInstance, transport }) {
    await this.cleanupExpiredSessions();

    if (this.sessions.size >= this.maxTotalSessions) {
      throw new AppError(
        ERROR_CODES.SESSION_LIMIT_EXCEEDED,
        `Maximum total active MCP sessions (${this.maxTotalSessions}) reached on this server.`
      );
    }

    const identityId = identity?.identityId || 'owner';
    const existingForIdentity = this.getActiveSessionsForIdentity(identityId);
    if (existingForIdentity.length >= this.maxSessionsPerIdentity) {
      throw new AppError(
        ERROR_CODES.SESSION_LIMIT_EXCEEDED,
        `Maximum active MCP sessions (${this.maxSessionsPerIdentity}) reached for identity "${identityId}".`
      );
    }

    const sessionId = explicitSessionId || transport.sessionId || this.generateSessionId();
    const now = Date.now();
    const expiresAtMs = now + this.ttlMs;
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    const record = {
      sessionId,
      identityId,
      authMethod: identity?.authMethod || 'api_key',
      createdAtMs: now,
      lastActiveAtMs: now,
      expiresAtMs,
      mcpServerInstance,
      transport,
      closed: false
    };

    this.sessions.set(sessionId, record);

    if (this.sessionRepo) {
      this.sessionRepo.createSession({
        sessionId,
        identityId,
        authMethod: record.authMethod,
        expiresAt: expiresAtIso
      });
    }

    this.logger?.info(
      { sessionId, identityId, expiresAt: expiresAtIso },
      'Initialized stateful MCP session'
    );

    return record;
  }

  getAndValidateSession(sessionId, identity) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Bad Request: Mcp-Session-Id header is required in stateful mode.'
      );
    }

    const session = this.sessions.get(sessionId);
    if (!session || session.closed) {
      throw new AppError(ERROR_CODES.SESSION_NOT_FOUND, 'Session not found or terminated.');
    }

    const now = Date.now();
    if (session.expiresAtMs <= now) {
      this.terminateSession(sessionId).catch(() => {});
      throw new AppError(ERROR_CODES.SESSION_EXPIRED, 'MCP session has expired due to inactivity.');
    }

    const callerIdentityId = identity?.identityId;
    if (!callerIdentityId || session.identityId !== callerIdentityId) {
      this.logger?.warn(
        {
          sessionId,
          sessionOwner: session.identityId,
          callerIdentityId
        },
        'Blocked cross-user MCP session access attempt'
      );
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        'Cross-user session access is strictly prohibited. Session belongs to a different authenticated identity.'
      );
    }

    session.lastActiveAtMs = now;
    session.expiresAtMs = now + this.ttlMs;
    if (this.sessionRepo) {
      this.sessionRepo.touchSession(sessionId, new Date(session.expiresAtMs).toISOString());
    }

    return session;
  }

  async terminateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.closed = true;
    this.sessions.delete(sessionId);

    if (this.sessionRepo) {
      this.sessionRepo.terminateSession(sessionId);
    }

    try {
      await session.transport?.close?.();
    } catch {
      void 0;
    }

    try {
      await session.mcpServerInstance?.close?.();
    } catch {
      void 0;
    }

    this.logger?.info(
      { sessionId, identityId: session.identityId },
      'Terminated stateful MCP session'
    );

    return true;
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    const expiredIds = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAtMs <= now || session.closed) {
        expiredIds.push(sessionId);
      }
    }

    for (const sessionId of expiredIds) {
      await this.terminateSession(sessionId);
    }

    return expiredIds.length;
  }

  async closeAll() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const allIds = Array.from(this.sessions.keys());
    for (const sessionId of allIds) {
      await this.terminateSession(sessionId);
    }
  }
}
