/**
 * A supplier's response to a quotation request.
 *
 * CresceBR prices quotations automatically: catalogue price, the product's or
 * the platform's volume tiers, and the freight and tax the administrator sets.
 * Responding is the supplier's review of that request: it moves the quotation
 * to `processed`, which lets the buyer turn it into an order, and records the
 * supplier's notes. The response dialog used to offer editable prices,
 * availability and payment terms that were never sent anywhere; it now shows
 * what the buyer will actually be quoted and edits only what is stored.
 */

import type { Quotation } from '@shared/types';

export interface QuotationResponseDraft {
  quotationId: number;
  notes: string;
}

export const EMPTY_QUOTATION_RESPONSE: QuotationResponseDraft = { quotationId: 0, notes: '' };

export const buildResponseDraft = (quotation: Quotation): QuotationResponseDraft => ({
  quotationId: quotation.id,
  notes: '',
});

export interface ResponseLine {
  productId: number;
  name: string;
  quantity: number;
  /** Catalogue unit price, before any volume discount. */
  unitPrice: number;
  lineTotal: number;
  leadTime: number | undefined;
  availability: string | undefined;
}

/**
 * The lines of a request that are this supplier's own products. A request can
 * mix suppliers; the others' lines are neither theirs to review nor to see
 * priced.
 *
 * @example responseLines(quotation, user.id).map(line => line.name);
 */
export const responseLines = (quotation: Quotation, supplierId: number): ResponseLine[] =>
  (quotation.items ?? [])
    .filter(item => item.product?.supplierId === supplierId)
    .map(item => {
      const unitPrice = Number(item.product?.unitPrice ?? item.product?.price ?? 0);
      return {
        productId: item.productId,
        name: item.product?.name ?? '',
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        leadTime: item.product?.leadTime,
        availability: item.product?.availability,
      };
    });
