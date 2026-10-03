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
  const userId = req.params.userId as string;
  const { status, reason, validateCNPJ = true } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status provided' });
  }

  const user = await adminService.verifyCompany(userId, status, reason, validateCNPJ);
  res.status(200).json({
    success: true,
    data: user,
    message: `Company ${status} successfully${reason ? ` - ${reason}` : ''}`,
  });
});

export const getAllProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const products = await adminService.getAllProducts();
  res.status(200).json({ success: true, data: products });
});

export const moderateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const productId = req.params.productId as string;
  const { action } = req.body;

  if (!action || !['approve', 'reject', 'remove'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid action provided' });
  }

  const product = await adminService.moderateProduct(productId, action);
  if (product === null) {
    return res.status(200).json({ success: true, message: 'Product removed successfully' });
  }
  res.status(200).json({ success: true, data: product });
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
  const company = await adminService.getCompanyDetails(req.params.userId as string);
  res.status(200).json({ success: true, data: company });
});

export const updateCompanyStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.userId as string;
    const { status, reason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status provided' });
    }

    const company = await adminService.updateCompanyStatus(userId, status);
    res.status(200).json({
      success: true,
      data: company,
      message: `Company status updated to ${status}${reason ? ` - ${reason}` : ''}`,
    });
  }
);

export const validateSupplierCNPJ = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { user, cnpjValidation } = await adminService.validateSupplierCNPJ(
      req.params.userId as string
    );
    res.status(200).json({ success: true, data: { user, cnpjValidation } });
  }
);

export const getSupplierMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await adminService.getSupplierMetrics(req.params.userId as string);
  res.status(200).json({ success: true, data });
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
