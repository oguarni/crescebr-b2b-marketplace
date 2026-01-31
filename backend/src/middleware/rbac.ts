import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

// Define specific permissions for different actions
export enum Permission {
  // User management
  MANAGE_USERS = 'manage_users',
  VIEW_USERS = 'view_users',
  APPROVE_SUPPLIERS = 'approve_suppliers',

  // Product management
  MANAGE_ALL_PRODUCTS = 'manage_all_products',
  MANAGE_OWN_PRODUCTS = 'manage_own_products',
  VIEW_PRODUCTS = 'view_products',

  // Order management
  MANAGE_ALL_ORDERS = 'manage_all_orders',
  MANAGE_RELATED_ORDERS = 'manage_related_orders',
  VIEW_OWN_ORDERS = 'view_own_orders',
  UPDATE_ORDER_STATUS = 'update_order_status',

  // Quotation management
  MANAGE_ALL_QUOTATIONS = 'manage_all_quotations',
  CREATE_QUOTATIONS = 'create_quotations',
  VIEW_OWN_QUOTATIONS = 'view_own_quotations',
  PROCESS_QUOTATIONS = 'process_quotations',

  // Admin panel access
  ACCESS_ADMIN_PANEL = 'access_admin_panel',
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_DATA = 'export_data',

  // System configuration
  MANAGE_SYSTEM_CONFIG = 'manage_system_config',
  MANAGE_COMPANY_VERIFICATION = 'manage_company_verification',
}

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.APPROVE_SUPPLIERS,
    Permission.MANAGE_ALL_PRODUCTS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_ALL_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
    Permission.MANAGE_ALL_QUOTATIONS,
    Permission.PROCESS_QUOTATIONS,
    Permission.ACCESS_ADMIN_PANEL,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
    Permission.MANAGE_SYSTEM_CONFIG,
    Permission.MANAGE_COMPANY_VERIFICATION,
  ],
  supplier: [
    Permission.MANAGE_OWN_PRODUCTS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_RELATED_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_OWN_QUOTATIONS,
  ],
  customer: [
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_OWN_ORDERS,
    Permission.CREATE_QUOTATIONS,
    Permission.VIEW_OWN_QUOTATIONS,
  ],
};

// Status-based permission modifiers for suppliers
const SUPPLIER_STATUS_PERMISSIONS: Record<string, Permission[]> = {
  approved: [
    Permission.MANAGE_OWN_PRODUCTS,
    Permission.MANAGE_RELATED_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
  ],
  pending: [],
  rejected: [],
};

export class RBACService {
  static getUserPermissions(role: string, status?: string): Permission[] {
    const basePermissions = ROLE_PERMISSIONS[role] || [];

    // Add status-specific permissions for suppliers
    if (role === 'supplier' && status) {
      const statusPermissions = SUPPLIER_STATUS_PERMISSIONS[status] || [];
      return [...basePermissions, ...statusPermissions];
    }

    return basePermissions;
  }

  static hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
  }

  static hasAnyPermission(
    userPermissions: Permission[],
    requiredPermissions: Permission[]
  ): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  static hasAllPermissions(
    userPermissions: Permission[],
    requiredPermissions: Permission[]
  ): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}

// Middleware factory for permission-based access control
export const requirePermission = (permission: Permission) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    try {
      // Get user's full details for status check
      const User = (await import('../models/User')).default;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const userPermissions = RBACService.getUserPermissions(user.role, user.status);

      if (!RBACService.hasPermission(userPermissions, permission)) {
        res.status(403).json({
          success: false,
          error: `Access denied. Required permission: ${permission}`,
          userRole: user.role,
          userStatus: user.status,
        });
        return;
      }

      // Add permissions to request for further use
      (req as any).userPermissions = userPermissions;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify permissions',
      });
    }
  };
};

// Middleware for requiring any of multiple permissions
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    try {
      const User = (await import('../models/User')).default;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const userPermissions = RBACService.getUserPermissions(user.role, user.status);

      if (!RBACService.hasAnyPermission(userPermissions, permissions)) {
        res.status(403).json({
          success: false,
          error: `Access denied. Required permissions: ${permissions.join(' OR ')}`,
          userRole: user.role,
          userStatus: user.status,
        });
        return;
      }

      (req as any).userPermissions = userPermissions;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify permissions',
      });
    }
  };
};

// Middleware for requiring all of multiple permissions
export const requireAllPermissions = (permissions: Permission[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    try {
      const User = (await import('../models/User')).default;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const userPermissions = RBACService.getUserPermissions(user.role, user.status);

      if (!RBACService.hasAllPermissions(userPermissions, permissions)) {
        res.status(403).json({
          success: false,
          error: `Access denied. Required permissions: ${permissions.join(' AND ')}`,
          userRole: user.role,
          userStatus: user.status,
        });
        return;
      }

      (req as any).userPermissions = userPermissions;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify permissions',
      });
    }
  };
};

// Simple role-based middleware for routes
export const requireRole = (...allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
};

// Helper function to check permissions in controllers
export const checkPermission = async (userId: number, permission: Permission): Promise<boolean> => {
  try {
    const User = (await import('../models/User')).default;
    const user = await User.findByPk(userId);

    if (!user) {
      return false;
    }

    const userPermissions = RBACService.getUserPermissions(user.role, user.status);
    return RBACService.hasPermission(userPermissions, permission);
  } catch (error) {
    return false;
  }
};

// Middleware to add user permissions to response (for frontend use)
export const addPermissionsToResponse = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user) {
    try {
      const User = (await import('../models/User')).default;
      const user = await User.findByPk(req.user.id);

      if (user) {
        const userPermissions = RBACService.getUserPermissions(user.role, user.status);
        (req as any).userPermissions = userPermissions;

        // Add to response headers for client-side use
        res.setHeader('X-User-Permissions', JSON.stringify(userPermissions));
      }
    } catch (error) {
      console.error('Error adding permissions to response:', error);
    }
  }

  next();
};
