import { Quotation, ApiResponse } from '@shared/types';
import { apiService } from './api';

interface CreateQuotationRequest {
  items: {
    productId: number;
    quantity: number;
  }[];
}

interface UpdateQuotationRequest {
  status?: 'pending' | 'processed' | 'completed' | 'rejected';
  adminNotes?: string;
}

interface CompareSupplierQuotesRequest {
  productId: number;
  quantity: number;
  buyerLocation?: string;
  supplierIds?: number[];
  shippingMethod?: 'standard' | 'express' | 'economy';
}

interface SupplierQuote {
  supplier: {
    id: number;
    companyName: string;
    corporateName: string;
    averageRating?: number;
    totalRatings?: number;
    industrySector: string;
  };
  quote: {
    productId: number;
    basePrice: number;
    quantity: number;
    tierDiscount: number;
    unitPriceAfterDiscount: number;
    subtotal: number;
    shippingCost: number;
    tax: number;
    total: number;
    savings: number;
    appliedTier: Record<string, unknown> | null;
  } | null;
  error?: string;
}

interface CompareSupplierQuotesResponse {
  quotes: SupplierQuote[];
  productId: number;
  quantity: number;
  buyerLocation?: string;
  shippingMethod: string;
}

interface CalculateQuoteRequest {
  items: {
    productId: number;
    quantity: number;
  }[];
  buyerLocation?: string;
  supplierLocation?: string;
  shippingMethod?: 'standard' | 'express' | 'economy';
}

interface QuoteCalculationResult {
  productId: number;
  basePrice: number;
  quantity: number;
  tierDiscount: number;
  unitPriceAfterDiscount: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  savings: number;
  appliedTier: {
    minQuantity: number;
    maxQuantity: number | null;
    discount: number;
  } | null;
}

interface QuoteComparisonResult {
  items: QuoteCalculationResult[];
  totalSubtotal: number;
  totalShipping: number;
  totalTax: number;
  grandTotal: number;
  totalSavings: number;
}

interface CalculateQuoteResponse {
  calculations: QuoteComparisonResult;
  summary: {
    totalItems: number;
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
    savings: string;
  };
}

class QuotationsService {
  // Customer methods
  async createQuotation(quotationData: CreateQuotationRequest): Promise<Quotation> {
    const response = await apiService.post<ApiResponse<Quotation>>('/quotations', quotationData);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create quotation');
    }

    return response.data;
  }

  async getCustomerQuotations(): Promise<Quotation[]> {
    const response = await apiService.get<ApiResponse<Quotation[]>>('/quotations');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch quotations');
    }

    return response.data;
  }

  async getQuotationById(id: number): Promise<Quotation> {
    const response = await apiService.get<ApiResponse<Quotation>>(`/quotations/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch quotation');
    }

    return response.data;
  }

  async calculateQuote(
    items: { productId: number; quantity: number }[],
    options?: {
      buyerLocation?: string;
      supplierLocation?: string;
      shippingMethod?: 'standard' | 'express' | 'economy';
    }
  ): Promise<CalculateQuoteResponse> {
    const requestData: CalculateQuoteRequest = {
      items,
      ...options,
    };

    const response = await apiService.post<ApiResponse<CalculateQuoteResponse>>(
      '/quotations/calculate',
      requestData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to calculate quote');
    }

    return response.data;
  }

  // Admin methods
  async getAllQuotations(): Promise<Quotation[]> {
    const response = await apiService.get<ApiResponse<Quotation[]>>('/quotations/admin/all');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch all quotations');
    }

    return response.data;
  }

  async updateQuotation(id: number, updateData: UpdateQuotationRequest): Promise<Quotation> {
    const response = await apiService.put<ApiResponse<Quotation>>(
      `/quotations/admin/${id}`,
      updateData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update quotation');
    }

    return response.data;
  }

  // Quote comparison methods
  async compareSupplierQuotes(
    requestData: CompareSupplierQuotesRequest
  ): Promise<CompareSupplierQuotesResponse> {
    const response = await apiService.post<ApiResponse<CompareSupplierQuotesResponse>>(
      '/quotations/compare-suppliers',
      requestData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to compare supplier quotes');
    }

    return response.data;
  }
}

export const quotationsService = new QuotationsService();
