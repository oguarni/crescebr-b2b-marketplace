import { quotationRepository, productRepository } from '../repositories';
import QuotationItem from '../models/QuotationItem';

interface CreateQuotationInput {
  items: { productId: number; quantity: number }[];
  companyId: number;
}

class QuotationService {
  async validateAndCreate(input: CreateQuotationInput) {
    // Validate all products exist
    const productIds = input.items.map(item => item.productId);
    const products = await productRepository.findByIds(productIds);

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw new Error(`Products not found: ${missingIds.join(', ')}`);
    }

    // Validate minimum order quantities
    for (const item of input.items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.minimumOrderQuantity && item.quantity < product.minimumOrderQuantity) {
        throw new Error(
          `Quantity for product "${product.name}" must be at least ${product.minimumOrderQuantity} units. Current: ${item.quantity}`
        );
      }
    }

    // Create quotation
    const quotation = await quotationRepository.create({
      companyId: input.companyId,
      status: 'pending',
      adminNotes: null,
    });

    // Create quotation items
    await Promise.all(
      input.items.map(item =>
        QuotationItem.create({
          quotationId: quotation.id,
          productId: item.productId,
          quantity: item.quantity,
        })
      )
    );

    // Return full quotation with items
    return quotationRepository.findByIdWithItems(quotation.id);
  }

  async getForCustomer(companyId: number) {
    return quotationRepository.findAllForCompany(companyId);
  }

  async getForSupplier(supplierId: number) {
    return quotationRepository.findAllForSupplier(supplierId);
  }

  async getById(id: number, userId: number, userRole: string) {
    const quotation = await quotationRepository.findByIdWithItemsAndUser(id);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // Access control
    if (userRole === 'customer' && quotation.companyId !== userId) {
      throw new Error('Access denied');
    }

    // Suppliers may only access quotations that include at least one of their products
    if (userRole === 'supplier' && !this.containsSupplierProduct(quotation, userId)) {
      throw new Error('Access denied');
    }

    return quotation;
  }

  async getAllForAdmin() {
    return quotationRepository.findAll();
  }

  async updateByAdmin(
    id: number,
    data: {
      status?: 'pending' | 'processed' | 'completed' | 'rejected';
      adminNotes?: string | null;
    }
  ) {
    const quotation = await quotationRepository.findById(id);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    await quotationRepository.update(quotation, {
      status: data.status || quotation.status,
      adminNotes: data.adminNotes !== undefined ? data.adminNotes : quotation.adminNotes,
    });

    return quotationRepository.findByIdWithItemsAndUser(id);
  }

  async updateBySupplier(
    id: number,
    supplierId: number,
    data: {
      status?: 'pending' | 'processed' | 'completed' | 'rejected';
      adminNotes?: string | null;
    }
  ) {
    const quotation = await quotationRepository.findByIdWithItems(id);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // A supplier may only update quotations that include at least one of their products
    if (!this.containsSupplierProduct(quotation, supplierId)) {
      throw new Error('Access denied');
    }

    await quotationRepository.update(quotation, {
      status: data.status || quotation.status,
      adminNotes: data.adminNotes !== undefined ? data.adminNotes : quotation.adminNotes,
    });

    return quotationRepository.findByIdWithItemsAndUser(id);
  }

  // Checks whether a quotation (loaded with its items and products) contains at
  // least one product owned by the given supplier.
  private containsSupplierProduct(quotation: unknown, supplierId: number): boolean {
    const items =
      (quotation as { items?: Array<{ product?: { supplierId?: number } }> }).items ?? [];
    return items.some(item => item.product?.supplierId === supplierId);
  }

  async processWithCalculations(id: number, _calculations: Record<string, unknown>) {
    const quotation = await quotationRepository.findById(id);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // Update quotation with calculation data
    await quotationRepository.update(quotation, {
      status: 'processed',
    });

    return quotationRepository.findByIdWithItemsAndUser(id);
  }
}

export const quotationService = new QuotationService();
