import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';

jest.mock('../../middleware/auth', () => ({
  authenticateJWT: (req: Request, _res: Response, next: NextFunction) => {
    Object.assign(req, { user: { id: 1, role: 'admin' } });
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../middleware/rateLimiting', () => ({
  generalRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
  quoteRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../controllers/quotationsController', () => {
  const noContent = (_req: Request, res: Response) => res.sendStatus(204);

  return {
    createQuotation: noContent,
    getCustomerQuotations: noContent,
    getSupplierQuotations: noContent,
    getQuotationById: jest.fn(noContent),
    getAllQuotations: noContent,
    updateQuotation: jest.fn((_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    }),
    calculateQuote: noContent,
    getQuotationCalculations: jest.fn(noContent),
    processQuotationWithCalculations: jest.fn(noContent),
    getMultipleSupplierQuotes: noContent,
  };
});

import {
  updateQuotation,
  getQuotationById,
  getQuotationCalculations,
  processQuotationWithCalculations,
} from '../../controllers/quotationsController';
import quotationsRouter from '../quotations';

describe('quotation routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/quotations', quotationsRouter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes admin quotation updates to the update controller', async () => {
    await request(app)
      .put('/quotations/admin/42')
      .send({ status: 'processed', adminNotes: 'Reviewed' })
      .expect(200, { success: true });

    expect(updateQuotation).toHaveBeenCalledTimes(1);
  });

  const idRoutes = [
    { method: 'get', path: '/quotations/:id', status: 204 },
    { method: 'get', path: '/quotations/:id/calculations', status: 204 },
    { method: 'put', path: '/quotations/admin/:id', status: 200 },
    { method: 'put', path: '/quotations/supplier/:id', status: 200 },
    { method: 'post', path: '/quotations/admin/:id/process', status: 204 },
  ] as const;

  for (const route of idRoutes) {
    it.each(['42suffix', '0', '-1', '1.5', '2147483648'])(
      `rejects invalid quotation ID %s on ${route.method.toUpperCase()} ${route.path}`,
      async id => {
        const response = await request(app)
          [route.method](route.path.replace(':id', id))
          .send({ status: 'processed' })
          .expect(400);

        expect(response.body.details).toEqual(
          expect.arrayContaining([expect.objectContaining({ path: 'id' })])
        );
        for (const controller of [
          getQuotationById,
          getQuotationCalculations,
          updateQuotation,
          processQuotationWithCalculations,
        ]) {
          expect(controller).not.toHaveBeenCalled();
        }
      }
    );
  }

  it.each(idRoutes)('accepts a valid ID on $method $path', async route => {
    await request(app)
      [route.method](route.path.replace(':id', '42'))
      .send({ status: 'processed' })
      .expect(route.status);
  });

  it('keeps the literal supplier route ahead of ID validation', async () => {
    await request(app).get('/quotations/supplier').expect(204);

    expect(getQuotationById).not.toHaveBeenCalled();
  });
});
