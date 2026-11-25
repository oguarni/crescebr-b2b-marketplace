import { Router } from 'express';
import authRoutes from './auth';
import productsRoutes from './products';
import quotationsRoutes from './quotations';
import adminRoutes from './admin';
import orderRoutes from './orders';
import ratingsRoutes from './ratings';
import settingsRoutes from './settings';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/quotations', quotationsRoutes);
router.use('/admin', adminRoutes);
router.use('/orders', orderRoutes);
router.use('/ratings', ratingsRoutes);
router.use('/settings', settingsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CresceBR API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
