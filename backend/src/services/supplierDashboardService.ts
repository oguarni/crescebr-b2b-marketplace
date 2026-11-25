import { Op, fn, col } from 'sequelize';
import Order from '../models/Order';
import Quotation from '../models/Quotation';
import { quotationRepository } from '../repositories';
import type { SupplierDashboardSummary } from '../types';

/**
 * Quotations waiting on the supplier's response. A `processed` one has been
 * answered and waits on the buyer, so it is not the supplier's to-do.
 */
const OPEN_QUOTATION_STATUSES = ['pending'];
/** Orders the supplier still has to prepare or dispatch. */
const ACTIVE_ORDER_STATUSES = ['pending', 'processing'];

const EMPTY_SUMMARY: SupplierDashboardSummary = {
  pendingQuotations: 0,
  activeOrders: 0,
  billableOrders: 0,
  orderVolume: 0,
};

interface StatusTotalRow {
  status: string;
  count: number | string;
  total: number | string | null;
}

export const supplierDashboardService = {
  /**
   * Headline figures for a supplier, aggregated in SQL over every order that
   * includes one of their products.
   *
   * The dashboard used to derive these from the first page of the order list,
   * so past one page they were silently wrong, and cancelled orders counted
   * towards the volume. Orders do not store a per-supplier subtotal, so an
   * order shared with another supplier contributes its whole total.
   */
  async getSummary(supplierId: number): Promise<SupplierDashboardSummary> {
    const quotationIds = await quotationRepository.findIdsForSupplier(supplierId);
    if (quotationIds.length === 0) return EMPTY_SUMMARY;

    const [pendingQuotations, rows] = await Promise.all([
      Quotation.count({
        where: { id: { [Op.in]: quotationIds }, status: { [Op.in]: OPEN_QUOTATION_STATUSES } },
      }),
      Order.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('totalAmount')), 'total'],
        ],
        where: { quotationId: { [Op.in]: quotationIds } },
        group: ['status'],
        raw: true,
      }) as unknown as Promise<StatusTotalRow[]>,
    ]);

    // Postgres returns COUNT and SUM over DECIMAL as strings.
    const summary = rows.reduce(
      (acc, row) => {
        const count = Number(row.count);
        if (ACTIVE_ORDER_STATUSES.includes(row.status)) acc.activeOrders += count;
        if (row.status !== 'cancelled') {
          acc.billableOrders += count;
          acc.orderVolume += Number(row.total ?? 0);
        }
        return acc;
      },
      { ...EMPTY_SUMMARY, pendingQuotations }
    );

    return { ...summary, orderVolume: Math.round(summary.orderVolume * 100) / 100 };
  },
};
