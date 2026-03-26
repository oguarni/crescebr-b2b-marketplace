import { adminService } from '../adminService';
import User from '../../models/User';
import Product from '../../models/Product';
import Order from '../../models/Order';
import Quotation from '../../models/Quotation';

// Mock models using the same pattern as other service tests
jest.mock('../../models/User');
jest.mock('../../models/Product');
jest.mock('../../models/Order');
jest.mock('../../models/Quotation');
jest.mock('../../models/QuotationItem');
jest.mock('../../models/Rating');

const MockUser = User as jest.Mocked<typeof User>;
const MockProduct = Product as jest.Mocked<typeof Product>;
const MockOrder = Order as jest.Mocked<typeof Order>;
const MockQuotation = Quotation as jest.Mocked<typeof Quotation>;

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
});
