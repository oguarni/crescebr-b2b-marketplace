import { adminService } from '../adminService';
import User from '../../models/User';
import Product from '../../models/Product';
import Order from '../../models/Order';
import Quotation from '../../models/Quotation';
import { CNPJService } from '../cnpjService';

// Mock models using the same pattern as other service tests
jest.mock('../../models/User');
jest.mock('../../models/Product');
jest.mock('../../models/Order');
jest.mock('../../models/Quotation');
jest.mock('../../models/QuotationItem');
jest.mock('../../models/Rating');
jest.mock('../cnpjService');

const MockUser = User as jest.Mocked<typeof User>;
const MockProduct = Product as jest.Mocked<typeof Product>;
const MockOrder = Order as jest.Mocked<typeof Order>;
const MockQuotation = Quotation as jest.Mocked<typeof Quotation>;
const MockCNPJService = CNPJService as jest.Mocked<typeof CNPJService>;

// Product.sequelize and Quotation.sequelize are accessed in the source
(MockProduct as any).sequelize = { fn: jest.fn(), col: jest.fn() };
(MockQuotation as any).sequelize = { fn: jest.fn(), col: jest.fn() };

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardAnalytics', () => {
    function setupDashboardMocks(
      overrides: {
        totalCompanies?: number;
        pendingCompanies?: number;
        approvedCompanies?: number;
        unvalidatedCNPJ?: number;
        totalProducts?: number;
        productsByCategory?: any[];
        totalOrders?: number;
        thisMonthOrders?: number;
        lastMonthOrders?: number;
        totalQuotations?: number;
        quotationsByStatus?: any[];
        recentOrders?: number;
        recentCompanyRegistrations?: number;
        allOrders?: any[];
      } = {}
    ) {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      MockUser.count
        .mockResolvedValueOnce(overrides.totalCompanies ?? 10)
        .mockResolvedValueOnce(overrides.pendingCompanies ?? 2)
        .mockResolvedValueOnce(overrides.approvedCompanies ?? 7)
        .mockResolvedValueOnce(overrides.unvalidatedCNPJ ?? 1)
        .mockResolvedValueOnce(overrides.recentCompanyRegistrations ?? 3);

      MockProduct.count.mockResolvedValueOnce(overrides.totalProducts ?? 50);
      MockProduct.findAll.mockResolvedValueOnce(
        (overrides.productsByCategory ?? [
          { category: 'Electronics', getDataValue: () => '20' },
          { category: 'Clothing', getDataValue: () => '30' },
        ]) as any
      );

      MockOrder.count
        .mockResolvedValueOnce(overrides.totalOrders ?? 25)
        .mockResolvedValueOnce(overrides.thisMonthOrders ?? 10)
        .mockResolvedValueOnce(overrides.lastMonthOrders ?? 8)
        .mockResolvedValueOnce(overrides.recentOrders ?? 5);

      MockQuotation.count.mockResolvedValueOnce(overrides.totalQuotations ?? 15);
      MockQuotation.findAll.mockResolvedValueOnce(
        (overrides.quotationsByStatus ?? [
          { status: 'pending', getDataValue: () => '5' },
          { status: 'processed', getDataValue: () => '10' },
        ]) as any
      );

      const defaultOrders = overrides.allOrders ?? [
        { totalAmount: '500.00', createdAt: new Date(), status: 'delivered' },
        { totalAmount: '300.00', createdAt: new Date(), status: 'pending' },
        {
          totalAmount: '200.00',
          createdAt: new Date(lastMonth.getTime() + 86400000),
          status: 'delivered',
        },
      ];

      MockOrder.findAll.mockResolvedValueOnce(defaultOrders as any);

      return { thisMonth, lastMonth };
    }

    it('should return complete dashboard with all sections', async () => {
      setupDashboardMocks();

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary).toBeDefined();
      expect(result.summary.companies).toBeDefined();
      expect(result.summary.products).toBeDefined();
      expect(result.summary.orders).toBeDefined();
      expect(result.summary.revenue).toBeDefined();
      expect(result.summary.quotations).toBeDefined();
      expect(result.summary.activity).toBeDefined();
    });

    it('should return correct company metrics', async () => {
      setupDashboardMocks({
        totalCompanies: 20,
        pendingCompanies: 5,
        approvedCompanies: 12,
        unvalidatedCNPJ: 3,
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.companies.total).toBe(20);
      expect(result.summary.companies.pending).toBe(5);
      expect(result.summary.companies.approved).toBe(12);
      expect(result.summary.companies.unvalidatedCNPJ).toBe(3);
      expect(result.summary.companies.approvalRate).toBe('60.0');
    });

    it('should return correct product metrics', async () => {
      setupDashboardMocks({ totalProducts: 42 });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.products.total).toBe(42);
      expect(result.summary.products.byCategory).toBeDefined();
    });

    it('should return correct quotation metrics', async () => {
      setupDashboardMocks({ totalQuotations: 30 });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.quotations.total).toBe(30);
      expect(result.summary.quotations.byStatus).toBeDefined();
    });

    it('should calculate order growth rate correctly', async () => {
      setupDashboardMocks({
        thisMonthOrders: 15,
        lastMonthOrders: 10,
      });

      const result = await adminService.getDashboardAnalytics();

      // (15 - 10) / 10 * 100 = 50.0
      expect(result.summary.orders.growthRate).toBe('50.0');
    });

    it('should calculate negative order growth rate', async () => {
      setupDashboardMocks({
        thisMonthOrders: 5,
        lastMonthOrders: 10,
      });

      const result = await adminService.getDashboardAnalytics();

      // (5 - 10) / 10 * 100 = -50.0
      expect(result.summary.orders.growthRate).toBe('-50.0');
    });

    it('should calculate revenue growth rate correctly', async () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      setupDashboardMocks({
        allOrders: [
          { totalAmount: '1000.00', createdAt: new Date(), status: 'delivered' },
          {
            totalAmount: '500.00',
            createdAt: new Date(lastMonth.getTime() + 86400000),
            status: 'delivered',
          },
        ],
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.revenue.thisMonth).toBeGreaterThanOrEqual(0);
      expect(result.summary.revenue.lastMonth).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero orders gracefully (no division by zero)', async () => {
      setupDashboardMocks({
        thisMonthOrders: 0,
        lastMonthOrders: 0,
        allOrders: [],
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.orders.growthRate).toBe('0.0');
      expect(result.summary.revenue.growthRate).toBe('0.0');
      expect(result.summary.revenue.total).toBe(0);
    });

    it('should handle case when this month orders > 0 but last month = 0 (100% growth)', async () => {
      setupDashboardMocks({
        thisMonthOrders: 5,
        lastMonthOrders: 0,
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.orders.growthRate).toBe('100.0');
    });

    it('should handle revenue when this month > 0 but last month = 0', async () => {
      setupDashboardMocks({
        allOrders: [{ totalAmount: '1000.00', createdAt: new Date(), status: 'delivered' }],
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.revenue.growthRate).toBe('100.0');
    });

    it('should aggregate orders by status correctly', async () => {
      setupDashboardMocks({
        allOrders: [
          { totalAmount: '100.00', createdAt: new Date(), status: 'pending' },
          { totalAmount: '200.00', createdAt: new Date(), status: 'pending' },
          { totalAmount: '300.00', createdAt: new Date(), status: 'delivered' },
        ],
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.orders.byStatus.pending).toBe(2);
      expect(result.summary.orders.byStatus.delivered).toBe(1);
    });

    it('should calculate total revenue from all orders', async () => {
      setupDashboardMocks({
        allOrders: [
          { totalAmount: '100.50', createdAt: new Date(), status: 'delivered' },
          { totalAmount: '200.75', createdAt: new Date(), status: 'pending' },
        ],
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.revenue.total).toBeCloseTo(301.25, 2);
    });

    it('should format revenue values correctly', async () => {
      setupDashboardMocks({
        allOrders: [{ totalAmount: '1234.56', createdAt: new Date(), status: 'delivered' }],
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.revenue.formatted.total).toContain('R$');
    });

    it('should calculate activity metrics correctly', async () => {
      setupDashboardMocks({
        recentOrders: 7,
        recentCompanyRegistrations: 4,
        pendingCompanies: 3,
        unvalidatedCNPJ: 2,
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.activity.recentOrders).toBe(7);
      expect(result.summary.activity.recentCompanyRegistrations).toBe(4);
      expect(result.summary.activity.verificationQueueSize).toBe(3);
      expect(result.summary.activity.urgentTasks).toBe(5); // 3 + 2
    });

    it('should handle zero total companies for approval rate', async () => {
      setupDashboardMocks({
        totalCompanies: 0,
        approvedCompanies: 0,
      });

      const result = await adminService.getDashboardAnalytics();

      expect(result.summary.companies.approvalRate).toBe('0');
    });
  });

  describe('getSupplierMetrics', () => {
    it('should return supplier metrics with products, orders, ratings', async () => {
      const mockUser = {
        id: 1,
        role: 'supplier',
        companyName: 'Test Supplier',
        cnpjValidated: true,
        industrySector: 'Technology',
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);

      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100, category: 'Tech', createdAt: new Date() },
        { id: 2, name: 'Product 2', price: 200, category: 'Tech', createdAt: new Date() },
      ];

      const mockOrders = [
        { totalAmount: '500.00', status: 'delivered' },
        { totalAmount: '300.00', status: 'pending' },
      ];

      const mockRatings = [
        { score: 4, comment: 'Good', createdAt: new Date() },
        { score: 5, comment: 'Excellent', createdAt: new Date() },
      ];

      MockProduct.findAll.mockResolvedValue(mockProducts as any);
      MockOrder.findAll.mockResolvedValue(mockOrders as any);

      const Rating = (await import('../../models/Rating')).default;
      (Rating.findAll as jest.Mock).mockResolvedValue(mockRatings as any);

      const result = await adminService.getSupplierMetrics('1');

      expect(result.supplier).toEqual(mockUser);
      expect(result.metrics.totalProducts).toBe(2);
      expect(result.metrics.totalOrders).toBe(2);
      expect(result.metrics.totalRevenue).toBeCloseTo(800, 2);
      expect(result.metrics.averageRating).toBe(4.5);
      expect(result.metrics.totalRatings).toBe(2);
      expect(result.metrics.cnpjValidated).toBe(true);
      expect(result.metrics.industrySector).toBe('Technology');
    });

    it('should throw Supplier not found when user not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      await expect(adminService.getSupplierMetrics('999')).rejects.toThrow('Supplier not found');
    });

    it('should calculate average rating correctly', async () => {
      const mockUser = {
        id: 1,
        role: 'supplier',
        companyName: 'Supplier',
        cnpjValidated: false,
        industrySector: null,
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);
      MockProduct.findAll.mockResolvedValue([] as any);
      MockOrder.findAll.mockResolvedValue([] as any);

      const Rating = (await import('../../models/Rating')).default;
      (Rating.findAll as jest.Mock).mockResolvedValue([
        { score: 3, comment: 'OK', createdAt: new Date('2024-01-03') },
        { score: 4, comment: 'Good', createdAt: new Date('2024-01-02') },
        { score: 5, comment: 'Great', createdAt: new Date('2024-01-01') },
      ] as any);

      const result = await adminService.getSupplierMetrics('1');

      // (3 + 4 + 5) / 3 = 4.0
      expect(result.metrics.averageRating).toBe(4);
    });

    it('should handle empty ratings array', async () => {
      const mockUser = {
        id: 1,
        role: 'supplier',
        companyName: 'Supplier',
        cnpjValidated: false,
        industrySector: null,
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);
      MockProduct.findAll.mockResolvedValue([] as any);
      MockOrder.findAll.mockResolvedValue([] as any);

      const Rating = (await import('../../models/Rating')).default;
      (Rating.findAll as jest.Mock).mockResolvedValue([] as any);

      const result = await adminService.getSupplierMetrics('1');

      expect(result.metrics.averageRating).toBe(0);
      expect(result.metrics.totalRatings).toBe(0);
    });

    it('should handle orders by status aggregation', async () => {
      const mockUser = {
        id: 1,
        role: 'supplier',
        companyName: 'Supplier',
        cnpjValidated: false,
        industrySector: null,
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);
      MockProduct.findAll.mockResolvedValue([] as any);
      MockOrder.findAll.mockResolvedValue([
        { totalAmount: '100.00', status: 'pending' },
        { totalAmount: '200.00', status: 'pending' },
        { totalAmount: '300.00', status: 'delivered' },
        { totalAmount: '400.00', status: 'shipped' },
      ] as any);

      const Rating = (await import('../../models/Rating')).default;
      (Rating.findAll as jest.Mock).mockResolvedValue([] as any);

      const result = await adminService.getSupplierMetrics('1');

      expect(result.metrics.ordersByStatus.pending).toBe(2);
      expect(result.metrics.ordersByStatus.delivered).toBe(1);
      expect(result.metrics.ordersByStatus.shipped).toBe(1);
    });

    it('should return at most 10 products', async () => {
      const mockUser = {
        id: 1,
        role: 'supplier',
        companyName: 'Supplier',
        cnpjValidated: false,
        industrySector: null,
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);

      const manyProducts = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        price: 100,
        category: 'Test',
        createdAt: new Date(),
      }));

      MockProduct.findAll.mockResolvedValue(manyProducts as any);
      MockOrder.findAll.mockResolvedValue([] as any);

      const Rating = (await import('../../models/Rating')).default;
      (Rating.findAll as jest.Mock).mockResolvedValue([] as any);

      const result = await adminService.getSupplierMetrics('1');

      expect(result.products).toHaveLength(10);
    });

    it('should return at most 5 recent ratings sorted by date descending', async () => {
      const mockUser = {
        id: 1,
        role: 'supplier',
        companyName: 'Supplier',
        cnpjValidated: false,
        industrySector: null,
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);
      MockProduct.findAll.mockResolvedValue([] as any);
      MockOrder.findAll.mockResolvedValue([] as any);

      const manyRatings = Array.from({ length: 8 }, (_, i) => ({
        score: (i % 5) + 1,
        comment: `Rating ${i}`,
        createdAt: new Date(2024, 0, i + 1),
      }));

      const Rating = (await import('../../models/Rating')).default;
      (Rating.findAll as jest.Mock).mockResolvedValue(manyRatings as any);

      const result = await adminService.getSupplierMetrics('1');

      expect(result.recentRatings).toHaveLength(5);
      // Verify sorted by date descending
      for (let i = 0; i < result.recentRatings.length - 1; i++) {
        expect(new Date(result.recentRatings[i].createdAt!).getTime()).toBeGreaterThanOrEqual(
          new Date(result.recentRatings[i + 1].createdAt!).getTime()
        );
      }
    });

    it('should calculate total revenue from supplier orders', async () => {
      const mockUser = {
        id: 1,
        role: 'supplier',
        companyName: 'Supplier',
        cnpjValidated: false,
        industrySector: null,
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);
      MockProduct.findAll.mockResolvedValue([] as any);
      MockOrder.findAll.mockResolvedValue([
        { totalAmount: '150.50', status: 'delivered' },
        { totalAmount: '249.50', status: 'delivered' },
      ] as any);

      const Rating = (await import('../../models/Rating')).default;
      (Rating.findAll as jest.Mock).mockResolvedValue([] as any);

      const result = await adminService.getSupplierMetrics('1');

      expect(result.metrics.totalRevenue).toBeCloseTo(400, 2);
    });
  });

  describe('getPendingCompanies', () => {
    it('should return all pending supplier companies', async () => {
      const pending = [
        { id: 1, role: 'supplier', status: 'pending' },
        { id: 2, role: 'supplier', status: 'pending' },
      ];
      MockUser.findAll.mockResolvedValue(pending as any);

      const result = await adminService.getPendingCompanies();

      expect(result).toHaveLength(2);
      expect(MockUser.findAll).toHaveBeenCalledWith({
        where: { role: 'supplier', status: 'pending' },
      });
    });

    it('should return empty array when no pending companies', async () => {
      MockUser.findAll.mockResolvedValue([] as any);

      const result = await adminService.getPendingCompanies();

      expect(result).toHaveLength(0);
    });
  });

  describe('verifyCompany', () => {
    function makeMockUser(overrides: any = {}) {
      return {
        id: 1,
        role: 'supplier',
        status: 'pending',
        cnpj: '12.345.678/0001-90',
        save: jest.fn().mockResolvedValue(undefined),
        reload: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
    }

    it('should approve a company and save', async () => {
      const user = makeMockUser();
      MockUser.findOne.mockResolvedValue(user as any);

      const result = await adminService.verifyCompany('1', 'approved', undefined, false);

      expect(result.status).toBe('approved');
      expect(user.save).toHaveBeenCalled();
    });

    it('should reject a company and save', async () => {
      const user = makeMockUser();
      MockUser.findOne.mockResolvedValue(user as any);

      const result = await adminService.verifyCompany('1', 'rejected', 'Docs missing', false);

      expect(result.status).toBe('rejected');
      expect(user.save).toHaveBeenCalled();
    });

    it('should throw when supplier not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      await expect(adminService.verifyCompany('999', 'approved')).rejects.toThrow(
        'Supplier not found'
      );
    });

    it('should validate CNPJ when approving with validateCNPJ=true and CNPJ exists', async () => {
      const user = makeMockUser();
      MockUser.findOne.mockResolvedValue(user as any);
      MockCNPJService.validateAndUpdateCompany.mockResolvedValue({ valid: true });

      await adminService.verifyCompany('1', 'approved', undefined, true);

      expect(MockCNPJService.validateAndUpdateCompany).toHaveBeenCalledWith(
        '12.345.678/0001-90',
        1
      );
      expect(user.reload).toHaveBeenCalled();
    });

    it('should throw when CNPJ validation returns valid=false with error', async () => {
      const user = makeMockUser();
      MockUser.findOne.mockResolvedValue(user as any);
      MockCNPJService.validateAndUpdateCompany.mockResolvedValue({
        valid: false,
        error: 'CNPJ not found',
      });

      await expect(adminService.verifyCompany('1', 'approved', undefined, true)).rejects.toThrow(
        'CNPJ not found'
      );
    });

    it('should throw default CNPJ error when no error message provided', async () => {
      const user = makeMockUser();
      MockUser.findOne.mockResolvedValue(user as any);
      MockCNPJService.validateAndUpdateCompany.mockResolvedValue({ valid: false });

      await expect(adminService.verifyCompany('1', 'approved', undefined, true)).rejects.toThrow(
        'CNPJ validation failed'
      );
    });

    it('should skip CNPJ validation when user has no CNPJ', async () => {
      const user = makeMockUser({ cnpj: null });
      MockUser.findOne.mockResolvedValue(user as any);

      await adminService.verifyCompany('1', 'approved', undefined, true);

      expect(MockCNPJService.validateAndUpdateCompany).not.toHaveBeenCalled();
      expect(user.save).toHaveBeenCalled();
    });

    it('should skip CNPJ validation when validateCNPJ=false', async () => {
      const user = makeMockUser();
      MockUser.findOne.mockResolvedValue(user as any);

      await adminService.verifyCompany('1', 'approved', undefined, false);

      expect(MockCNPJService.validateAndUpdateCompany).not.toHaveBeenCalled();
    });

    it('should skip CNPJ validation when rejecting', async () => {
      const user = makeMockUser();
      MockUser.findOne.mockResolvedValue(user as any);

      await adminService.verifyCompany('1', 'rejected', undefined, true);

      expect(MockCNPJService.validateAndUpdateCompany).not.toHaveBeenCalled();
    });
  });

  describe('getAllProducts', () => {
    it('should return all products ordered by createdAt DESC', async () => {
      const products = [
        { id: 1, name: 'Product A' },
        { id: 2, name: 'Product B' },
      ];
      MockProduct.findAll.mockResolvedValue(products as any);

      const result = await adminService.getAllProducts();

      expect(result).toHaveLength(2);
      expect(MockProduct.findAll).toHaveBeenCalledWith({ order: [['createdAt', 'DESC']] });
    });

    it('should return empty array when no products', async () => {
      MockProduct.findAll.mockResolvedValue([] as any);

      const result = await adminService.getAllProducts();

      expect(result).toHaveLength(0);
    });
  });

  describe('moderateProduct', () => {
    it('should return product when action is approve', async () => {
      const product = { id: 1, name: 'Test', destroy: jest.fn() };
      MockProduct.findByPk.mockResolvedValue(product as any);

      const result = await adminService.moderateProduct('1', 'approve');

      expect(result).toEqual(product);
      expect(product.destroy).not.toHaveBeenCalled();
    });

    it('should return product when action is reject', async () => {
      const product = { id: 1, name: 'Test', destroy: jest.fn() };
      MockProduct.findByPk.mockResolvedValue(product as any);

      const result = await adminService.moderateProduct('1', 'reject');

      expect(result).toEqual(product);
      expect(product.destroy).not.toHaveBeenCalled();
    });

    it('should destroy and return null when action is remove', async () => {
      const product = { id: 1, name: 'Test', destroy: jest.fn().mockResolvedValue(undefined) };
      MockProduct.findByPk.mockResolvedValue(product as any);

      const result = await adminService.moderateProduct('1', 'remove');

      expect(result).toBeNull();
      expect(product.destroy).toHaveBeenCalled();
    });

    it('should throw when product not found', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      await expect(adminService.moderateProduct('999', 'approve')).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('getTransactionMonitoring', () => {
    it('should return orders with computed revenue and status counts', async () => {
      const orders = [
        { totalAmount: '100.00', status: 'delivered' },
        { totalAmount: '200.00', status: 'processing' },
      ];
      MockOrder.findAll.mockResolvedValue(orders as any);

      const result = await adminService.getTransactionMonitoring({});

      expect(result.orders).toHaveLength(2);
      expect(result.totalRevenue).toBeCloseTo(300, 2);
      expect(result.totalOrders).toBe(2);
      expect(result.ordersByStatus.delivered).toBe(1);
      expect(result.ordersByStatus.processing).toBe(1);
    });

    it('should build date range filter when both startDate and endDate provided', async () => {
      MockOrder.findAll.mockResolvedValue([] as any);

      await adminService.getTransactionMonitoring({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      expect(MockOrder.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.any(Object) }),
        })
      );
    });

    it('should add status filter when status provided', async () => {
      MockOrder.findAll.mockResolvedValue([] as any);

      await adminService.getTransactionMonitoring({ status: 'delivered' });

      expect(MockOrder.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'delivered' }),
        })
      );
    });

    it('should not add date filter when only startDate provided (no endDate)', async () => {
      MockOrder.findAll.mockResolvedValue([] as any);

      await adminService.getTransactionMonitoring({ startDate: '2023-01-01' });

      const call = MockOrder.findAll.mock.calls[0][0] as any;
      expect(call.where.createdAt).toBeUndefined();
    });

    it('should handle empty orders', async () => {
      MockOrder.findAll.mockResolvedValue([] as any);

      const result = await adminService.getTransactionMonitoring({});

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.ordersByStatus).toEqual({});
    });
  });

  describe('getCompanyDetails', () => {
    it('should return company when found', async () => {
      const company = { id: 1, role: 'supplier', email: 'sup@test.com' };
      MockUser.findOne.mockResolvedValue(company as any);

      const result = await adminService.getCompanyDetails('1');

      expect(result).toEqual(company);
      expect(MockUser.findOne).toHaveBeenCalledWith({
        where: { id: '1', role: 'supplier' },
        attributes: { exclude: ['password'] },
      });
    });

    it('should throw when company not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      await expect(adminService.getCompanyDetails('999')).rejects.toThrow('Company not found');
    });
  });

  describe('updateCompanyStatus', () => {
    it('should update status and save company', async () => {
      const company = { id: 1, status: 'pending', save: jest.fn().mockResolvedValue(undefined) };
      MockUser.findOne.mockResolvedValue(company as any);

      const result = await adminService.updateCompanyStatus('1', 'approved');

      expect(result.status).toBe('approved');
      expect(company.save).toHaveBeenCalled();
    });

    it('should throw when company not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      await expect(adminService.updateCompanyStatus('999', 'approved')).rejects.toThrow(
        'Company not found'
      );
    });
  });

  describe('validateSupplierCNPJ', () => {
    it('should validate CNPJ and return user and cnpjValidation', async () => {
      const user = {
        id: 1,
        cnpj: '12.345.678/0001-90',
        reload: jest.fn().mockResolvedValue(undefined),
      };
      MockUser.findOne.mockResolvedValue(user as any);
      MockCNPJService.validateAndUpdateCompany.mockResolvedValue({
        valid: true,
        companyName: 'Test Co',
      });

      const result = await adminService.validateSupplierCNPJ('1');

      expect(result.user).toEqual(user);
      expect(result.cnpjValidation.valid).toBe(true);
      expect(result.cnpjValidation.companyName).toBe('Test Co');
      expect(user.reload).toHaveBeenCalled();
    });

    it('should throw when supplier not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      await expect(adminService.validateSupplierCNPJ('999')).rejects.toThrow('Supplier not found');
    });

    it('should throw when supplier has no CNPJ', async () => {
      const user = { id: 1, cnpj: null };
      MockUser.findOne.mockResolvedValue(user as any);

      await expect(adminService.validateSupplierCNPJ('1')).rejects.toThrow(
        'Supplier has no CNPJ to validate'
      );
    });
  });

  describe('getVerificationQueue', () => {
    it('should return paginated companies with correct metadata', async () => {
      MockUser.findAndCountAll.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }],
        count: 10,
      } as any);

      const result = await adminService.getVerificationQueue(1, 5, 'all');

      expect(result.companies).toHaveLength(2);
      expect(result.totalCount).toBe(10);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(MockUser.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'supplier' },
          limit: 5,
          offset: 0,
        })
      );
    });

    it('should filter by pending status', async () => {
      MockUser.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as any);

      await adminService.getVerificationQueue(1, 10, 'pending');

      expect(MockUser.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'supplier', status: 'pending' }),
        })
      );
    });

    it('should filter by unvalidated_cnpj', async () => {
      MockUser.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as any);

      await adminService.getVerificationQueue(1, 10, 'unvalidated_cnpj');

      expect(MockUser.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'supplier', cnpjValidated: false }),
        })
      );
    });

    it('should calculate correct offset for page 2', async () => {
      MockUser.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as any);

      await adminService.getVerificationQueue(2, 10, 'all');

      expect(MockUser.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 10 })
      );
    });

    it('should return totalPages=0 when count is 0', async () => {
      MockUser.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as any);

      const result = await adminService.getVerificationQueue(1, 10, 'all');

      expect(result.totalPages).toBe(0);
    });
  });
});
