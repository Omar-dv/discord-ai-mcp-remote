/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { ToolRegistry } from './tool-helper.js';
import { registerBotTools } from './bot-tools.js';
import { registerGuildTools } from './guild-tools.js';
import { registerChannelTools } from './channel-tools.js';
import { registerVoiceTools } from './voice-tools.js';
import { registerRoleTools } from './role-tools.js';
import { registerMemberTools } from './member-tools.js';
import { registerModerationTools } from './moderation-tools.js';
import { registerMessageTools } from './message-tools.js';
import { registerThreadTools } from './thread-tools.js';
import { registerEmojiTools } from './emoji-tools.js';
import { registerStickerTools } from './sticker-tools.js';
import { registerInviteTools } from './invite-tools.js';
import { registerWebhookTools } from './webhook-tools.js';
import { registerEventTools } from './event-tools.js';
import { registerAutoModTools } from './automod-tools.js';
import { registerAuditTools } from './audit-tools.js';
import { registerUtilityTools } from './utility-tools.js';
import { registerBackupTools } from './backup-tools.js';
import { registerCommandTools } from './command-tools.js';

export function registerAllTools(mcpServer, dependencies) {
  const registry = new ToolRegistry({
    mcpServer,
    authorizationManager: dependencies.authorizationManager,
    confirmationManager: dependencies.confirmationManager,
    rateLimiter: dependencies.rateLimiter,
    requestLimitsManager: dependencies.requestLimitsManager,
    auditService: dependencies.auditService,
    logger: dependencies.logger
  });

  registerBotTools(registry, dependencies);
  registerGuildTools(registry, dependencies);
  registerChannelTools(registry, dependencies);
  registerVoiceTools(registry, dependencies);
  registerRoleTools(registry, dependencies);
  registerMemberTools(registry, dependencies);
  registerModerationTools(registry, dependencies);
  registerMessageTools(registry, dependencies);
  registerThreadTools(registry, dependencies);
  registerEmojiTools(registry, dependencies);
  registerStickerTools(registry, dependencies);
  registerInviteTools(registry, dependencies);
  registerWebhookTools(registry, dependencies);
  registerEventTools(registry, dependencies);
  registerAutoModTools(registry, dependencies);
  registerAuditTools(registry, dependencies);
  registerUtilityTools(registry, dependencies);
  registerBackupTools(registry, dependencies);
  registerCommandTools(registry, dependencies);

  return registry;
}
