import { Router } from 'express';
import { getPricingPolicy } from '../controllers/settingsController';
import { generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Public on purpose: see getPricingPolicy. Editing lives under /admin/settings.
router.get('/pricing', generalRateLimit, getPricingPolicy);

export default router;
