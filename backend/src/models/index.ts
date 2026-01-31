import sequelize from '../config/database';
import User from './User';
import Product from './Product';
import Quotation from './Quotation';
import QuotationItem from './QuotationItem';
import Order from './Order';
import OrderStatusHistory from './OrderStatusHistory';
import Rating from './Rating';

// Set up associations
User.hasMany(Quotation, { foreignKey: 'userId', as: 'quotations' });
Quotation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Quotation.hasMany(QuotationItem, { foreignKey: 'quotationId', as: 'items' });
QuotationItem.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' });

Product.hasMany(QuotationItem, { foreignKey: 'productId', as: 'quotationItems' });
QuotationItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

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
