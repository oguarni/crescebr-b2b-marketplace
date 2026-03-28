import { Op } from 'sequelize';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Quotation from '../models/Quotation';
import { CNPJService } from './cnpjService';

export interface DashboardAnalytics {
  summary: {
    companies: {
      total: number;
      pending: number;
      approved: number;
      unvalidatedCNPJ: number;
      approvalRate: string;
    };
    products: {
      total: number;
      byCategory: any[];
    };
    orders: {
      total: number;
      thisMonth: number;
      lastMonth: number;
      growthRate: string;
      byStatus: Record<string, number>;
      recentWeek: number;
    };
    revenue: {
      total: number;
      thisMonth: number;
      lastMonth: number;
      growthRate: string;
      formatted: {
        total: string;
        thisMonth: string;
        lastMonth: string;
      };
    };
    quotations: {
      total: number;
      byStatus: any[];
    };
    activity: {
      recentOrders: number;
      recentCompanyRegistrations: number;
      verificationQueueSize: number;
      urgentTasks: number;
    };
  };
}

export const adminService = {
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all count queries in parallel
    const [
      totalCompanies,
      pendingCompanies,
      approvedCompanies,
      unvalidatedCNPJ,
      totalProducts,
      productsByCategory,
      totalOrders,
      thisMonthOrders,
      lastMonthOrders,
      totalQuotations,
      quotationsByStatus,
      recentOrders,
      recentCompanyRegistrations,
      allOrders,
    ] = await Promise.all([
      User.count({ where: { role: 'supplier' } }),
      User.count({ where: { role: 'supplier', status: 'pending' } }),
      User.count({ where: { role: 'supplier', status: 'approved' } }),
      User.count({
        where: { role: 'supplier', cnpjValidated: false, cnpj: { [Op.ne]: null } } as any,
      }),
      Product.count(),
      Product.findAll({
        attributes: [
          'category',
          [Product.sequelize!.fn('COUNT', Product.sequelize!.col('id')), 'count'],
        ],
        group: ['category'],
        raw: true,
      }),
      Order.count(),
      Order.count({ where: { createdAt: { [Op.gte]: thisMonth } } }),
      Order.count({ where: { createdAt: { [Op.gte]: lastMonth, [Op.lt]: thisMonth } } }),
      Quotation.count(),
      Quotation.findAll({
        attributes: [
          'status',
          [Quotation.sequelize!.fn('COUNT', Quotation.sequelize!.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      }),
      Order.count({ where: { createdAt: { [Op.gte]: oneWeekAgo } } }),
      User.count({ where: { role: 'supplier', createdAt: { [Op.gte]: oneWeekAgo } } }),
      Order.findAll({ attributes: ['totalAmount', 'createdAt', 'status'] }),
    ]);

    // Calculate revenue in-app (already fetched)
    const totalRevenue = allOrders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0
    );
    const thisMonthRevenue = allOrders
      .filter(order => new Date(order.createdAt) >= thisMonth)
      .reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
    const lastMonthRevenue = allOrders
      .filter(
        order => new Date(order.createdAt) >= lastMonth && new Date(order.createdAt) < thisMonth
      )
      .reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);

    const ordersByStatus = allOrders.reduce((acc: Record<string, number>, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const orderGrowthRate =
      lastMonthOrders > 0
        ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
        : thisMonthOrders > 0
          ? 100
          : 0;

    const revenueGrowthRate =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : thisMonthRevenue > 0
          ? 100
          : 0;

    return {
      summary: {
        companies: {
          total: totalCompanies,
          pending: pendingCompanies,
          approved: approvedCompanies,
          unvalidatedCNPJ,
          approvalRate:
            totalCompanies > 0 ? ((approvedCompanies / totalCompanies) * 100).toFixed(1) : '0',
        },
        products: {
          total: totalProducts,
          byCategory: productsByCategory,
        },
        orders: {
          total: totalOrders,
          thisMonth: thisMonthOrders,
          lastMonth: lastMonthOrders,
          growthRate: orderGrowthRate.toFixed(1),
          byStatus: ordersByStatus,
          recentWeek: recentOrders,
        },
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growthRate: revenueGrowthRate.toFixed(1),
          formatted: {
            total: `R$ ${totalRevenue.toFixed(2)}`,
            thisMonth: `R$ ${thisMonthRevenue.toFixed(2)}`,
            lastMonth: `R$ ${lastMonthRevenue.toFixed(2)}`,
          },
        },
        quotations: {
          total: totalQuotations,
          byStatus: quotationsByStatus,
        },
        activity: {
          recentOrders,
          recentCompanyRegistrations,
          verificationQueueSize: pendingCompanies,
          urgentTasks: pendingCompanies + unvalidatedCNPJ,
        },
      },
    };
  },

  async getPendingCompanies(): Promise<User[]> {
    return User.findAll({
      where: { role: 'supplier', status: 'pending' },
    });
  },

  async verifyCompany(
    userId: string,
    status: 'approved' | 'rejected',
    reason?: string,
    validateCNPJ = true
  ): Promise<User> {
    const user = await User.findOne({ where: { id: userId, role: 'supplier' } });
    if (!user) throw new Error('Supplier not found');

    if (status === 'approved' && validateCNPJ && user.cnpj) {
      const cnpjValidation = await CNPJService.validateAndUpdateCompany(user.cnpj, user.id);
      if (!cnpjValidation.valid) {
        throw new Error(cnpjValidation.error || 'CNPJ validation failed');
      }
      await user.reload();
    }

    user.status = status;
    await user.save();
    return user;
  },

  async getAllProducts(): Promise<Product[]> {
    return Product.findAll({ order: [['createdAt', 'DESC']] });
  },

  async moderateProduct(
    productId: string,
    action: 'approve' | 'reject' | 'remove'
  ): Promise<Product | null> {
    const product = await Product.findByPk(productId);
    if (!product) throw new Error('Product not found');

    if (action === 'remove') {
      await product.destroy();
      return null;
    }

    return product;
  },

  async getTransactionMonitoring(filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const whereClause: any = {};
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
      };
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'email', 'companyName', 'role'] },
        { model: Quotation, as: 'quotation', attributes: ['id', 'totalAmount', 'status'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0
    );
    const ordersByStatus = orders.reduce((acc: Record<string, number>, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    return { orders, totalRevenue, ordersByStatus, totalOrders: orders.length };
  },

  async getCompanyDetails(userId: string): Promise<User> {
    const company = await User.findOne({
      where: { id: userId, role: 'supplier' },
      attributes: { exclude: ['password'] },
    });
    if (!company) throw new Error('Company not found');
    return company;
  },

  async updateCompanyStatus(
    userId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<User> {
    const company = await User.findOne({ where: { id: userId, role: 'supplier' } });
    if (!company) throw new Error('Company not found');

    company.status = status;
    await company.save();
    return company;
  },

  async validateSupplierCNPJ(userId: string): Promise<{
    user: User;
    cnpjValidation: {
      valid: boolean;
      companyName?: string;
      fantasyName?: string;
      city?: string;
      state?: string;
      address?: string;
      error?: string;
    };
  }> {
    const user = await User.findOne({ where: { id: userId, role: 'supplier' } });
    if (!user) throw new Error('Supplier not found');
    if (!user.cnpj) throw new Error('Supplier has no CNPJ to validate');

    const cnpjValidation = await CNPJService.validateAndUpdateCompany(user.cnpj, user.id);
    await user.reload();
    return { user, cnpjValidation };
  },

  async getVerificationQueue(page: number, limit: number, filter: string) {
    const offset = (page - 1) * limit;
    const whereClause: any = { role: 'supplier' };

    if (filter === 'pending') {
      whereClause.status = 'pending';
    } else if (filter === 'unvalidated_cnpj') {
      whereClause.cnpjValidated = false;
      whereClause.cnpj = { [Op.ne]: null };
    }

    const companies = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      companies: companies.rows,
      totalCount: companies.count,
      currentPage: page,
      totalPages: Math.ceil(companies.count / limit),
    };
  },

  async getSupplierMetrics(userId: string) {
    const user = await User.findOne({
      where: { id: userId, role: 'supplier' },
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new Error('Supplier not found');
    }

    const QuotationItem = (await import('../models/QuotationItem')).default;
    const Rating = (await import('../models/Rating')).default;

    const [products, orders, ratings] = await Promise.all([
      Product.findAll({
        where: { supplierId: userId },
        attributes: ['id', 'name', 'price', 'category', 'createdAt'],
      }),
      Order.findAll({
        include: [
          {
            model: Quotation,
            as: 'quotation',
            include: [
              {
                model: QuotationItem,
                as: 'items',
                include: [
                  {
                    model: Product,
                    as: 'product',
                    where: { supplierId: userId },
                  },
                ],
              },
            ],
          },
        ],
      }),
      Rating.findAll({
        where: { supplierId: userId },
        attributes: ['score', 'comment', 'createdAt'],
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['companyName', 'email'],
          },
        ],
      }),
    ]);

    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0
    );
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length
        : 0;
    const ordersByStatus = orders.reduce((acc: Record<string, number>, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    const recentRatings = ratings
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 5);

    return {
      supplier: user,
      metrics: {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalRatings: ratings.length,
        ordersByStatus,
        cnpjValidated: user.cnpjValidated,
        industrySector: user.industrySector,
      },
      products: products.slice(0, 10),
      recentRatings,
    };
  },
};
