/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { ERROR_CODES } from '../../core/constants.js';
import { AppError } from '../../utils/errors.js';

export const VALID_PERMISSION_NAMES = Object.freeze(Object.keys(PermissionFlagsBits));

export const HIGH_RISK_PERMISSIONS = Object.freeze([
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'ManageWebhooks',
  'ManageGuildExpressions',
  'BanMembers',
  'KickMembers',
  'ModerateMembers',
  'ManageMessages',
  'ManageThreads',
  'ManageEvents',
  'MentionEveryone'
]);

export class PermissionService {
  resolvePermissionName(permInput) {
    if (typeof permInput === 'bigint') {
      const bitField = new PermissionsBitField(permInput);
      return bitField.toArray()[0] || String(permInput);
    }

    if (typeof permInput !== 'string') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid permission identifier: "${String(permInput)}".`
      );
    }

    const exact = VALID_PERMISSION_NAMES.find(
      (name) => name.toLowerCase() === permInput.trim().toLowerCase()
    );

    if (!exact) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Unknown Discord permission "${permInput}". Valid permissions include: ${VALID_PERMISSION_NAMES.slice(0, 12).join(', ')}...`
      );
    }

    return exact;
  }

  resolvePermissionBitField(permissionsInput = []) {
    const names = Array.isArray(permissionsInput) ? permissionsInput : [permissionsInput];
    const resolvedNames = names.map((item) => this.resolvePermissionName(item));
    const bits = resolvedNames.map((name) => PermissionFlagsBits[name]);
    return {
      names: resolvedNames,
      bitField: new PermissionsBitField(bits)
    };
  }

  getBotMember(guild) {
    if (!guild) {
      throw new AppError(ERROR_CODES.INVALID_GUILD_ID, 'Guild is required for permission checks.');
    }
    const me = guild.members?.me;
    if (!me) {
      throw new AppError(
        ERROR_CODES.MISSING_ACCESS,
        `Bot member is unavailable in guild "${guild.id}".`
      );
    }
    return me;
  }

  ensureBotGuildPermissions(guild, requiredPermissions = []) {
    const me = this.getBotMember(guild);
    const { names } = this.resolvePermissionNameList(requiredPermissions);

    if (me.permissions?.has(PermissionFlagsBits.Administrator)) {
      return { granted: true, missing: [] };
    }

    const missing = names.filter((permName) => !me.permissions?.has(PermissionFlagsBits[permName]));

    if (missing.length > 0) {
      throw new AppError(
        ERROR_CODES.MISSING_PERMISSIONS,
        `Bot is missing required guild permission(s) in "${guild.name}": ${missing.join(', ')}.`,
        {
          guildId: guild.id,
          missingPermissions: missing
        }
      );
    }

    return { granted: true, missing: [] };
  }

  ensureBotChannelPermissions(channel, requiredPermissions = []) {
    if (!channel || !channel.guild) {
      throw new AppError(
        ERROR_CODES.INVALID_CHANNEL_ID,
        'Guild channel is required for channel permission checks.'
      );
    }

    const me = this.getBotMember(channel.guild);
    const { names } = this.resolvePermissionNameList(requiredPermissions);

    if (me.permissions?.has(PermissionFlagsBits.Administrator)) {
      return { granted: true, missing: [] };
    }

    const channelPerms =
      typeof channel.permissionsFor === 'function' ? channel.permissionsFor(me) : me.permissions;

    const missing = names.filter(
      (permName) => !channelPerms?.has(PermissionFlagsBits[permName])
    );

    if (missing.length > 0) {
      throw new AppError(
        ERROR_CODES.MISSING_PERMISSIONS,
        `Bot is missing required channel permission(s) in "#${channel.name || channel.id}": ${missing.join(', ')}.`,
        {
          guildId: channel.guild.id,
          channelId: channel.id,
          missingPermissions: missing
        }
      );
    }

    return { granted: true, missing: [] };
  }

  resolvePermissionNameList(requiredPermissions = []) {
    const list = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const names = list.map((item) => this.resolvePermissionName(item));
    return { names };
  }

  ensureNoPrivilegeEscalation(guild, requestedPermissions = []) {
    const me = this.getBotMember(guild);
    if (guild.ownerId === me.id || me.permissions?.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    const { names } = this.resolvePermissionNameList(requestedPermissions);
    const unauthorized = names.filter(
      (permName) => !me.permissions?.has(PermissionFlagsBits[permName])
    );

    if (unauthorized.length > 0) {
      throw new AppError(
        ERROR_CODES.ROLE_HIERARCHY_VIOLATION,
        `Privilege escalation prevented: the bot cannot grant permission(s) it does not hold itself (${unauthorized.join(', ')}).`,
        {
          guildId: guild.id,
          unauthorizedPermissions: unauthorized
        }
      );
    }

    return true;
  }

  ensureRoleManageable(guild, targetRole, { allowEveryone = false } = {}) {
    if (!targetRole) {
      throw new AppError(ERROR_CODES.INVALID_ROLE_ID, 'Target role was not found.');
    }

    if (!allowEveryone && targetRole.id === guild.id) {
      throw new AppError(
        ERROR_CODES.ROLE_HIERARCHY_VIOLATION,
        'The @everyone role cannot be deleted, assigned, or moved.'
      );
    }

    if (targetRole.managed) {
      throw new AppError(
        ERROR_CODES.ROLE_HIERARCHY_VIOLATION,
        `Role "${targetRole.name}" (${targetRole.id}) is managed by an external integration or bot and cannot be modified or deleted.`
      );
    }

    const me = this.getBotMember(guild);
    if (guild.ownerId === me.id) {
      return true;
    }

    const botHighestRole = me.roles?.highest;
    const botPosition = botHighestRole?.position ?? 0;
    const targetPosition = targetRole.position ?? 0;

    if (targetRole.id !== guild.id && targetPosition >= botPosition) {
      throw new AppError(
        ERROR_CODES.ROLE_HIERARCHY_VIOLATION,
        `Role hierarchy violation: target role "${targetRole.name}" (position ${targetPosition}) is at or above the bot's highest role "${botHighestRole?.name || 'unknown'}" (position ${botPosition}).`,
        {
          guildId: guild.id,
          targetRoleId: targetRole.id,
          targetRolePosition: targetPosition,
          botHighestRoleId: botHighestRole?.id ?? null,
          botHighestRolePosition: botPosition
        }
      );
    }

    return true;
  }

  ensurePositionBelowBot(guild, requestedPosition) {
    const me = this.getBotMember(guild);
    if (guild.ownerId === me.id) {
      return true;
    }

    const botHighestPosition = me.roles?.highest?.position ?? 0;
    if (Number(requestedPosition) >= botHighestPosition) {
      throw new AppError(
        ERROR_CODES.ROLE_HIERARCHY_VIOLATION,
        `Cannot set role position to ${requestedPosition} because the bot's highest role is at position ${botHighestPosition}.`,
        {
          requestedPosition,
          botHighestRolePosition: botHighestPosition
        }
      );
    }

    return true;
  }

  ensureMemberHierarchy(guild, targetMember, actionLabel = 'modify') {
    if (!targetMember) {
      throw new AppError(ERROR_CODES.INVALID_USER_ID, 'Target guild member was not found.');
    }

    const targetId = targetMember.id ?? targetMember.user?.id;
    const me = this.getBotMember(guild);

    if (targetId === guild.ownerId) {
      throw new AppError(
        ERROR_CODES.GUILD_OWNER_PROTECTED,
        `Cannot ${actionLabel} the server owner (${targetId}). Discord prohibits bots from moderating or modifying the guild owner.`,
        {
          guildId: guild.id,
          ownerId: guild.ownerId
        }
      );
    }

    if (targetId === me.id && ['kick', 'ban', 'timeout'].includes(actionLabel)) {
      throw new AppError(
        ERROR_CODES.ROLE_HIERARCHY_VIOLATION,
        `The bot cannot ${actionLabel} itself.`
      );
    }

    if (guild.ownerId === me.id) {
      return true;
    }

    const botHighestPosition = me.roles?.highest?.position ?? 0;
    const targetHighestPosition = targetMember.roles?.highest?.position ?? 0;

    if (targetId !== me.id && targetHighestPosition >= botHighestPosition) {
      throw new AppError(
        ERROR_CODES.ROLE_HIERARCHY_VIOLATION,
        `Role hierarchy violation: cannot ${actionLabel} member "${targetMember.user?.tag || targetId}" because their highest role (position ${targetHighestPosition}) is at or above the bot's highest role (position ${botHighestPosition}).`,
        {
          guildId: guild.id,
          targetUserId: targetId,
          targetHighestRolePosition: targetHighestPosition,
          botHighestRolePosition: botHighestPosition
        }
      );
    }

    return true;
  }

  compareRoles(roleA, roleB) {
    const permsA = new Set(roleA.permissions?.toArray ? roleA.permissions.toArray() : []);
    const permsB = new Set(roleB.permissions?.toArray ? roleB.permissions.toArray() : []);

    const onlyInA = [...permsA].filter((perm) => !permsB.has(perm));
    const onlyInB = [...permsB].filter((perm) => !permsA.has(perm));
    const shared = [...permsA].filter((perm) => permsB.has(perm));

    return {
      roleA: {
        id: roleA.id,
        name: roleA.name,
        position: roleA.position,
        permissionsCount: permsA.size
      },
      roleB: {
        id: roleB.id,
        name: roleB.name,
        position: roleB.position,
        permissionsCount: permsB.size
      },
      positionComparison:
        roleA.position > roleB.position
          ? `${roleA.name} is higher than ${roleB.name}`
          : roleA.position < roleB.position
            ? `${roleB.name} is higher than ${roleA.name}`
            : 'Both roles have the same position',
      onlyInRoleA: onlyInA,
      onlyInRoleB: onlyInB,
      sharedPermissions: shared
    };
  }

  getBotPermissionReport(guild, channel = null) {
    const me = this.getBotMember(guild);
    const guildPermissions = me.permissions?.toArray ? me.permissions.toArray() : [];
    const isAdmin = Boolean(me.permissions?.has(PermissionFlagsBits.Administrator));

    const missingHighRisk = VALID_PERMISSION_NAMES.filter(
      (name) => !me.permissions?.has(PermissionFlagsBits[name])
    );

    let channelReport = null;
    if (channel) {
      const channelPerms =
        typeof channel.permissionsFor === 'function'
          ? channel.permissionsFor(me)?.toArray() ?? []
          : guildPermissions;
      channelReport = {
        channelId: channel.id,
        channelName: channel.name ?? null,
        effectivePermissions: channelPerms
      };
    }

    return {
      guildId: guild.id,
      guildName: guild.name,
      botUserId: me.id,
      isAdministrator: isAdmin,
      highestRole: me.roles?.highest
        ? {
            id: me.roles.highest.id,
            name: me.roles.highest.name,
            position: me.roles.highest.position
          }
        : null,
      grantedPermissions: guildPermissions,
      missingPermissions: missingHighRisk,
      channelPermissions: channelReport
    };
  }

  getBotHierarchyReport(guild) {
    const me = this.getBotMember(guild);
    const botHighest = me.roles?.highest;
    const botPosition = botHighest?.position ?? 0;

    const allRoles = guild.roles?.cache
      ? Array.from(guild.roles.cache.values()).sort((a, b) => b.position - a.position)
      : [];

    const rolesAboveBot = allRoles
      .filter((role) => role.position >= botPosition && role.id !== botHighest?.id)
      .map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        managed: Boolean(role.managed)
      }));

    const manageableRoles = allRoles
      .filter((role) => role.position < botPosition && role.id !== guild.id && !role.managed)
      .map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position
      }));

    return {
      guildId: guild.id,
      guildName: guild.name,
      botHighestRole: botHighest
        ? {
            id: botHighest.id,
            name: botHighest.name,
            position: botHighest.position
          }
        : null,
      totalRoles: allRoles.length,
      rolesAboveOrEqualBotCount: rolesAboveBot.length,
      manageableRolesCount: manageableRoles.length,
      rolesAboveOrEqualBot: rolesAboveBot,
      manageableRoles
    };
  }
}

