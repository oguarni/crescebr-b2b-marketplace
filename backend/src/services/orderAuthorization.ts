import Product from '../models/Product';
import QuotationItem from '../models/QuotationItem';

/**
 * Thrown when the authenticated principal is not allowed to read or mutate a
 * specific order. I preserve the public message and carry HTTP 403 explicitly
 * so internal failures cannot be mistaken for ownership denials.
 */
export const ORDER_ACCESS_DENIED_MESSAGE = 'Access denied';

export class OrderAccessDeniedError extends Error {
  readonly statusCode = 403;

  constructor(message: string = ORDER_ACCESS_DENIED_MESSAGE) {
    super(message);
    this.name = 'OrderAccessDeniedError';
  }
}

/** Minimal shape of an order needed to decide access; keeps this module free of the Sequelize model. */
export interface OrderOwnershipRef {
  companyId: number;
  quotationId: number;
}

/**
 * Whether at least one product inside the quotation belongs to the supplier.
 *
 * Suppliers never own an order row (`Order.companyId` is the *buyer*), so the
 * only defensible link between a supplier and an order is the products they
 * sell inside the originating quotation. Resolved with a single scoped query
 * instead of trusting eager-loaded includes, so callers cannot forget them.
 *
 * @example
 * await supplierSuppliesQuotation(42, req.user.id); // => true | false
 */
export const supplierSuppliesQuotation = async (
  quotationId: number,
  supplierId: number
): Promise<boolean> => {
  const match = await QuotationItem.findOne({
    attributes: ['id'],
    where: { quotationId },
    include: [
      {
        model: Product,
        as: 'product',
        attributes: [],
        where: { supplierId },
        required: true,
      },
    ],
  });

  // Truthiness, not `!== null`: any absent/undefined result must read as "no
  // link" so an unexpected driver return value cannot grant access.
  return Boolean(match);
};

/**
 * Authorize a principal against one specific order. Fails closed: any role that
 * is not explicitly handled is denied.
 *
 * - `admin`    — every order.
 * - `customer` — only orders they placed (`Order.companyId`).
 * - `supplier` — only orders whose quotation contains one of their products.
 *
 * @throws OrderAccessDeniedError when the principal may not touch the order.
 *
 * @example
 * await assertOrderAccess(order, req.user.id, req.user.role);
 */
export const assertOrderAccess = async (
  order: OrderOwnershipRef,
  requesterId: number,
  requesterRole: string
): Promise<void> => {
  if (requesterRole === 'admin') {
    return;
  }

  if (requesterRole === 'customer') {
    if (order.companyId === requesterId) {
      return;
    }
    throw new OrderAccessDeniedError();
  }

  if (requesterRole === 'supplier') {
    if (await supplierSuppliesQuotation(order.quotationId, requesterId)) {
      return;
    }
    throw new OrderAccessDeniedError();
  }

  throw new OrderAccessDeniedError();
};
