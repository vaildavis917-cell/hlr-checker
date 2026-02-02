import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PERMISSIONS, DEFAULT_PERMISSIONS, PERMISSION_DESCRIPTIONS, Permission } from '../drizzle/schema';

describe('Permissions Schema', () => {
  it('should have all permissions defined', () => {
    expect(PERMISSIONS.length).toBeGreaterThan(0);
    expect(PERMISSIONS).toContain('hlr.single');
    expect(PERMISSIONS).toContain('hlr.batch');
    expect(PERMISSIONS).toContain('hlr.export');
    expect(PERMISSIONS).toContain('hlr.history');
    expect(PERMISSIONS).toContain('hlr.delete');
    expect(PERMISSIONS).toContain('tools.duplicates');
    expect(PERMISSIONS).toContain('admin.users');
    expect(PERMISSIONS).toContain('admin.permissions');
  });

  it('should have descriptions for all permissions', () => {
    for (const permission of PERMISSIONS) {
      const desc = PERMISSION_DESCRIPTIONS[permission];
      expect(desc).toBeDefined();
      expect(desc.en).toBeDefined();
      expect(desc.ru).toBeDefined();
      expect(desc.uk).toBeDefined();
    }
  });

  it('should have default permissions for all roles', () => {
    expect(DEFAULT_PERMISSIONS.viewer).toBeDefined();
    expect(DEFAULT_PERMISSIONS.user).toBeDefined();
    expect(DEFAULT_PERMISSIONS.manager).toBeDefined();
    expect(DEFAULT_PERMISSIONS.admin).toBeDefined();
  });

  it('should have viewer with minimal permissions', () => {
    const viewerPerms = DEFAULT_PERMISSIONS.viewer;
    expect(viewerPerms).toContain('hlr.history');
    expect(viewerPerms).not.toContain('hlr.single');
    expect(viewerPerms).not.toContain('hlr.batch');
  });

  it('should have user with standard HLR permissions', () => {
    const userPerms = DEFAULT_PERMISSIONS.user;
    expect(userPerms).toContain('hlr.single');
    expect(userPerms).toContain('hlr.batch');
    expect(userPerms).toContain('hlr.export');
    expect(userPerms).toContain('hlr.history');
    expect(userPerms).not.toContain('admin.users');
  });

  it('should have manager with extended permissions', () => {
    const managerPerms = DEFAULT_PERMISSIONS.manager;
    expect(managerPerms).toContain('hlr.single');
    expect(managerPerms).toContain('hlr.delete');
    expect(managerPerms).toContain('admin.users');
    expect(managerPerms).toContain('admin.audit');
  });

  it('should have admin with all permissions', () => {
    const adminPerms = DEFAULT_PERMISSIONS.admin;
    expect(adminPerms.length).toBe(PERMISSIONS.length);
    for (const permission of PERMISSIONS) {
      expect(adminPerms).toContain(permission);
    }
  });

  it('should have unique permissions in each role', () => {
    for (const role of Object.keys(DEFAULT_PERMISSIONS)) {
      const perms = DEFAULT_PERMISSIONS[role];
      const uniquePerms = new Set(perms);
      expect(uniquePerms.size).toBe(perms.length);
    }
  });

  it('should have all role permissions be valid Permission types', () => {
    for (const role of Object.keys(DEFAULT_PERMISSIONS)) {
      const perms = DEFAULT_PERMISSIONS[role];
      for (const perm of perms) {
        expect(PERMISSIONS).toContain(perm);
      }
    }
  });
});

describe('Permission Categories', () => {
  it('should have hlr permissions', () => {
    const hlrPerms = PERMISSIONS.filter(p => p.startsWith('hlr.'));
    expect(hlrPerms.length).toBeGreaterThan(0);
  });

  it('should have tools permissions', () => {
    const toolsPerms = PERMISSIONS.filter(p => p.startsWith('tools.'));
    expect(toolsPerms.length).toBeGreaterThan(0);
  });

  it('should have admin permissions', () => {
    const adminPerms = PERMISSIONS.filter(p => p.startsWith('admin.'));
    expect(adminPerms.length).toBeGreaterThan(0);
  });
});
