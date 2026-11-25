import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import type { PricingTier, ShippingMethodSettings, ShippingMethod } from '../types';

/** The single settings row lives at this key; there is never a second one. */
export const SYSTEM_SETTINGS_ROW_ID = 1;

interface SystemSettingsAttributes {
  id: number;
  /** DECIMAL(5,4): Postgres returns it as a string, so read it through Number(). */
  taxRate: number | string;
  quotationValidityDays: number;
  shippingMethods: Record<ShippingMethod, ShippingMethodSettings>;
  pricingTiers: PricingTier[];
  /** Incremented on every write; an update must name the version it read. */
  version: number;
  updatedBy: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SystemSettingsCreationAttributes extends Optional<
  SystemSettingsAttributes,
  'updatedBy' | 'createdAt' | 'updatedAt'
> {}

class SystemSettings
  extends Model<SystemSettingsAttributes, SystemSettingsCreationAttributes>
  implements SystemSettingsAttributes
{
  public id!: number;
  public taxRate!: number | string;
  public quotationValidityDays!: number;
  public shippingMethods!: Record<ShippingMethod, ShippingMethodSettings>;
  public pricingTiers!: PricingTier[];
  public version!: number;
  public updatedBy!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SystemSettings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: SYSTEM_SETTINGS_ROW_ID,
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
    },
    quotationValidityDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    shippingMethods: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    pricingTiers: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'system_settings',
    timestamps: true,
  }
);

export default SystemSettings;
