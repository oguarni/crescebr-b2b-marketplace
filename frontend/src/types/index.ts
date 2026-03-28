import { Product, Quotation, Order } from '@shared/types';

// Frontend-specific type extensions

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface QuotationWithCalculation extends Quotation {
  calculation?: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    savings: number;
  };
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  cnpj: string;
  role: 'customer' | 'supplier';
}

export interface OrderWithHistory extends Order {
  timeline?: Array<{
    status: string;
    description: string;
    date: Date;
    canTransitionTo: string[];
  }>;
}

// Re-export shared types
export * from '@shared/types';
