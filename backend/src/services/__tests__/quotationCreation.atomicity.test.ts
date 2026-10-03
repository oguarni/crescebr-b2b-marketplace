import { Transaction } from 'sequelize';
import models from '../../models';
import { quotationService } from '../quotation.service';
import { quotationRepository } from '../../repositories';

const { sequelize, User, Product, Quotation, QuotationItem } = models;
const input = {
  companyId: 1,
  items: [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 3 },
  ],
};

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
  await Product.bulkCreate(
    [1, 2].map(id => ({
      id,
      name: `Product ${id}`,
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
      availability: 'in_stock' as const,
    }))
  );
});

afterEach(() => jest.restoreAllMocks());

describe('quotation creation with a real isolated database', () => {
  it('commits the parent and all items and returns their relations', async () => {
    const result = await quotationService.validateAndCreate(input);
    expect(result?.toJSON()).toMatchObject({
      companyId: 1,
      status: 'pending',
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 3 },
      ],
    });
    expect(await Quotation.count()).toBe(1);
    expect(await QuotationItem.count()).toBe(2);
  });

  it('rolls back the parent and first item when the second insert fails', async () => {
    const createItem = QuotationItem.create.bind(QuotationItem);
    jest
      .spyOn(QuotationItem, 'create')
      .mockImplementationOnce((values, options) => {
        expect(options?.transaction).toBeInstanceOf(Transaction);
        return createItem(values, options);
      })
      .mockImplementationOnce(async (_values, options) => {
        expect(await QuotationItem.count({ transaction: options?.transaction })).toBe(1);
        throw new Error('Injected item write failure');
      });

    await expect(quotationService.validateAndCreate(input)).rejects.toThrow(
      'Injected item write failure'
    );
    expect(await Quotation.count()).toBe(0);
    expect(await QuotationItem.count()).toBe(0);
  });

  it('leaves no rows when the parent insert fails', async () => {
    jest
      .spyOn(Quotation, 'create')
      .mockRejectedValueOnce(new Error('Injected parent write failure'));
    await expect(quotationService.validateAndCreate(input)).rejects.toThrow(
      'Injected parent write failure'
    );
    expect(await Quotation.count()).toBe(0);
    expect(await QuotationItem.count()).toBe(0);
  });

  it('rolls back all writes when the final relation read fails', async () => {
    jest
      .spyOn(quotationRepository, 'findByIdWithItems')
      .mockImplementationOnce(async (_id, options) => {
        expect(await QuotationItem.count({ transaction: options?.transaction })).toBe(2);
        throw new Error('Injected quotation read failure');
      });
    await expect(quotationService.validateAndCreate(input)).rejects.toThrow(
      'Injected quotation read failure'
    );
    expect(await Quotation.count()).toBe(0);
    expect(await QuotationItem.count()).toBe(0);
  });
});
