import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { adminService } from '../services/adminService';

export const getAllPendingCompanies = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const companies = await adminService.getPendingCompanies();
    res.status(200).json({ success: true, data: companies });
  }
);

export const verifyCompany = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { status, reason, validateCNPJ = true } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status provided' });
  }

  try {
    const user = await adminService.verifyCompany(userId, status, reason, validateCNPJ);
    res.status(200).json({
      success: true,
      data: user,
      message: `Company ${status} successfully${reason ? ` - ${reason}` : ''}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify company';
    const status500 = message.includes('CNPJ validation failed')
      ? 400
      : message.includes('not found')
        ? 404
        : 500;
    res.status(status500).json({ success: false, error: message });
  }
});

export const getAllProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const products = await adminService.getAllProducts();
  res.status(200).json({ success: true, data: products });
});

export const moderateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { productId } = req.params;
  const { action } = req.body;

  if (!action || !['approve', 'reject', 'remove'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid action provided' });
  }

  try {
    const product = await adminService.moderateProduct(productId, action);
    if (product === null) {
      return res.status(200).json({ success: true, message: 'Product removed successfully' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to moderate product';
    const httpStatus = message.includes('not found') ? 404 : 400;
    res.status(httpStatus).json({ success: false, error: message });
  }
});

export const getTransactionMonitoring = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { startDate, endDate, status } = req.query;
    const data = await adminService.getTransactionMonitoring({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      status: status as string | undefined,
    });
    res.status(200).json({ success: true, data });
  }
);

export const getCompanyDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const company = await adminService.getCompanyDetails(req.params.userId);
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get company details';
    const httpStatus = message.includes('not found') ? 404 : 400;
    res.status(httpStatus).json({ success: false, error: message });
  }
});

export const updateCompanyStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status provided' });
    }

    try {
      const company = await adminService.updateCompanyStatus(userId, status);
      res.status(200).json({
        success: true,
        data: company,
        message: `Company status updated to ${status}${reason ? ` - ${reason}` : ''}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update company status';
      const httpStatus = message.includes('not found') ? 404 : 400;
      res.status(httpStatus).json({ success: false, error: message });
    }
  }
);

export const validateSupplierCNPJ = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { user, cnpjValidation } = await adminService.validateSupplierCNPJ(req.params.userId);
      res.status(200).json({ success: true, data: { user, cnpjValidation } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to validate CNPJ';
      const httpStatus = message.includes('not found')
        ? 404
        : message.includes('no CNPJ')
          ? 400
          : 500;
      res.status(httpStatus).json({ success: false, error: message });
    }
  }
);

export const getSupplierMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await adminService.getSupplierMetrics(req.params.userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get supplier metrics';
    const httpStatus = message === 'Supplier not found' ? 404 : 500;
    res.status(httpStatus).json({ success: false, error: message });
  }
});

export const getVerificationQueue = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 10, filter = 'all' } = req.query;
    const data = await adminService.getVerificationQueue(
      Number(page),
      Number(limit),
      filter as string
    );
    res.status(200).json({ success: true, data });
  }
);

export const getDashboardAnalytics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const data = await adminService.getDashboardAnalytics();
    res.status(200).json({ success: true, data });
  }
);
