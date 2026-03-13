import { Op, Sequelize } from 'sequelize';
import Rating from '../models/Rating';
import Order from '../models/Order';
import User from '../models/User';

const RATING_WITH_USERS = [
  { model: User, as: 'supplier', attributes: ['id', 'companyName', 'email'] },
  { model: User, as: 'buyer', attributes: ['id', 'companyName', 'email'] },
];

export const ratingsService = {
  async createRating(
    buyerId: number,
    data: { supplierId: number; orderId?: string; score: number; comment?: string }
  ) {
    const supplier = await User.findOne({ where: { id: data.supplierId, role: 'supplier' } });
    if (!supplier) {
      throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });
    }

    if (data.orderId) {
      const order = await Order.findOne({
        where: { id: data.orderId, companyId: buyerId, status: 'delivered' },
        include: [{ model: User, as: 'user', where: { id: buyerId } }],
      });
      if (!order) {
        throw Object.assign(new Error('You can only rate suppliers from completed orders'), {
          statusCode: 403,
        });
      }
      const existing = await Rating.findOne({ where: { orderId: data.orderId, buyerId } });
      if (existing) {
        throw Object.assign(new Error('You have already rated this order'), { statusCode: 400 });
      }
    } else {
      const completedOrder = await Order.findOne({
        where: { companyId: buyerId, status: 'delivered' },
        include: [{ model: User, as: 'supplier', where: { id: data.supplierId } }],
      });
      if (!completedOrder) {
        throw Object.assign(new Error('You can only rate suppliers from completed orders'), {
          statusCode: 403,
        });
      }
    }

    const rating = await Rating.create({
      supplierId: data.supplierId,
      buyerId,
      orderId: data.orderId || undefined,
      score: data.score,
      comment: data.comment || undefined,
    });

    return Rating.findByPk(rating.id, { include: RATING_WITH_USERS });
  },

  async getSupplierRatings(supplierId: number | string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const { count, rows: ratings } = await Rating.findAndCountAll({
      where: { supplierId },
      include: [{ model: User, as: 'buyer', attributes: ['id', 'companyName'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const averageScore =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;

    const scoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      scoreDistribution[r.score as keyof typeof scoreDistribution]++;
    });

    return {
      ratings,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
      averageScore: parseFloat(averageScore.toFixed(2)),
      totalRatings: count,
      scoreDistribution,
    };
  },

  async updateRating(
    ratingId: string,
    buyerId: number,
    data: { score?: number; comment?: string }
  ) {
    const rating = await Rating.findOne({ where: { id: ratingId, buyerId } });
    if (!rating) {
      throw Object.assign(new Error('Rating not found or you do not have permission to edit it'), {
        statusCode: 404,
      });
    }

    const ratingAge = Date.now() - rating.createdAt.getTime();
    if (ratingAge > 24 * 60 * 60 * 1000) {
      throw Object.assign(new Error('Ratings can only be edited within 24 hours of creation'), {
        statusCode: 400,
      });
    }

    await rating.update({
      score: data.score ?? rating.score,
      comment: data.comment !== undefined ? data.comment : rating.comment,
    });

    return Rating.findByPk(rating.id, { include: RATING_WITH_USERS });
  },

  async deleteRating(ratingId: string, buyerId: number, userRole: string) {
    const whereClause: Record<string, unknown> = { id: ratingId };
    if (userRole !== 'admin') {
      whereClause.buyerId = buyerId;
    }

    const rating = await Rating.findOne({ where: whereClause });
    if (!rating) {
      throw Object.assign(
        new Error('Rating not found or you do not have permission to delete it'),
        { statusCode: 404 }
      );
    }

    await rating.destroy();
  },

  async getTopSuppliers(limit: number) {
    const topSuppliers = await User.findAll({
      where: { role: 'supplier', status: 'approved' },
      attributes: [
        'id',
        'companyName',
        'email',
        [Sequelize.fn('AVG', Sequelize.col('supplierRatings.score')), 'averageRating'],
        [Sequelize.fn('COUNT', Sequelize.col('supplierRatings.id')), 'totalRatings'],
      ],
      include: [{ model: Rating, as: 'supplierRatings', attributes: [] }],
      group: ['User.id'],
      having: Sequelize.where(
        Sequelize.fn('COUNT', Sequelize.col('supplierRatings.id')),
        Op.gte,
        3
      ),
      order: [
        [Sequelize.fn('AVG', Sequelize.col('supplierRatings.score')), 'DESC'],
        [Sequelize.fn('COUNT', Sequelize.col('supplierRatings.id')), 'DESC'],
      ],
      limit,
      subQuery: false,
      raw: true,
    });

    return topSuppliers.map(s => ({
      id: s.id,
      companyName: s.companyName,
      email: s.email,
      averageRating: parseFloat(Number((s as any).averageRating).toFixed(2)),
      totalRatings: (s as any).totalRatings ? Number((s as any).totalRatings) : 0,
    }));
  },

  async getBuyerRatings(buyerId: number, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const { count, rows: ratings } = await Rating.findAndCountAll({
      where: { buyerId },
      include: [{ model: User, as: 'supplier', attributes: ['id', 'companyName'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      ratings,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  },
};
