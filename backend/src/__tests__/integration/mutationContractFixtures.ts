import express from 'express';
import models from '../../models';
import ordersRouter from '../../routes/orders';
import quotationsRouter from '../../routes/quotations';
import adminRouter from '../../routes/admin';
import productsRouter from '../../routes/products';
import ratingsRouter from '../../routes/ratings';
import authRouter from '../../routes/auth';
import { errorHandler } from '../../middleware/errorHandler';
import { extractTokenFromHeader, verifyToken } from '../../utils/jwt';
import { CNPJService } from '../../services/cnpjService';
import { logger } from '../../utils/structuredLogger';

export const app = express();
app.use(express.json());
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/quotations', quotationsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/ratings', ratingsRouter);
app.use('/api/v1/auth', authRouter);
app.use(errorHandler);

export const actor = (id = 1, role = 'customer') => ({ Authorization: `Bearer ${id}:${role}` });
export const orderId = '00000000-0000-4000-8000-000000000001';
export const missingOrderId = '00000000-0000-4000-8000-000000000099';
export const internalMessage =
  'Injected SQL failure: relation private_table not found at /private/db';

export async function seedMutationContracts(): Promise<void> {
  jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  (extractTokenFromHeader as jest.Mock).mockImplementation(header => header?.split(' ')[1]);
  (verifyToken as jest.Mock).mockImplementation(token => {
    const [id, role] = token.split(':');
    return { id: Number(id), role, email: 'fixture@example.com' };
  });
  await models.sequelize.sync({ force: true });
  await models.User.bulkCreate(
    [1, 2, 3, 4].map(id => ({
      id,
      email: `contract-${id}@example.com`,
      password: 'test-fixture',
      cpf: `1234567890${id}`,
      address: 'Synthetic test address',
      role:
        id === 4 ? ('admin' as const) : id === 1 ? ('customer' as const) : ('supplier' as const),
      status: 'approved' as const,
      companyName: `Company ${id}`,
      corporateName: `Company ${id} LTDA`,
      cnpj: id === 2 ? '11.444.777/0001-61' : `1234567800010${id}`,
      industrySector: 'machinery',
      companyType: id === 1 ? ('buyer' as const) : ('supplier' as const),
    }))
  );
  await models.Product.create({
    id: 1,
    name: 'Contract product',
    description: 'Synthetic product',
    price: 100,
    unitPrice: 100,
    imageUrl: 'https://example.com/product.png',
    category: 'test',
    supplierId: 2,
    tierPricing: [],
    specifications: {},
    minimumOrderQuantity: 5,
    leadTime: 1,
    availability: 'in_stock',
  });
  await models.Quotation.create({ id: 1, companyId: 1, status: 'processed', adminNotes: null });
  await models.QuotationItem.create({ quotationId: 1, productId: 1, quantity: 5 });
  await models.Order.create({ id: orderId, companyId: 1, quotationId: 1, totalAmount: 100 });
}

export function restoreMutationContracts(): void {
  CNPJService.clearCache();
  jest.restoreAllMocks();
}

export { models };
