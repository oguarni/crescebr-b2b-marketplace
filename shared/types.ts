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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
