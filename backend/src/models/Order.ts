import { DataTypes, Model, Optional, UUIDV4 } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Quotation from './Quotation';

interface OrderAttributes {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  companyId: number;
  quotationId: number;
  totalAmount: number;
  estimatedDeliveryDate?: Date;
  trackingNumber?: string;
  nfeAccessKey?: string;
  nfeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OrderCreationAttributes
  extends Optional<
    OrderAttributes,
    | 'id'
    | 'status'
    | 'estimatedDeliveryDate'
    | 'trackingNumber'
    | 'nfeAccessKey'
    | 'nfeUrl'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: string;
  public status!: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  public companyId!: number;
  public quotationId!: number;
  public totalAmount!: number;
  public estimatedDeliveryDate?: Date;
  public trackingNumber?: string;
  public nfeAccessKey?: string;
  public nfeUrl?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      comment: 'Reference to the company that placed the order',
    },
    quotationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Quotation,
        key: 'id',
      },
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    estimatedDeliveryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    trackingNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    nfeAccessKey: {
      type: DataTypes.STRING(44),
      allowNull: true,
      comment: 'Brazilian NF-e access key — exactly 44 numeric digits',
    },
    nfeUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL pointing to the NF-e document',
    },
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: true,
  }
);

export default Order;
