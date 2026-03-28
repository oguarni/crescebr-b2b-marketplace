import { Response, NextFunction } from 'express';
import {
  Permission,
  RBACService,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  checkPermission,
  addPermissionsToResponse,
} from '../rbac';
import { AuthenticatedRequest } from '../auth';

// Mock the User model for dynamic import used inside async middleware.
// The __esModule flag is required so that (await import(...)).default resolves correctly.
const mockFindByPk = jest.fn();

jest.mock('../../models/User', () => ({
  __esModule: true,
  default: {
    findByPk: mockFindByPk,
  },
}));

describe('RBAC Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  // ----------------------------------------------------------------
  // Permission Enum
  // ----------------------------------------------------------------
  describe('Permission enum', () => {
    it('should define all 19 permissions', () => {
      const permissionValues = Object.values(Permission);
      expect(permissionValues).toHaveLength(19);
    });

    it('should contain expected user management permissions', () => {
      expect(Permission.MANAGE_USERS).toBe('manage_users');
      expect(Permission.VIEW_USERS).toBe('view_users');
      expect(Permission.APPROVE_SUPPLIERS).toBe('approve_suppliers');
    });

    it('should contain expected product permissions', () => {
      expect(Permission.MANAGE_ALL_PRODUCTS).toBe('manage_all_products');
      expect(Permission.MANAGE_OWN_PRODUCTS).toBe('manage_own_products');
      expect(Permission.VIEW_PRODUCTS).toBe('view_products');
    });

    it('should contain expected order permissions', () => {
      expect(Permission.MANAGE_ALL_ORDERS).toBe('manage_all_orders');
      expect(Permission.MANAGE_RELATED_ORDERS).toBe('manage_related_orders');
      expect(Permission.VIEW_OWN_ORDERS).toBe('view_own_orders');
      expect(Permission.UPDATE_ORDER_STATUS).toBe('update_order_status');
    });

    it('should contain expected quotation permissions', () => {
      expect(Permission.MANAGE_ALL_QUOTATIONS).toBe('manage_all_quotations');
      expect(Permission.CREATE_QUOTATIONS).toBe('create_quotations');
      expect(Permission.VIEW_OWN_QUOTATIONS).toBe('view_own_quotations');
      expect(Permission.PROCESS_QUOTATIONS).toBe('process_quotations');
    });

    it('should contain expected admin and system permissions', () => {
      expect(Permission.ACCESS_ADMIN_PANEL).toBe('access_admin_panel');
      expect(Permission.VIEW_ANALYTICS).toBe('view_analytics');
      expect(Permission.EXPORT_DATA).toBe('export_data');
      expect(Permission.MANAGE_SYSTEM_CONFIG).toBe('manage_system_config');
      expect(Permission.MANAGE_COMPANY_VERIFICATION).toBe('manage_company_verification');
    });
  });

  // ----------------------------------------------------------------
  // RBACService
  // ----------------------------------------------------------------
  describe('RBACService', () => {
    describe('getUserPermissions', () => {
      it('should return all admin permissions for admin role', () => {
        const permissions = RBACService.getUserPermissions('admin');

        expect(permissions).toContain(Permission.MANAGE_USERS);
        expect(permissions).toContain(Permission.VIEW_USERS);
        expect(permissions).toContain(Permission.APPROVE_SUPPLIERS);
        expect(permissions).toContain(Permission.MANAGE_ALL_PRODUCTS);
        expect(permissions).toContain(Permission.VIEW_PRODUCTS);
        expect(permissions).toContain(Permission.MANAGE_ALL_ORDERS);
        expect(permissions).toContain(Permission.UPDATE_ORDER_STATUS);
        expect(permissions).toContain(Permission.MANAGE_ALL_QUOTATIONS);
        expect(permissions).toContain(Permission.PROCESS_QUOTATIONS);
        expect(permissions).toContain(Permission.ACCESS_ADMIN_PANEL);
        expect(permissions).toContain(Permission.VIEW_ANALYTICS);
        expect(permissions).toContain(Permission.EXPORT_DATA);
        expect(permissions).toContain(Permission.MANAGE_SYSTEM_CONFIG);
        expect(permissions).toContain(Permission.MANAGE_COMPANY_VERIFICATION);
        expect(permissions).toHaveLength(14);
      });

      it('should return base supplier permissions without status', () => {
        const permissions = RBACService.getUserPermissions('supplier');

        expect(permissions).toContain(Permission.MANAGE_OWN_PRODUCTS);
        expect(permissions).toContain(Permission.VIEW_PRODUCTS);
        expect(permissions).toContain(Permission.MANAGE_RELATED_ORDERS);
        expect(permissions).toContain(Permission.UPDATE_ORDER_STATUS);
        expect(permissions).toContain(Permission.VIEW_OWN_QUOTATIONS);
        expect(permissions).toHaveLength(5);
      });

      it('should return customer permissions for customer role', () => {
        const permissions = RBACService.getUserPermissions('customer');

        expect(permissions).toContain(Permission.VIEW_PRODUCTS);
        expect(permissions).toContain(Permission.VIEW_OWN_ORDERS);
        expect(permissions).toContain(Permission.CREATE_QUOTATIONS);
        expect(permissions).toContain(Permission.VIEW_OWN_QUOTATIONS);
        expect(permissions).toHaveLength(4);
      });

      it('should add extra permissions for supplier with approved status', () => {
        const permissions = RBACService.getUserPermissions('supplier', 'approved');

        // Base supplier permissions
        expect(permissions).toContain(Permission.MANAGE_OWN_PRODUCTS);
        expect(permissions).toContain(Permission.VIEW_PRODUCTS);
        expect(permissions).toContain(Permission.MANAGE_RELATED_ORDERS);
        expect(permissions).toContain(Permission.UPDATE_ORDER_STATUS);
        expect(permissions).toContain(Permission.VIEW_OWN_QUOTATIONS);

        // Base 5 + approved 3 = 8 total entries
        expect(permissions).toHaveLength(8);
      });

      it('should not add extra permissions for supplier with pending status', () => {
        const permissions = RBACService.getUserPermissions('supplier', 'pending');

        // Base 5 + pending 0 = 5
        expect(permissions).toHaveLength(5);
      });

      it('should not add extra permissions for supplier with rejected status', () => {
        const permissions = RBACService.getUserPermissions('supplier', 'rejected');

        // Base 5 + rejected 0 = 5
        expect(permissions).toHaveLength(5);
      });

      it('should handle supplier with unknown status gracefully', () => {
        const permissions = RBACService.getUserPermissions('supplier', 'unknown_status');

        // SUPPLIER_STATUS_PERMISSIONS['unknown_status'] is undefined, fallback to []
        expect(permissions).toHaveLength(5);
      });

      it('should return empty array for unknown role', () => {
        const permissions = RBACService.getUserPermissions('unknown_role');
        expect(permissions).toEqual([]);
      });

      it('should not add status permissions for non-supplier roles', () => {
        const adminPerms = RBACService.getUserPermissions('admin', 'approved');
        const customerPerms = RBACService.getUserPermissions('customer', 'approved');

        // Status branch only activates for role === 'supplier'
        expect(adminPerms).toHaveLength(14);
        expect(customerPerms).toHaveLength(4);
      });
    });

    describe('hasPermission', () => {
      it('should return true when permission exists in the list', () => {
        const permissions = [Permission.MANAGE_USERS, Permission.VIEW_PRODUCTS];
        expect(RBACService.hasPermission(permissions, Permission.MANAGE_USERS)).toBe(true);
      });

      it('should return false when permission does not exist in the list', () => {
        const permissions = [Permission.MANAGE_USERS, Permission.VIEW_PRODUCTS];
        expect(RBACService.hasPermission(permissions, Permission.ACCESS_ADMIN_PANEL)).toBe(false);
      });

      it('should return false for empty permissions list', () => {
        expect(RBACService.hasPermission([], Permission.MANAGE_USERS)).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true when at least one permission matches', () => {
        const userPermissions = [Permission.MANAGE_USERS];
        const required = [Permission.MANAGE_USERS, Permission.ACCESS_ADMIN_PANEL];

        expect(RBACService.hasAnyPermission(userPermissions, required)).toBe(true);
      });

      it('should return false when no permissions match', () => {
        const userPermissions = [Permission.VIEW_PRODUCTS];
        const required = [Permission.MANAGE_USERS, Permission.ACCESS_ADMIN_PANEL];

        expect(RBACService.hasAnyPermission(userPermissions, required)).toBe(false);
      });

      it('should return true when all required permissions match', () => {
        const userPermissions = [Permission.MANAGE_USERS, Permission.ACCESS_ADMIN_PANEL];
        const required = [Permission.MANAGE_USERS, Permission.ACCESS_ADMIN_PANEL];

        expect(RBACService.hasAnyPermission(userPermissions, required)).toBe(true);
      });

      it('should return false for empty user permissions', () => {
        expect(RBACService.hasAnyPermission([], [Permission.MANAGE_USERS])).toBe(false);
      });

      it('should return false for empty required permissions', () => {
        // Array.some on empty array returns false
        expect(RBACService.hasAnyPermission([Permission.MANAGE_USERS], [])).toBe(false);
      });
    });

    describe('hasAllPermissions', () => {
      it('should return true when all required permissions are present', () => {
        const userPermissions = [
          Permission.MANAGE_USERS,
          Permission.VIEW_PRODUCTS,
          Permission.ACCESS_ADMIN_PANEL,
        ];
        const required = [Permission.MANAGE_USERS, Permission.VIEW_PRODUCTS];

        expect(RBACService.hasAllPermissions(userPermissions, required)).toBe(true);
      });

      it('should return false when one required permission is missing', () => {
        const userPermissions = [Permission.MANAGE_USERS, Permission.VIEW_PRODUCTS];
        const required = [Permission.MANAGE_USERS, Permission.ACCESS_ADMIN_PANEL];

        expect(RBACService.hasAllPermissions(userPermissions, required)).toBe(false);
      });

      it('should return false when all required permissions are missing', () => {
        const userPermissions = [Permission.VIEW_PRODUCTS];
        const required = [Permission.MANAGE_USERS, Permission.ACCESS_ADMIN_PANEL];

        expect(RBACService.hasAllPermissions(userPermissions, required)).toBe(false);
      });

      it('should return true for empty required permissions', () => {
        // Array.every on empty array returns true
        expect(RBACService.hasAllPermissions([Permission.MANAGE_USERS], [])).toBe(true);
      });

      it('should return false for empty user permissions with non-empty required', () => {
        expect(RBACService.hasAllPermissions([], [Permission.MANAGE_USERS])).toBe(false);
      });
    });
  });

  // ----------------------------------------------------------------
  // requirePermission middleware
  // ----------------------------------------------------------------
  describe('requirePermission', () => {
    it('should return 401 when no user on request', async () => {
      const middleware = requirePermission(Permission.MANAGE_USERS);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found in database', async () => {
      mockRequest.user = {
        id: 999,
        email: 'gone@test.com',
        role: 'admin',
        cnpj: '00000000000000',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue(null);

      const middleware = requirePermission(Permission.MANAGE_USERS);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockFindByPk).toHaveBeenCalledWith(999);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has the required permission', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue({ id: 1, role: 'admin', status: 'approved' });

      const middleware = requirePermission(Permission.MANAGE_USERS);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect((mockRequest as any).userPermissions).toBeDefined();
      expect((mockRequest as any).userPermissions).toContain(Permission.MANAGE_USERS);
    });

    it('should return 403 when user lacks the required permission', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@test.com',
        role: 'customer',
        cnpj: '22222222000122',
        companyType: 'buyer',
      };
      mockFindByPk.mockResolvedValue({ id: 2, role: 'customer', status: 'approved' });

      const middleware = requirePermission(Permission.MANAGE_USERS);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: `Access denied. Required permission: ${Permission.MANAGE_USERS}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when database throws an error', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockRejectedValue(new Error('Database connection failed'));

      const middleware = requirePermission(Permission.MANAGE_USERS);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass supplier status to getUserPermissions for correct permission resolution', async () => {
      mockRequest.user = {
        id: 3,
        email: 'supplier@test.com',
        role: 'supplier',
        cnpj: '33333333000133',
        companyType: 'supplier',
      };
      mockFindByPk.mockResolvedValue({ id: 3, role: 'supplier', status: 'approved' });

      const middleware = requirePermission(Permission.MANAGE_OWN_PRODUCTS);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // requireAnyPermission middleware
  // ----------------------------------------------------------------
  describe('requireAnyPermission', () => {
    it('should return 401 when no user on request', async () => {
      const middleware = requireAnyPermission([Permission.MANAGE_USERS, Permission.VIEW_USERS]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found in database', async () => {
      mockRequest.user = {
        id: 999,
        email: 'gone@test.com',
        role: 'admin',
        cnpj: '00000000000000',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue(null);

      const middleware = requireAnyPermission([Permission.MANAGE_USERS]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has at least one of the required permissions', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue({ id: 1, role: 'admin', status: 'approved' });

      const middleware = requireAnyPermission([
        Permission.MANAGE_USERS,
        Permission.CREATE_QUOTATIONS, // admin does not have this
      ]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect((mockRequest as any).userPermissions).toBeDefined();
    });

    it('should return 403 when user has none of the required permissions', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@test.com',
        role: 'customer',
        cnpj: '22222222000122',
        companyType: 'buyer',
      };
      mockFindByPk.mockResolvedValue({ id: 2, role: 'customer', status: 'approved' });

      const requiredPerms = [Permission.MANAGE_USERS, Permission.ACCESS_ADMIN_PANEL];
      const middleware = requireAnyPermission(requiredPerms);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: `Access denied. Required permissions: ${requiredPerms.join(' OR ')}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when database throws an error', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockRejectedValue(new Error('Database timeout'));

      const middleware = requireAnyPermission([Permission.MANAGE_USERS]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // requireAllPermissions middleware
  // ----------------------------------------------------------------
  describe('requireAllPermissions', () => {
    it('should return 401 when no user on request', async () => {
      const middleware = requireAllPermissions([Permission.MANAGE_USERS, Permission.VIEW_USERS]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found in database', async () => {
      mockRequest.user = {
        id: 999,
        email: 'gone@test.com',
        role: 'admin',
        cnpj: '00000000000000',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue(null);

      const middleware = requireAllPermissions([Permission.MANAGE_USERS]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has all required permissions', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue({ id: 1, role: 'admin', status: 'approved' });

      const middleware = requireAllPermissions([
        Permission.MANAGE_USERS,
        Permission.VIEW_USERS,
        Permission.ACCESS_ADMIN_PANEL,
      ]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect((mockRequest as any).userPermissions).toBeDefined();
    });

    it('should return 403 when user is missing one of the required permissions', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@test.com',
        role: 'customer',
        cnpj: '22222222000122',
        companyType: 'buyer',
      };
      mockFindByPk.mockResolvedValue({ id: 2, role: 'customer', status: 'approved' });

      const requiredPerms = [Permission.VIEW_PRODUCTS, Permission.MANAGE_USERS];
      const middleware = requireAllPermissions(requiredPerms);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: `Access denied. Required permissions: ${requiredPerms.join(' AND ')}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when database throws an error', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockRejectedValue(new Error('Connection refused'));

      const middleware = requireAllPermissions([Permission.MANAGE_USERS]);

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // requireRole middleware
  // ----------------------------------------------------------------
  describe('requireRole', () => {
    it('should return 401 when no user on request', async () => {
      const middleware = requireRole('admin');

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user role is in allowed roles', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };

      const middleware = requireRole('admin');

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not in allowed roles', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@test.com',
        role: 'customer',
        cnpj: '22222222000122',
        companyType: 'buyer',
      };

      const middleware = requireRole('admin');

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: admin',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept multiple allowed roles and pass when user has one', async () => {
      mockRequest.user = {
        id: 3,
        email: 'supplier@test.com',
        role: 'supplier',
        cnpj: '33333333000133',
        companyType: 'supplier',
      };

      const middleware = requireRole('admin', 'supplier');

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 with joined role names when multiple roles required', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@test.com',
        role: 'customer',
        cnpj: '22222222000122',
        companyType: 'buyer',
      };

      const middleware = requireRole('admin', 'supplier');

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: admin or supplier',
      });
    });

    it('should work with all three roles allowed', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@test.com',
        role: 'customer',
        cnpj: '22222222000122',
        companyType: 'buyer',
      };

      const middleware = requireRole('admin', 'supplier', 'customer');

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // checkPermission helper
  // ----------------------------------------------------------------
  describe('checkPermission', () => {
    it('should return true when user has the permission', async () => {
      mockFindByPk.mockResolvedValue({ id: 1, role: 'admin', status: 'approved' });

      const result = await checkPermission(1, Permission.MANAGE_USERS);

      expect(result).toBe(true);
      expect(mockFindByPk).toHaveBeenCalledWith(1);
    });

    it('should return false when user does not have the permission', async () => {
      mockFindByPk.mockResolvedValue({ id: 2, role: 'customer', status: 'approved' });

      const result = await checkPermission(2, Permission.MANAGE_USERS);

      expect(result).toBe(false);
    });

    it('should return false when user is not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      const result = await checkPermission(999, Permission.MANAGE_USERS);

      expect(result).toBe(false);
    });

    it('should return false when database throws an error', async () => {
      mockFindByPk.mockRejectedValue(new Error('DB error'));

      const result = await checkPermission(1, Permission.MANAGE_USERS);

      expect(result).toBe(false);
    });

    it('should correctly resolve supplier permissions with status', async () => {
      mockFindByPk.mockResolvedValue({ id: 3, role: 'supplier', status: 'approved' });

      const result = await checkPermission(3, Permission.MANAGE_OWN_PRODUCTS);

      expect(result).toBe(true);
    });

    it('should check customer-specific permissions correctly', async () => {
      mockFindByPk.mockResolvedValue({ id: 4, role: 'customer', status: 'approved' });

      const canCreate = await checkPermission(4, Permission.CREATE_QUOTATIONS);
      expect(canCreate).toBe(true);

      mockFindByPk.mockResolvedValue({ id: 4, role: 'customer', status: 'approved' });

      const canManage = await checkPermission(4, Permission.MANAGE_ALL_PRODUCTS);
      expect(canManage).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // addPermissionsToResponse middleware
  // ----------------------------------------------------------------
  describe('addPermissionsToResponse', () => {
    it('should call next() without adding permissions when no user on request', async () => {
      await addPermissionsToResponse(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockFindByPk).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect((mockRequest as any).userPermissions).toBeUndefined();
    });

    it('should add permissions to request and response header when user is found', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue({ id: 1, role: 'admin', status: 'approved' });

      await addPermissionsToResponse(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      process.env.NODE_ENV = originalEnv;

      expect(mockNext).toHaveBeenCalled();
      expect(mockFindByPk).toHaveBeenCalledWith(1);

      // Permissions added to request
      const reqPermissions = (mockRequest as any).userPermissions;
      expect(reqPermissions).toBeDefined();
      expect(reqPermissions).toContain(Permission.MANAGE_USERS);

      // Permissions set in response header only in development
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-User-Permissions',
        JSON.stringify(reqPermissions)
      );
    });

    it('should call next() without adding permissions when user is not found in DB', async () => {
      mockRequest.user = {
        id: 999,
        email: 'gone@test.com',
        role: 'admin',
        cnpj: '00000000000000',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue(null);

      await addPermissionsToResponse(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect((mockRequest as any).userPermissions).toBeUndefined();
    });

    it('should call next() gracefully when database throws an error', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockRejectedValue(new Error('DB connection lost'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await addPermissionsToResponse(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Should still call next despite error
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();

      // Should log the error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error adding permissions to response:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should resolve supplier permissions correctly with status', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      mockRequest.user = {
        id: 3,
        email: 'supplier@test.com',
        role: 'supplier',
        cnpj: '33333333000133',
        companyType: 'supplier',
      };
      mockFindByPk.mockResolvedValue({ id: 3, role: 'supplier', status: 'approved' });

      await addPermissionsToResponse(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      process.env.NODE_ENV = originalEnv;

      const reqPermissions = (mockRequest as any).userPermissions;
      expect(reqPermissions).toBeDefined();
      expect(reqPermissions).toContain(Permission.MANAGE_OWN_PRODUCTS);
      expect(reqPermissions).toContain(Permission.VIEW_PRODUCTS);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-User-Permissions',
        JSON.stringify(reqPermissions)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not set X-User-Permissions header when NODE_ENV is not development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      mockRequest.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        cnpj: '11111111000111',
        companyType: 'both',
      };
      mockFindByPk.mockResolvedValue({ id: 1, role: 'admin', status: 'approved' });

      await addPermissionsToResponse(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      process.env.NODE_ENV = originalEnv;

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).userPermissions).toBeDefined();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });
  });
});
