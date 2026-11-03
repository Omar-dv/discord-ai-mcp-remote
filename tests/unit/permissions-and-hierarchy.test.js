/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { describe, it, expect } from 'vitest';
import { PermissionService } from '../../src/services/permissions/permission-service.js';
import { createMockDiscordClient } from '../fixtures/mock-discord.js';

describe('Discord Permission & Role Hierarchy Enforcement', () => {
  const permissionService = new PermissionService();

  it('validates bot guild and channel permissions accurately', () => {
    const { guild, textChannel } = createMockDiscordClient();

    expect(
      permissionService.ensureBotGuildPermissions(guild, ['ManageChannels', 'ManageRoles'])
    ).toEqual({ granted: true, missing: [] });

    expect(() =>
      permissionService.ensureBotGuildPermissions(guild, ['Administrator'])
    ).toThrowError(/Bot is missing required guild permission/);

    expect(
      permissionService.ensureBotChannelPermissions(textChannel, ['ViewChannel', 'SendMessages'])
    ).toEqual({ granted: true, missing: [] });
  });

  it('blocks modifying or deleting roles at or above the bot highest role, @everyone, and managed roles', () => {
    const { guild, everyoneRole, memberRole, highAdminRole, managedRole } =
      createMockDiscordClient();

    expect(permissionService.ensureRoleManageable(guild, memberRole)).toBe(true);

    expect(() => permissionService.ensureRoleManageable(guild, everyoneRole)).toThrowError(
      /@everyone role cannot be deleted/
    );

    expect(() => permissionService.ensureRoleManageable(guild, managedRole)).toThrowError(
      /managed by an external integration/
    );

    expect(() => permissionService.ensureRoleManageable(guild, highAdminRole)).toThrowError(
      /Role hierarchy violation/
    );
  });

  it('prevents privilege escalation when attempting to grant permissions the bot lacks', () => {
    const { guild } = createMockDiscordClient();

    expect(
      permissionService.ensureNoPrivilegeEscalation(guild, ['SendMessages', 'ManageChannels'])
    ).toBe(true);

    expect(() =>
      permissionService.ensureNoPrivilegeEscalation(guild, ['Administrator'])
    ).toThrowError(/Privilege escalation prevented/);
  });

  it('enforces member hierarchy and protects the guild owner and higher-positioned admins', () => {
    const { guild, ownerMember, adminMember, regularMember, botMember } =
      createMockDiscordClient();

    expect(permissionService.ensureMemberHierarchy(guild, regularMember, 'kick')).toBe(true);

    expect(() =>
      permissionService.ensureMemberHierarchy(guild, ownerMember, 'kick')
    ).toThrowError(/Cannot kick the server owner/);

    expect(() =>
      permissionService.ensureMemberHierarchy(guild, adminMember, 'ban')
    ).toThrowError(/Role hierarchy violation/);

    expect(() =>
      permissionService.ensureMemberHierarchy(guild, botMember, 'kick')
    ).toThrowError(/The bot cannot kick itself/);
  });

  it('compares permissions and hierarchy positions between two roles', () => {
    const { memberRole, highAdminRole } = createMockDiscordClient();
    const comparison = permissionService.compareRoles(highAdminRole, memberRole);

    expect(comparison.positionComparison).toContain('Head Admin is higher than Community Member');
    expect(comparison.onlyInRoleA).toContain('Administrator');
  });
});

