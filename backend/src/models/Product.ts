import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PricingTier {
  minQuantity: number;
  maxQuantity: number | null;
  discount: number;
}

export interface ProductAttributes {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  supplierId: number;
  tierPricing: PricingTier[];
  specifications: Record<string, any>;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTime: number;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'custom_order';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductCreationAttributes
  extends Optional<
    ProductAttributes,
    'id' | 'tierPricing' | 'availability' | 'leadTime' | 'createdAt' | 'updatedAt'
  > { }

class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public price!: number;
  public imageUrl!: string;
  public category!: string;
  public supplierId!: number;
  public tierPricing!: PricingTier[];
  public specifications!: Record<string, any>;
  public unitPrice!: number;
  public minimumOrderQuantity!: number;
  public leadTime!: number;
  public availability!: 'in_stock' | 'out_of_stock' | 'limited' | 'custom_order';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0,
      },
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    tierPricing: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'JSON field for quantity-based pricing tiers',
    },
    specifications: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'JSON field for technical specifications and product details',
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0,
      },
      comment: 'Price per unit for bulk ordering',
    },
    minimumOrderQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
      comment: 'Minimum quantity required for orders',
    },
    leadTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      validate: {
        min: 0,
      },
      comment: 'Lead time in days for product delivery',
    },
    availability: {
      type: DataTypes.ENUM('in_stock', 'out_of_stock', 'limited', 'custom_order'),
      allowNull: false,
      defaultValue: 'in_stock',
      comment: 'Product availability status',
    },
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,
  }
);

export default Product;
