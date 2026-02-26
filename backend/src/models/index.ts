import sequelize from '../config/database';
import User from './User';
import Product from './Product';
import Quotation from './Quotation';
import QuotationItem from './QuotationItem';
import Order from './Order';
import OrderStatusHistory from './OrderStatusHistory';
import Rating from './Rating';

// Set up associations

// User <-> Quotation
User.hasMany(Quotation, { foreignKey: 'userId', as: 'quotations' });
Quotation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Quotation <-> QuotationItem
Quotation.hasMany(QuotationItem, { foreignKey: 'quotationId', as: 'items' });
QuotationItem.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' });

// Product <-> QuotationItem
Product.hasMany(QuotationItem, { foreignKey: 'productId', as: 'quotationItems' });
QuotationItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// User <-> Product (supplier)
User.hasMany(Product, { foreignKey: 'supplierId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'supplierId', as: 'supplier' });

// Order <-> User (buyer/company)
Order.belongsTo(User, { foreignKey: 'companyId', as: 'buyer' });
User.hasMany(Order, { foreignKey: 'companyId', as: 'orders' });

// Order <-> Quotation
Order.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' });
Quotation.hasOne(Order, { foreignKey: 'quotationId', as: 'order' });

// Order <-> OrderStatusHistory
Order.hasMany(OrderStatusHistory, { foreignKey: 'orderId', as: 'statusHistory' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Rating <-> User (supplier and buyer)
Rating.belongsTo(User, { foreignKey: 'supplierId', as: 'supplier' });
Rating.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
User.hasMany(Rating, { foreignKey: 'supplierId', as: 'supplierRatings' });
User.hasMany(Rating, { foreignKey: 'buyerId', as: 'buyerRatings' });

const models = {
  User,
  Product,
  Quotation,
  QuotationItem,
  Order,
  OrderStatusHistory,
  Rating,
  sequelize,
};

export const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    console.log('Use migrations to manage database schema changes: npx sequelize-cli db:migrate');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export default models;
