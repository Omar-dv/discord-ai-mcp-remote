/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  formatToolErrorResult,
  formatToolSuccessResult,
  normalizeError
} from '../../utils/errors.js';
import { validateInput } from '../../security/validation.js';
import { getRequiredScopesForTool } from '../../auth/scopes.js';

export class ToolRegistry {
  constructor({
    mcpServer,
    authorizationManager,
    confirmationManager,
    rateLimiter,
    requestLimitsManager,
    auditService,
    logger
  } = {}) {
    this.mcpServer = mcpServer;
    this.authorizationManager = authorizationManager;
    this.confirmationManager = confirmationManager;
    this.rateLimiter = rateLimiter;
    this.requestLimitsManager = requestLimitsManager;
    this.auditService = auditService;
    this.logger = logger;
    this.registeredTools = new Map();
  }

  register({
    name,
    title,
    description,
    category = 'general',
    schema = z.object({}),
    readOnly = false,
    destructive = false,
    idempotent = false,
    requiredScopes = null,
    handler
  }) {
    if (this.registeredTools.has(name)) {
      return this.registeredTools.get(name);
    }

    const isDestructive =
      Boolean(destructive) || Boolean(this.confirmationManager?.isDestructiveOperation(name));

    const annotations = {
      title: title || name,
      readOnlyHint: Boolean(readOnly) && !isDestructive,
      destructiveHint: isDestructive,
      idempotentHint: Boolean(idempotent),
      openWorldHint: true
    };

    const resolvedScopes =
      Array.isArray(requiredScopes) && requiredScopes.length > 0
        ? requiredScopes
        : getRequiredScopesForTool(name, category, annotations.readOnlyHint);

    const wrappedCallback = async (rawArgs = {}, ctx = {}) => {
      const startTime = Date.now();
      const guildId = rawArgs?.guildId || null;
      const targetId =
        rawArgs?.channelId ||
        rawArgs?.roleId ||
        rawArgs?.userId ||
        rawArgs?.messageId ||
        rawArgs?.threadId ||
        rawArgs?.emojiId ||
        rawArgs?.stickerId ||
        rawArgs?.webhookId ||
        rawArgs?.eventId ||
        rawArgs?.ruleId ||
        rawArgs?.commandId ||
        null;

      let identityId = 'owner';

      try {
        if (this.authorizationManager) {
          const identity = this.authorizationManager.assertToolAuthorized(ctx, {
            toolName: name,
            category,
            readOnly: annotations.readOnlyHint,
            requiredScopes: resolvedScopes,
            guildId
          });
          identityId = identity.identityId || 'owner';
        }

        this.rateLimiter?.consume('tool', identityId);

        const validatedArgs = validateInput(schema, rawArgs || {});
        const verifiedGuildId = validatedArgs?.guildId || guildId;

        if (verifiedGuildId && this.authorizationManager) {
          const currentIdentity = this.authorizationManager.resolveIdentity(ctx);
          if (currentIdentity) {
            this.authorizationManager.assertGuildAccess(currentIdentity, verifiedGuildId, name);
          }
        }

        if (isDestructive) {
          this.rateLimiter?.consume('destructive', verifiedGuildId || identityId);
          this.confirmationManager?.requireConfirmation(
            name,
            validatedArgs,
            `${title || name} (${description})`
          );
        }

        const executeHandler = () => handler(validatedArgs, ctx);
        const resultData = this.requestLimitsManager
          ? await this.requestLimitsManager.runWithToolTimeout(name, executeHandler)
          : await executeHandler();

        const durationMs = Date.now() - startTime;

        this.logger?.info(
          {
            tool: name,
            category,
            identityId,
            guildId: verifiedGuildId,
            targetId,
            isDestructive,
            durationMs
          },
          'Executed MCP tool successfully'
        );

        this.auditService?.recordLocalToolExecution({
          toolName: name,
          category,
          identityId,
          guildId: verifiedGuildId,
          targetId,
          status: 'success',
          isDestructive,
          durationMs,
          details: { args: validatedArgs }
        });

        return formatToolSuccessResult(resultData, name, {
          category,
          durationMs
        });
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const normalized = normalizeError(error);

        this.logger?.warn(
          {
            tool: name,
            category,
            identityId,
            guildId,
            targetId,
            errorCode: normalized.code,
            errorMessage: normalized.message,
            durationMs
          },
          'MCP tool execution failed or was blocked'
        );

        this.auditService?.recordLocalToolExecution({
          toolName: name,
          category,
          identityId,
          guildId,
          targetId,
          status: normalized.code,
          isDestructive,
          durationMs,
          details: {
            errorCode: normalized.code,
            errorMessage: normalized.message
          }
        });

        return formatToolErrorResult(normalized, name);
      }
    };

    const mcpToolHandle = this.mcpServer.registerTool(
      name,
      {
        title: title || name,
        description,
        inputSchema: schema,
        annotations
      },
      wrappedCallback
    );

    const metadata = {
      name,
      title: title || name,
      description,
      category,
      readOnly: annotations.readOnlyHint,
      destructive: annotations.destructiveHint,
      idempotent: annotations.idempotentHint,
      requiredScopes: resolvedScopes,
      schema,
      execute: wrappedCallback,
      mcpToolHandle
    };

    this.registeredTools.set(name, metadata);
    return metadata;
  }

  listTools() {
    return Array.from(this.registeredTools.values()).map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      category: tool.category,
      readOnly: tool.readOnly,
      destructive: tool.destructive,
      idempotent: tool.idempotent,
      requiredScopes: tool.requiredScopes
    }));
  }
}
