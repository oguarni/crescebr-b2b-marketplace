import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { AuthTokenPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token is required',
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const isApprovedSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'supplier') {
    res.status(403).json({
      success: false,
      error: 'Supplier access required',
    });
    return;
  }

  try {
    const User = (await import('../models/User')).default;
    const user = await User.findByPk(req.user.id);

    if (!user || user.status !== 'approved') {
      res.status(403).json({
        success: false,
        error: 'Approved supplier status required',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify supplier status',
    });
  }
};

export const isResourceOwner = (resourceUserIdField: string = 'companyId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        error: 'Resource user ID not provided',
      });
      return;
    }

    // Admin can access any resource, users can only access their own
    if (req.user.role === 'admin' || req.user.id === parseInt(resourceUserId)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.',
      });
    }
  };
};

export const canModifyProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  // Admin can modify any product
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // Suppliers can only modify their own products
  if (req.user.role === 'supplier') {
    try {
      const Product = (await import('../models/Product')).default;
      const productId = req.params.productId || req.params.id;

      if (!productId) {
        res.status(400).json({
          success: false,
          error: 'Product ID not provided',
        });
        return;
      }

      const product = await Product.findByPk(productId);

      if (!product) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
        return;
      }

      if (product.supplierId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: 'You can only modify your own products',
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify product ownership',
      });
    }
    return;
  }

  res.status(403).json({
    success: false,
    error: 'Insufficient permissions to modify products',
  });
};

export const canAccessOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  // Admin can access any order
  if (req.user.role === 'admin') {
    next();
    return;
  }

  try {
    const Order = (await import('../models/Order')).default;
    const orderId = req.params.orderId || req.params.id;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: 'Order ID not provided',
      });
      return;
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: (await import('../models/Quotation')).default,
          as: 'quotation',
          include: [
            {
              model: (await import('../models/QuotationItem')).default,
              as: 'items',
              include: [
                {
                  model: (await import('../models/Product')).default,
                  as: 'product',
                },
              ],
            },
          ],
        },
      ],
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    // Customer can access their own orders
    if (req.user.role === 'customer' && order.companyId === req.user.id) {
      next();
      return;
    }

    // Supplier can access orders for their products
    if (req.user.role === 'supplier') {
      const quotation = (order as any).quotation;
      if (quotation && quotation.items) {
        const hasSupplierProduct = quotation.items.some(
          (item: any) => item.product && item.product.supplierId === req.user!.id
        );

        if (hasSupplierProduct) {
          next();
          return;
        }
      }
    }

    res.status(403).json({
      success: false,
      error: 'Access denied to this order',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify order access',
    });
  }
};
