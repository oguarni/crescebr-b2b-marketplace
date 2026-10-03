import models from '../../models';
import { orderService } from '../orderService';
import { QuoteService } from '../quoteService';

const { sequelize, User, Product, Quotation, QuotationItem, Order } = models;
let quotationId: number;

beforeEach(async () => {
  await sequelize.sync({ force: true });
  await User.create({
    id: 1,
    email: 'atomicity@example.com',
    password: 'test-fixture',
    cpf: '12345678901',
    address: 'Synthetic test address',
    role: 'customer',
    companyName: 'Test Company',
    corporateName: 'Test Company LTDA',
    cnpj: '12.345.678/0001-90',
    industrySector: 'machinery',
    companyType: 'buyer',
  });
  await Product.create({
    id: 1,
    name: 'Test Product',
    description: 'Synthetic product',
    price: 100,
    unitPrice: 100,
    imageUrl: 'https://example.com/product.png',
    category: 'test',
    supplierId: 1,
    tierPricing: [],
    specifications: {},
    minimumOrderQuantity: 1,
    leadTime: 1,
    availability: 'in_stock',
  });
  const quotation = await Quotation.create({ companyId: 1, status: 'processed', adminNotes: null });
  quotationId = quotation.id;
  await QuotationItem.create({ quotationId, productId: 1, quantity: 2 });
});

afterEach(() => jest.restoreAllMocks());

describe('order conversion with a real isolated database', () => {
  it('commits one priced order and completes its quotation', async () => {
    const expected = await QuoteService.getQuotationWithCalculations(quotationId);
    const order = await orderService.createFromQuotation(quotationId, 1);
    expect(order.toJSON()).toMatchObject({
      quotationId,
      companyId: 1,
      status: 'pending',
      totalAmount: expected.calculations.grandTotal,
      quotation: { status: 'completed' },
    });
    expect(await Order.count()).toBe(1);
    expect((await Quotation.findByPk(quotationId))?.status).toBe('completed');
    await expect(orderService.createFromQuotation(quotationId, 1)).rejects.toThrow(
      'Only processed quotations can be converted to orders'
    );
    expect(await Order.count()).toBe(1);
  });

  it('leaves no order when its insert fails', async () => {
    jest.spyOn(Order, 'create').mockRejectedValueOnce(new Error('Injected order write failure'));
    await expect(orderService.createFromQuotation(quotationId, 1)).rejects.toThrow(
      'Injected order write failure'
    );
    expect(await Order.count()).toBe(0);
    expect((await Quotation.findByPk(quotationId))?.status).toBe('processed');
  });

  it('rolls back the order when completing the quotation fails', async () => {
    jest
      .spyOn(Quotation.prototype, 'update')
      .mockRejectedValueOnce(new Error('Injected status write failure'));
    await expect(orderService.createFromQuotation(quotationId, 1)).rejects.toThrow(
      'Injected status write failure'
    );
    expect(await Order.count()).toBe(0);
    expect((await Quotation.findByPk(quotationId))?.status).toBe('processed');
  });

  it('rolls back both writes when the final order read fails', async () => {
    jest.spyOn(Order, 'findByPk').mockRejectedValueOnce(new Error('Injected order read failure'));
    await expect(orderService.createFromQuotation(quotationId, 1)).rejects.toThrow(
      'Injected order read failure'
    );
    expect(await Order.count()).toBe(0);
    expect((await Quotation.findByPk(quotationId))?.status).toBe('processed');
  });

  it('opens no transaction when pricing fails', async () => {
    const transaction = jest.spyOn(sequelize, 'transaction');
    jest
      .spyOn(QuoteService, 'getQuotationWithCalculations')
      .mockRejectedValueOnce(new Error('Injected pricing failure'));
    await expect(orderService.createFromQuotation(quotationId, 1)).rejects.toThrow(
      'Injected pricing failure'
    );
    expect(transaction).not.toHaveBeenCalled();
    expect(await Order.count()).toBe(0);
    expect((await Quotation.findByPk(quotationId))?.status).toBe('processed');
  });
});
