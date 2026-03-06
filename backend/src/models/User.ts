import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: number;
  email: string;
  password: string;
  cpf: string;
  address: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  contactPerson?: string;
  contactTitle?: string;
  companySize?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
  annualRevenue?: 'under_500k' | '500k_2m' | '2m_10m' | '10m_50m' | '50m_200m' | 'over_200m';
  certifications?: string[];
  website?: string;
  role: 'customer' | 'admin' | 'supplier';
  status: 'pending' | 'approved' | 'rejected';
  companyName: string;
  corporateName: string;
  cnpj: string;
  cnpjValidated: boolean;
  industrySector: string;
  companyType: 'buyer' | 'supplier' | 'both';
  averageRating?: number;
  totalRatings?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'status'
    | 'cnpjValidated'
    | 'averageRating'
    | 'totalRatings'
    | 'street'
    | 'number'
    | 'complement'
    | 'neighborhood'
    | 'city'
    | 'state'
    | 'zipCode'
    | 'country'
    | 'phone'
    | 'contactPerson'
    | 'contactTitle'
    | 'companySize'
    | 'annualRevenue'
    | 'certifications'
    | 'website'
    | 'createdAt'
    | 'updatedAt'
  > {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public cpf!: string;
  public address!: string;
  public street?: string;
  public number?: string;
  public complement?: string;
  public neighborhood?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public country?: string;
  public phone?: string;
  public contactPerson?: string;
  public contactTitle?: string;
  public companySize?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
  public annualRevenue?: 'under_500k' | '500k_2m' | '2m_10m' | '10m_50m' | '50m_200m' | 'over_200m';
  public certifications?: string[];
  public website?: string;
  public role!: 'customer' | 'admin' | 'supplier';
  public status!: 'pending' | 'approved' | 'rejected';
  public companyName!: string;
  public corporateName!: string;
  public cnpj!: string;
  public cnpjValidated!: boolean;
  public industrySector!: string;
  public companyType!: 'buyer' | 'supplier' | 'both';
  public averageRating?: number;
  public totalRatings?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: false,
      unique: true,
      validate: {
        len: [11, 14], // CPF can be with or without formatting
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('customer', 'admin', 'supplier'),
      allowNull: false,
      defaultValue: 'customer',
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255],
      },
    },
    corporateName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255],
      },
      comment: 'Legal corporate name for business registration',
    },
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [14, 18],
      },
    },
    cnpjValidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    industrySector: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [
          [
            'machinery',
            'raw_materials',
            'components',
            'electronics',
            'textiles',
            'chemicals',
            'automotive',
            'food_beverage',
            'construction',
            'pharmaceutical',
            'other',
          ],
        ],
      },
    },
    companyType: {
      type: DataTypes.ENUM('buyer', 'supplier', 'both'),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Street address',
    },
    number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Street number',
    },
    complement: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Address complement (apartment, suite, etc.)',
    },
    neighborhood: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Neighborhood/District',
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'City name',
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'State/Province',
    },
    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^\d{5}-?\d{3}$/i,
      },
      comment: 'ZIP/Postal code',
    },
    country: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Brazil',
      comment: 'Country name',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Primary phone number',
    },
    contactPerson: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Main contact person name',
    },
    contactTitle: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Contact person title/position',
    },
    companySize: {
      type: DataTypes.ENUM('micro', 'small', 'medium', 'large', 'enterprise'),
      allowNull: true,
    },
    annualRevenue: {
      type: DataTypes.ENUM('under_500k', '500k_2m', '2m_10m', '10m_50m', '50m_200m', 'over_200m'),
      allowNull: true,
    },
    certifications: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Business certifications and standards (ISO, etc.)',
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true,
      },
      comment: 'Company website URL',
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          user.password = await User.hashPassword(user.password);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          user.password = await User.hashPassword(user.password);
        }
      },
    },
  }
);

export default User;
