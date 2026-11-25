import { supplierDashboardService } from '../supplierDashboardService';
import Order from '../../models/Order';
import Quotation from '../../models/Quotation';
import { quotationRepository } from '../../repositories';

jest.mock('../../models/Order');
jest.mock('../../models/Quotation');
jest.mock('../../repositories', () => ({
  quotationRepository: { findIdsForSupplier: jest.fn() },
}));

const findIds = quotationRepository.findIdsForSupplier as jest.Mock;

describe('supplierDashboardService.getSummary', () => {
  it('skips the aggregate queries when the supplier has no quotations', async () => {
    findIds.mockResolvedValue([]);

    await expect(supplierDashboardService.getSummary(7)).resolves.toEqual({
      pendingQuotations: 0,
      activeOrders: 0,
      billableOrders: 0,
      orderVolume: 0,
    });
    expect(Quotation.count).not.toHaveBeenCalled();
    expect(Order.findAll).not.toHaveBeenCalled();
  });

  it('reads the string counts and sums Postgres returns, and a null sum as zero', async () => {
    findIds.mockResolvedValue([1, 2, 3]);
    (Quotation.count as jest.Mock).mockResolvedValue(4);
    (Order.findAll as jest.Mock).mockResolvedValue([
      { status: 'pending', count: '2', total: '100.10' },
      { status: 'processing', count: '1', total: '0.20' },
      { status: 'shipped', count: '3', total: null },
      { status: 'cancelled', count: '5', total: '999.99' },
    ]);

    await expect(supplierDashboardService.getSummary(7)).resolves.toEqual({
      pendingQuotations: 4,
      activeOrders: 3,
      billableOrders: 6,
      orderVolume: 100.3,
    });
    expect(Order.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ group: ['status'], raw: true })
    );
  });
});
