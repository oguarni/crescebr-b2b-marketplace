import express from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import { getUserOrders, getAllOrders, getOrderStats } from '../ordersController';
import { getSupplierMetrics } from '../adminController';
import { OrderStatusService } from '../../services/orderStatusService';
import { adminService } from '../../services/adminService';
import { logger } from '../../utils/structuredLogger';

jest.mock('../../services/orderStatusService');
jest.mock('../../services/adminService');
jest.mock('../../utils/structuredLogger', () => ({ logger: { error: jest.fn() } }));

const queries = [
  {
    path: '/orders',
    handler: getUserOrders,
    reject: (error: unknown) =>
      jest.mocked(OrderStatusService.getOrdersByStatus).mockRejectedValueOnce(error),
  },
  {
    path: '/orders/admin/all',
    handler: getAllOrders,
    reject: (error: unknown) =>
      jest.mocked(OrderStatusService.getOrdersByStatus).mockRejectedValueOnce(error),
  },
  {
    path: '/orders/admin/stats',
    handler: getOrderStats,
    reject: (error: unknown) =>
      jest.mocked(OrderStatusService.getOrderStatusStats).mockRejectedValueOnce(error),
  },
  {
    path: '/suppliers/:userId/metrics',
    handler: getSupplierMetrics,
    reject: (error: unknown) =>
      jest.mocked(adminService.getSupplierMetrics).mockRejectedValueOnce(error),
  },
];

for (const query of queries) {
  describe(`query failure boundary: ${query.path}`, () => {
    it.each([
      ['internal database error', new Error('Synthetic SQL detail /private/database/path')],
      ['falsy rejection', null],
      ['Express control-flow string', 'route'],
    ])('returns a generic 500 for %s', async (_label, error) => {
      query.reject(error);
      const app = express();
      app.use((req: AuthenticatedRequest, _res, next) => {
        req.user = {
          id: 1,
          email: 'test@example.com',
          cnpj: '12.345.678/0001-90',
          role: 'admin',
          companyType: 'both',
        };
        next();
      });
      app.get(query.path, query.handler);
      app.use(errorHandler);

      const response = await request(app).get(query.path.replace(':userId', '2')).expect(500);
      expect(response.body).toEqual({ success: false, error: 'Server Error' });
      expect(logger.error).toHaveBeenCalled();
    });
  });
}
