import { Permission, PERMISSIONS, DEFAULT_PERMISSIONS } from "../drizzle/schema";

// Role hierarchy - higher roles inherit permissions from lower roles
const ROLE_HIERARCHY: Record<string, string[]> = {
  viewer: [],
  user: ['viewer'],
  manager: ['user', 'viewer'],
  admin: ['manager', 'user', 'viewer'],
};

// Role-specific permissions (in addition to inherited)
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  viewer: ['hlr.history'],
  user: ['hlr.single', 'hlr.batch', 'hlr.export', 'tools.duplicates'],
  manager: ['admin.users'],
  admin: ['admin.audit', 'admin.settings'],
};

/**
 * Get all permissions for a role (including inherited)
 */
export function getRolePermissions(role: string): Permission[] {
  const permissions = new Set<Permission>();
  
  // Add own permissions
  const ownPerms = ROLE_PERMISSIONS[role] || [];
  ownPerms.forEach(p => permissions.add(p));
  
  // Add inherited permissions
  const inherited = ROLE_HIERARCHY[role] || [];
  for (const inheritedRole of inherited) {
    const inheritedPerms = ROLE_PERMISSIONS[inheritedRole] || [];
    inheritedPerms.forEach(p => permissions.add(p));
  }
  
  return Array.from(permissions);
}

/**
 * Get effective permissions for a user
 * Custom permissions override role defaults if set
 */
export function getUserPermissions(user: { role: string; customPermissions?: string | null }): Permission[] {
  // If custom permissions are set, use them
  if (user.customPermissions) {
    try {
      const custom = JSON.parse(user.customPermissions) as string[];
      return custom.filter(p => PERMISSIONS.includes(p as Permission)) as Permission[];
    } catch {
      // Fall back to role permissions if JSON is invalid
    }
  }
  
  // Use role-based permissions
  return getRolePermissions(user.role);
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  user: { role: string; customPermissions?: string | null },
  permission: Permission
): boolean {
  const permissions = getUserPermissions(user);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: { role: string; customPermissions?: string | null },
  permissions: Permission[]
): boolean {
  const userPerms = getUserPermissions(user);
  return permissions.some(p => userPerms.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: { role: string; customPermissions?: string | null },
  permissions: Permission[]
): boolean {
  const userPerms = getUserPermissions(user);
  return permissions.every(p => userPerms.includes(p));
}

/**
 * Get all available permissions with descriptions
 */
export function getPermissionDescriptions(): Array<{ id: Permission; name: string; description: string; category: string }> {
  return [
    { id: 'hlr.single', name: 'Single Check', description: 'Perform single HLR checks', category: 'HLR' },
    { id: 'hlr.batch', name: 'Batch Check', description: 'Perform batch HLR checks', category: 'HLR' },
    { id: 'hlr.export', name: 'Export Results', description: 'Export check results to CSV/Excel', category: 'HLR' },
    { id: 'hlr.history', name: 'View History', description: 'View check history', category: 'HLR' },
    { id: 'tools.duplicates', name: 'Duplicate Tool', description: 'Use duplicate removal tool', category: 'Tools' },
    { id: 'admin.users', name: 'Manage Users', description: 'Create, edit, delete users', category: 'Admin' },
    { id: 'admin.audit', name: 'View Audit', description: 'View audit logs', category: 'Admin' },
    { id: 'admin.settings', name: 'Settings', description: 'Change system settings', category: 'Admin' },
  ];
}

/**
 * Get all available roles with descriptions
 */
export function getRoleDescriptions(): Array<{ id: string; name: string; description: string; permissions: Permission[] }> {
  return [
    { 
      id: 'viewer', 
      name: 'Viewer', 
      description: 'Can only view check history', 
      permissions: getRolePermissions('viewer') 
    },
    { 
      id: 'user', 
      name: 'User', 
      description: 'Standard user with full HLR access', 
      permissions: getRolePermissions('user') 
    },
    { 
      id: 'manager', 
      name: 'Manager', 
      description: 'Can manage users in addition to user permissions', 
      permissions: getRolePermissions('manager') 
    },
    { 
      id: 'admin', 
      name: 'Admin', 
      description: 'Full access to all features', 
      permissions: getRolePermissions('admin') 
    },
  ];
}
