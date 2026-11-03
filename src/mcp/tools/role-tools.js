/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import {
  guildIdSchema,
  roleIdSchema,
  userIdSchema,
  hexColorSchema,
  reasonSchema,
  confirmationFields
} from '../../security/validation.js';

export function registerRoleTools(registry, { roleManager }) {
  registry.register({
    name: 'create_role',
    title: 'Create Role',
    description: 'Create a new role in a Discord guild with hierarchy and privilege-escalation checks.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      name: z.string().trim().min(1).max(100),
      color: hexColorSchema.optional(),
      hoist: z.boolean().optional(),
      mentionable: z.boolean().optional(),
      permissions: z.array(z.string().trim().min(1)).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.createRole(args)
  });

  registry.register({
    name: 'delete_role',
    title: 'Delete Role',
    description: 'Delete a role in a Discord guild (destructive operation requiring confirmation and hierarchy check).',
    category: 'role',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => roleManager.deleteRole(args)
  });

  registry.register({
    name: 'edit_role',
    title: 'Edit Role',
    description: 'Modify a role name, color, hoist, mentionable flag, position, or permissions.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      name: z.string().trim().min(1).max(100).optional(),
      color: hexColorSchema.optional(),
      hoist: z.boolean().optional(),
      mentionable: z.boolean().optional(),
      permissions: z.array(z.string().trim().min(1)).optional(),
      position: z.number().int().min(1).optional(),
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.editRole(args)
  });

  registry.register({
    name: 'get_role_info',
    title: 'Get Role Info',
    description: 'Retrieve detailed configuration and permissions for a specific guild role.',
    category: 'role',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema
    }),
    handler: async (args) => roleManager.getRoleInfo(args)
  });

  registry.register({
    name: 'list_roles',
    title: 'List Roles',
    description: 'List all roles in a guild ordered from highest to lowest position.',
    category: 'role',
    readOnly: true,
    schema: z.object({ guildId: guildIdSchema }),
    handler: async ({ guildId }) => roleManager.listRoles(guildId)
  });

  registry.register({
    name: 'assign_role',
    title: 'Assign Role',
    description: 'Assign a role to a guild member while enforcing role hierarchy.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      roleId: roleIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.assignRole(args)
  });

  registry.register({
    name: 'remove_role',
    title: 'Remove Role',
    description: 'Remove a role from a guild member while enforcing role hierarchy.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema,
      roleId: roleIdSchema,
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.removeRole(args)
  });

  registry.register({
    name: 'get_member_roles',
    title: 'Get Member Roles',
    description: 'List all roles assigned to a specific guild member and their highest role.',
    category: 'role',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      userId: userIdSchema
    }),
    handler: async (args) => roleManager.getMemberRoles(args)
  });

  registry.register({
    name: 'set_role_permissions',
    title: 'Set Role Permissions',
    description: 'Replace the permission set on a guild role (destructive security operation requiring confirmation).',
    category: 'role',
    destructive: true,
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      permissions: z.array(z.string().trim().min(1)),
      reason: reasonSchema,
      ...confirmationFields
    }),
    handler: async (args) => roleManager.setRolePermissions(args)
  });

  registry.register({
    name: 'compare_role_permissions',
    title: 'Compare Role Permissions',
    description: 'Compare hierarchy position and granted permissions between two guild roles.',
    category: 'role',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      roleIdA: roleIdSchema,
      roleIdB: roleIdSchema
    }),
    handler: async (args) => roleManager.compareRolePermissions(args)
  });

  registry.register({
    name: 'set_role_position',
    title: 'Set Role Position',
    description: 'Change a role hierarchy position below the bot highest manageable role.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      position: z.number().int().min(1),
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.setRolePosition(args)
  });

  registry.register({
    name: 'set_role_color',
    title: 'Set Role Color',
    description: 'Set the display color of a guild role using a hex code (#RRGGBB) or integer.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      color: hexColorSchema,
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.setRoleColor(args)
  });

  registry.register({
    name: 'set_role_hoist',
    title: 'Set Role Hoist',
    description: 'Toggle whether members with this role are displayed separately in the member list.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      hoist: z.boolean(),
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.setRoleHoist(args)
  });

  registry.register({
    name: 'set_role_mentionable',
    title: 'Set Role Mentionable',
    description: 'Toggle whether anyone can @mention this role.',
    category: 'role',
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      mentionable: z.boolean(),
      reason: reasonSchema
    }),
    handler: async (args) => roleManager.setRoleMentionable(args)
  });

  registry.register({
    name: 'get_role_members',
    title: 'Get Role Members',
    description: 'List cached guild members who currently hold a specific role.',
    category: 'role',
    readOnly: true,
    schema: z.object({
      guildId: guildIdSchema,
      roleId: roleIdSchema,
      limit: z.number().int().min(1).max(500).optional()
    }),
    handler: async (args) => roleManager.getRoleMembers(args)
  });
}

