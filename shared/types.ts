export interface PricingTier {
  minQuantity: number;
  maxQuantity: number | null;
  discount: number;
}

export interface Company {
  id: number;
  email: string;
  password?: string; // Optional for responses (excluded for security)
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

// Keep User interface for backward compatibility during migration
export interface User extends Company {}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  supplierId: number;
  /** Supplier display identity, included by the products API for catalog display. */
  supplier?: {
    id: number;
    companyName?: string | null;
    corporateName?: string | null;
  };
  tierPricing: PricingTier[];
  specifications: Record<string, any>;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTime: number;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'custom_order';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuotationItem {
  id: number;
  quotationId: number;
  productId: number;
  product: Product;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Quotation {
  id: number;
  companyId: number;
  company?: Omit<Company, 'password'>;
  user?: Omit<Company, 'password'>;
  items: QuotationItem[];
  status: 'pending' | 'processed' | 'completed' | 'rejected';
  adminNotes: string | null;
  totalAmount?: number;
  validUntil?: Date;
  requestedDeliveryDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Keep CartItem for backwards compatibility during migration
export interface CartItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  totalPrice: number;
}

export interface AuthTokenPayload {
  id: number;
  email: string;
  cnpj: string;
  role: 'customer' | 'admin' | 'supplier';
  companyType: 'buyer' | 'supplier' | 'both';
}

export interface LoginRequest {
  cnpj: string;
  password: string;
}

export interface LoginEmailRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
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
  role?: 'customer' | 'supplier';
  companyName: string;
  corporateName: string;
  cnpj: string;
  industrySector: string;
  companyType: 'buyer' | 'supplier' | 'both';
}

export interface AuthResponse {
  token: string;
  user: Omit<Company, 'password'>;
}

export interface Order {
  id: string;
  companyId: number;
  company?: Omit<Company, 'password'>;
  quotationId?: number;
  quotation?: Quotation;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  estimatedDeliveryDate?: Date;
  trackingNumber?: string;
  nfeAccessKey?: string;
  nfeUrl?: string;
  shippingAddress: string;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  product?: Product;
  quantity: number;
  price: number;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Rating {
  id: number;
  supplierId: number;
  buyerId: number;
  orderId?: string;
  score: number;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderStatusHistory {
  id: number;
  orderId: string;
  fromStatus?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  toStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  changedBy: number;
  notes?: string;
  createdAt?: Date;
}

export type ShippingMethod = 'standard' | 'express' | 'economy';

/** Freight rule for one shipping method: a flat fee plus a per-kilogram rate. */
export interface ShippingMethodSettings {
  baseRate: number;
  perKgRate: number;
  /** Calendar days from dispatch to delivery; a weekend arrival moves to Monday. */
  deliveryDays: number;
}

/**
 * The commercial parameters every quote is priced with. An administrator edits
 * them in the admin panel; the backend reads them on each calculation.
 */
export interface SystemSettings {
  /** Estimated tax as a fraction of the subtotal: 0.18 is 18%. */
  taxRate: number;
  /** How long a new quotation stays valid for conversion into an order. */
  quotationValidityDays: number;
  shippingMethods: Record<ShippingMethod, ShippingMethodSettings>;
  /** Volume discounts for products that do not define their own tiers. */
  pricingTiers: PricingTier[];
}

/** What GET/PUT /admin/settings return. */
export interface SystemSettingsRecord {
  settings: SystemSettings;
  defaults: SystemSettings;
  /** Optimistic-concurrency token; send it back unchanged with an update. */
  version: number;
  updatedAt: string | null;
  updatedBy: { id: number; email: string; companyName?: string } | null;
}

/** Headline figures for the supplier dashboard, aggregated over every order. */
export interface SupplierDashboardSummary {
  pendingQuotations: number;
  activeOrders: number;
  /** Orders that were not cancelled. */
  billableOrders: number;
  /** Sum of the totals of those orders. */
  orderVolume: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
