import { requireRole, RBACService, Permission } from '../rbac';
import { AuthenticatedRequest } from '../auth';
import { Response, NextFunction } from 'express';

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

describe('requireRole middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next when user has required role', async () => {
    const req = { user: { id: 1, role: 'admin', email: 'admin@test.com' } } as AuthenticatedRequest;
    const res = mockResponse();

    await requireRole('admin')(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user role is not allowed', async () => {
    const req = {
      user: { id: 1, role: 'customer', email: 'user@test.com' },
    } as AuthenticatedRequest;
    const res = mockResponse();

    await requireRole('admin')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', async () => {
    const req = {} as AuthenticatedRequest;
    const res = mockResponse();

    await requireRole('admin')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should accept multiple allowed roles', async () => {
    const req = {
      user: { id: 1, role: 'supplier', email: 'supplier@test.com' },
    } as AuthenticatedRequest;
    const res = mockResponse();

    await requireRole('admin', 'supplier')(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('RBACService', () => {
  it('should return correct permissions for admin role', () => {
    const permissions = RBACService.getUserPermissions('admin');
    expect(permissions).toContain(Permission.MANAGE_USERS);
    expect(permissions).toContain(Permission.ACCESS_ADMIN_PANEL);
    expect(permissions).toContain(Permission.MANAGE_ALL_PRODUCTS);
  });

  it('should return correct permissions for supplier role', () => {
    const permissions = RBACService.getUserPermissions('supplier');
    expect(permissions).toContain(Permission.VIEW_PRODUCTS);
    expect(permissions).not.toContain(Permission.MANAGE_USERS);
    expect(permissions).not.toContain(Permission.ACCESS_ADMIN_PANEL);
  });

  it('should return correct permissions for customer role', () => {
    const permissions = RBACService.getUserPermissions('customer');
    expect(permissions).toContain(Permission.CREATE_QUOTATIONS);
    expect(permissions).toContain(Permission.VIEW_PRODUCTS);
    expect(permissions).not.toContain(Permission.MANAGE_USERS);
  });

  it('should return empty array for unknown role', () => {
    const permissions = RBACService.getUserPermissions('unknown');
    expect(permissions).toEqual([]);
  });

  it('should correctly check single permission', () => {
    const permissions = [Permission.MANAGE_USERS, Permission.VIEW_PRODUCTS];
    expect(RBACService.hasPermission(permissions, Permission.MANAGE_USERS)).toBe(true);
    expect(RBACService.hasPermission(permissions, Permission.ACCESS_ADMIN_PANEL)).toBe(false);
  });

  it('should correctly check any permission', () => {
    const permissions = [Permission.MANAGE_USERS];
    expect(
      RBACService.hasAnyPermission(permissions, [
        Permission.MANAGE_USERS,
        Permission.ACCESS_ADMIN_PANEL,
      ])
    ).toBe(true);
    expect(RBACService.hasAnyPermission(permissions, [Permission.ACCESS_ADMIN_PANEL])).toBe(false);
  });

  it('should correctly check all permissions', () => {
    const permissions = [Permission.MANAGE_USERS, Permission.VIEW_PRODUCTS];
    expect(
      RBACService.hasAllPermissions(permissions, [
        Permission.MANAGE_USERS,
        Permission.VIEW_PRODUCTS,
      ])
    ).toBe(true);
    expect(
      RBACService.hasAllPermissions(permissions, [
        Permission.MANAGE_USERS,
        Permission.ACCESS_ADMIN_PANEL,
      ])
    ).toBe(false);
  });
});
