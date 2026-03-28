import User from '../models/User';
import { CNPJService } from './cnpjService';

function businessError(message: string): Error {
  const err = new Error(message);
  (err as any).statusCode = 400;
  return err;
}

interface RegisterInput {
  email: string;
  password: string;
  cpf: string;
  address: string;
  companyName: string;
  corporateName: string;
  cnpj: string;
  industrySector: string;
  companyType: 'buyer' | 'supplier' | 'both';
}

interface SupplierRegisterInput {
  email: string;
  password: string;
  cpf: string;
  address: string;
  companyName: string;
  corporateName?: string;
  cnpj: string;
  industrySector?: string;
}

interface CnpjValidationResult {
  valid: boolean;
  companyName?: string;
  fantasyName?: string;
  city?: string;
  state?: string;
  address?: string;
  error?: string;
}

export const authService = {
  async register(input: RegisterInput): Promise<User> {
    const existingEmail = await User.findOne({ where: { email: input.email } });
    if (existingEmail) throw businessError('User with this email already exists');

    const existingCpf = await User.findOne({ where: { cpf: input.cpf } });
    if (existingCpf) throw businessError('User with this CPF already exists');

    const existingCnpj = await User.findOne({ where: { cnpj: input.cnpj } });
    if (existingCnpj) throw businessError('Company with this CNPJ already exists');

    const cnpjValidation = await CNPJService.validateCNPJWithAPI(input.cnpj);
    if (!cnpjValidation.valid) {
      throw businessError(cnpjValidation.error || 'Invalid CNPJ provided');
    }

    return User.create({
      email: input.email,
      password: input.password,
      cpf: input.cpf,
      address: cnpjValidation.address || input.address,
      companyName: cnpjValidation.companyName || input.companyName,
      corporateName: cnpjValidation.companyName || input.corporateName,
      cnpj: CNPJService.formatCNPJ(input.cnpj),
      industrySector: input.industrySector,
      companyType: input.companyType,
      role: input.companyType === 'supplier' ? 'supplier' : 'customer',
      status: input.companyType === 'supplier' ? 'pending' : 'approved',
    });
  },

  async registerSupplier(
    input: SupplierRegisterInput
  ): Promise<{ user: User; cnpjValidation: CnpjValidationResult }> {
    const existingEmail = await User.findOne({ where: { email: input.email } });
    if (existingEmail) throw businessError('User with this email already exists');

    const existingCpf = await User.findOne({ where: { cpf: input.cpf } });
    if (existingCpf) throw businessError('User with this CPF already exists');

    const existingCnpj = await User.findOne({ where: { cnpj: input.cnpj } });
    if (existingCnpj) throw businessError('Company with this CNPJ already exists');

    const cnpjValidation = await CNPJService.validateCNPJWithAPI(input.cnpj);
    if (!cnpjValidation.valid) {
      throw businessError(cnpjValidation.error || 'Invalid CNPJ provided');
    }

    const user = await User.create({
      email: input.email,
      password: input.password,
      cpf: input.cpf,
      address: cnpjValidation.address || input.address,
      companyName: cnpjValidation.companyName || input.companyName,
      corporateName: (cnpjValidation.companyName || input.corporateName) as string,
      cnpj: CNPJService.formatCNPJ(input.cnpj),
      industrySector: input.industrySector || 'other',
      companyType: 'supplier',
      role: 'supplier',
      status: 'pending',
    });

    return { user, cnpjValidation };
  },

  async loginByCnpj(cnpj: string, password: string): Promise<User | null> {
    const user = await User.findOne({ where: { cnpj } });
    if (!user) return null;

    const isValid = await user.comparePassword(password);
    if (!isValid) return null;

    return user;
  },

  async loginByEmail(email: string, password: string): Promise<User | null> {
    const user = await User.findOne({ where: { email } });
    if (!user) return null;

    const isValid = await user.comparePassword(password);
    if (!isValid) return null;

    return user;
  },

  async getProfile(userId: number): Promise<User | null> {
    return User.findByPk(userId);
  },

  async getUserById(userId: number): Promise<User | null> {
    return User.findByPk(userId);
  },
};
