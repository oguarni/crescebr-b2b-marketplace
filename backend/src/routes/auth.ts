import { Router } from 'express';
import {
  register,
  login,
  loginWithEmail,
  getProfile,
  registerSupplier,
  refreshToken,
  logout,
  logoutAllDevices,
  getActiveSessions,
} from '../controllers/authController';
import {
  registerValidation,
  loginValidation,
  loginEmailValidation,
  supplierRegisterValidation,
  refreshTokenValidation,
} from '../validators/auth.validators';
import { handleValidationErrors } from '../middleware/handleValidationErrors';
import { authenticateJWT } from '../middleware/auth';
import { authRateLimit, generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// POST /auth/register
router.post('/register', authRateLimit, registerValidation, handleValidationErrors, register);

// POST /auth/register-supplier
router.post(
  '/register-supplier',
  authRateLimit,
  supplierRegisterValidation,
  handleValidationErrors,
  registerSupplier
);

// POST /auth/login (CNPJ-based)
router.post('/login', authRateLimit, loginValidation, handleValidationErrors, login);

// POST /auth/login-email (Email-based for backward compatibility)
router.post(
  '/login-email',
  authRateLimit,
  loginEmailValidation,
  handleValidationErrors,
  loginWithEmail
);

// GET /auth/me
router.get('/me', authenticateJWT, getProfile);

// POST /auth/refresh
router.post(
  '/refresh',
  authRateLimit,
  refreshTokenValidation,
  handleValidationErrors,
  refreshToken
);

// POST /auth/logout
router.post('/logout', authRateLimit, logout);

// POST /auth/logout-all
router.post('/logout-all', authenticateJWT, generalRateLimit, logoutAllDevices);

// GET /auth/sessions
router.get('/sessions', authenticateJWT, getActiveSessions);

export default router;
