/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import { parseHexColor } from '../../security/validation.js';
import { formatRole, formatMember } from '../../utils/formatters.js';

export class RoleManager {
  constructor({ discordClientManager, permissionService } = {}) {
    this.discordClientManager = discordClientManager;
    this.permissionService = permissionService;
  }

  async createRole({
    guildId,
    name,
    color = undefined,
    hoist = false,
    mentionable = false,
    permissions = [],
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageRoles']);

    const { bitField } = this.permissionService.resolvePermissionBitField(permissions);
    this.permissionService.ensureNoPrivilegeEscalation(guild, permissions);

    const createPayload = {
      name,
      hoist,
      mentionable,
      permissions: bitField,
      reason
    };

    if (color !== undefined) {
      createPayload.color = parseHexColor(color);
    }

    const role = await guild.roles.create(createPayload);
    return formatRole(role);
  }

  async deleteRole({ guildId, roleId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageRoles']);

    const role = await this.discordClientManager.getRoleOrThrow(guild, roleId);
    this.permissionService.ensureRoleManageable(guild, role);

    const snapshot = formatRole(role);
    await role.delete(reason);

    return {
      deleted: true,
      role: snapshot
    };
  }

  async editRole({
    guildId,
    roleId,
    name,
    color,
    hoist,
    mentionable,
    permissions,
    position,
    reason = undefined
  }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageRoles']);

    const role = await this.discordClientManager.getRoleOrThrow(guild, roleId);
    this.permissionService.ensureRoleManageable(guild, role, {
      allowEveryone: role.id === guild.id && position === undefined && name === undefined
    });

    const editPayload = { reason };
    if (name !== undefined) {
      editPayload.name = name;
    }
    if (color !== undefined) {
      editPayload.color = parseHexColor(color);
    }
    if (hoist !== undefined) {
      editPayload.hoist = hoist;
    }
    if (mentionable !== undefined) {
      editPayload.mentionable = mentionable;
    }
    if (permissions !== undefined) {
      this.permissionService.ensureNoPrivilegeEscalation(guild, permissions);
      editPayload.permissions = this.permissionService.resolvePermissionBitField(permissions).bitField;
    }
    if (position !== undefined) {
      this.permissionService.ensurePositionBelowBot(guild, position);
      editPayload.position = position;
    }

    const updated = await role.edit(editPayload);
    return formatRole(updated);
  }

  async getRoleInfo({ guildId, roleId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const role = await this.discordClientManager.getRoleOrThrow(guild, roleId);
    return formatRole(role);
  }

  async listRoles(guildId) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const roles = guild.roles?.cache
      ? Array.from(guild.roles.cache.values())
          .sort((a, b) => b.position - a.position)
          .map((role) => formatRole(role))
      : [];

    return {
      guildId: guild.id,
      count: roles.length,
      roles
    };
  }

  async assignRole({ guildId, userId, roleId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageRoles']);

    const role = await this.discordClientManager.getRoleOrThrow(guild, roleId);
    this.permissionService.ensureRoleManageable(guild, role);

    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    await member.roles.add(role, reason);

    return {
      assigned: true,
      guildId: guild.id,
      userId: member.id,
      role: formatRole(role)
    };
  }

  async removeRole({ guildId, userId, roleId, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageRoles']);

    const role = await this.discordClientManager.getRoleOrThrow(guild, roleId);
    this.permissionService.ensureRoleManageable(guild, role);

    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    await member.roles.remove(role, reason);

    return {
      removed: true,
      guildId: guild.id,
      userId: member.id,
      role: formatRole(role)
    };
  }

  async getMemberRoles({ guildId, userId }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const member = await this.discordClientManager.getMemberOrThrow(guild, userId);
    const roles = member.roles?.cache
      ? Array.from(member.roles.cache.values())
          .sort((a, b) => b.position - a.position)
          .map((role) => formatRole(role))
      : [];

    return {
      guildId: guild.id,
      userId: member.id,
      highestRole: member.roles?.highest ? formatRole(member.roles.highest) : null,
      count: roles.length,
      roles
    };
  }

  async setRolePermissions({ guildId, roleId, permissions, reason = undefined }) {
    return this.editRole({
      guildId,
      roleId,
      permissions,
      reason
    });
  }

  async compareRolePermissions({ guildId, roleIdA, roleIdB }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const roleA = await this.discordClientManager.getRoleOrThrow(guild, roleIdA);
    const roleB = await this.discordClientManager.getRoleOrThrow(guild, roleIdB);

    return this.permissionService.compareRoles(roleA, roleB);
  }

  async setRolePosition({ guildId, roleId, position, reason = undefined }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    this.permissionService.ensureBotGuildPermissions(guild, ['ManageRoles']);

    const role = await this.discordClientManager.getRoleOrThrow(guild, roleId);
    this.permissionService.ensureRoleManageable(guild, role);
    this.permissionService.ensurePositionBelowBot(guild, position);

    const updated =
      typeof role.setPosition === 'function'
        ? await role.setPosition(position, { reason })
        : await role.edit({ position, reason });

    return formatRole(updated);
  }

  async setRoleColor({ guildId, roleId, color, reason = undefined }) {
    return this.editRole({ guildId, roleId, color, reason });
  }

  async setRoleHoist({ guildId, roleId, hoist, reason = undefined }) {
    return this.editRole({ guildId, roleId, hoist, reason });
  }

  async setRoleMentionable({ guildId, roleId, mentionable, reason = undefined }) {
    return this.editRole({ guildId, roleId, mentionable, reason });
  }

  async getRoleMembers({ guildId, roleId, limit = 100 }) {
    const guild = await this.discordClientManager.getGuildOrThrow(guildId);
    const role = await this.discordClientManager.getRoleOrThrow(guild, roleId);
    const clampedLimit = Math.min(500, Math.max(1, Number(limit) || 100));

    const members = role.members
      ? Array.from(role.members.values())
          .slice(0, clampedLimit)
          .map((member) => formatMember(member))
      : [];

    return {
      guildId: guild.id,
      role: formatRole(role),
      count: members.length,
      members
    };
  }
}

