import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { Permission, requirePermission, requireRole } from '../middleware/rbac';
import { adminRateLimit } from '../middleware/rateLimiting';
import { handleValidationErrors } from '../middleware/handleValidationErrors';
import {
  verifyCompanyValidation,
  companyIdValidation,
  updateCompanyStatusValidation,
  moderateProductValidation,
  updateSystemSettingsValidation,
  systemSettingsRulesValidation,
} from '../validators/admin.validators';
import {
  getAllPendingCompanies,
  verifyCompany,
  getAllProducts,
  moderateProduct,
  getTransactionMonitoring,
  getCompanyDetails,
  updateCompanyStatus,
  validateSupplierCNPJ,
  getSupplierMetrics,
  getVerificationQueue,
  getDashboardAnalytics,
  getSystemSettings,
  updateSystemSettings,
} from '../controllers/adminController';

const router = Router();

// All admin routes require authentication, admin role, and rate limiting
router.use(authenticateJWT, requireRole('admin'), adminRateLimit);

// Dashboard and analytics
router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: 'Welcome to the admin dashboard' });
});
router.get('/analytics', getDashboardAnalytics);

// Company verification and management
router.get('/companies/pending', getAllPendingCompanies);
router.get('/companies/queue', getVerificationQueue);
router.put(
  '/companies/:userId/verify',
  verifyCompanyValidation,
  handleValidationErrors,
  verifyCompany
);
router.get('/companies/:userId', companyIdValidation, handleValidationErrors, getCompanyDetails);
router.put(
  '/companies/:userId/status',
  updateCompanyStatusValidation,
  handleValidationErrors,
  updateCompanyStatus
);
router.post(
  '/companies/:userId/validate-cnpj',
  companyIdValidation,
  handleValidationErrors,
  validateSupplierCNPJ
);
router.get(
  '/companies/:userId/metrics',
  companyIdValidation,
  handleValidationErrors,
  getSupplierMetrics
);

// Product management
router.get('/products', getAllProducts);
router.put(
  '/products/:productId/moderate',
  moderateProductValidation,
  handleValidationErrors,
  moderateProduct
);

// Transaction monitoring
router.get('/transactions', getTransactionMonitoring);

// System settings: the commercial parameters every quote is priced with.
// Gated by permission rather than role alone, so the capability stays explicit
// if an admin role without it is ever introduced.
const manageSystemConfig = requirePermission(Permission.MANAGE_SYSTEM_CONFIG);
router.get('/settings', manageSystemConfig, getSystemSettings);
router.put(
  '/settings',
  manageSystemConfig,
  updateSystemSettingsValidation,
  handleValidationErrors,
  systemSettingsRulesValidation,
  updateSystemSettings
);

export default router;
