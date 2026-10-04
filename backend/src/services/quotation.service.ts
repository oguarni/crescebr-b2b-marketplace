import { quotationRepository, productRepository } from '../repositories';
import QuotationItem from '../models/QuotationItem';
import sequelize from '../config/database';

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
      throw Object.assign(new Error(`Products not found: ${missingIds.join(', ')}`), {
        statusCode: 400,
      });
    }

    // Validate minimum order quantities
    for (const item of input.items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.minimumOrderQuantity && item.quantity < product.minimumOrderQuantity) {
        throw Object.assign(
          new Error(
            `Quantity for product "${product.name}" must be at least ${product.minimumOrderQuantity} units. Current: ${item.quantity}`
          ),
          { statusCode: 400 }
        );
      }
    }

    return sequelize.transaction(async transaction => {
      const quotation = await quotationRepository.create(
        {
          companyId: input.companyId,
          status: 'pending',
          adminNotes: null,
        },
        { transaction }
      );

      // I settle each insert before rollback can begin on a failed item.
      for (const item of input.items) {
        await QuotationItem.create(
          {
            quotationId: quotation.id,
            productId: item.productId,
            quantity: item.quantity,
          },
          { transaction }
        );
      }

      return quotationRepository.findByIdWithItems(quotation.id, { transaction });
    });
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
      throw Object.assign(new Error('Quotation not found'), { statusCode: 404 });
    }

    // Access control
    if (userRole === 'customer' && quotation.companyId !== userId) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }

    // Suppliers may only access quotations that include at least one of their products
    if (userRole === 'supplier' && !this.containsSupplierProduct(quotation, userId)) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
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
      throw Object.assign(new Error('Quotation not found'), { statusCode: 404 });
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
      throw Object.assign(new Error('Quotation not found'), { statusCode: 404 });
    }

    // A supplier may only update quotations that include at least one of their products
    if (!this.containsSupplierProduct(quotation, supplierId)) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
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
      throw Object.assign(new Error('Quotation not found'), { statusCode: 404 });
    }

    // Update quotation with calculation data
    await quotationRepository.update(quotation, {
      status: 'processed',
    });

    return quotationRepository.findByIdWithItemsAndUser(id);
  }
}

export const quotationService = new QuotationService();
