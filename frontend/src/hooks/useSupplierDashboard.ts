import { useCallback, useEffect, useState } from 'react';
import type { Order, Quotation, SupplierDashboardSummary } from '@shared/types';
import { quotationsService } from '../services/quotationsService';
import { ordersService } from '../services/ordersService';
import { browserLogger } from '../utils/browserLogger';
import { getErrorMessage } from '../utils/errorHandler';
import {
  isActiveOrder,
  isPendingQuote,
  MAX_PENDING_QUOTES,
  MAX_RECENT_ORDERS,
} from '../utils/supplierDashboard';

interface UseSupplierDashboardResult {
  /** Null until the first load succeeds. */
  summary: SupplierDashboardSummary | null;
  pendingQuotes: Quotation[];
  recentOrders: Order[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads the supplier dashboard: headline figures from the API's aggregate, and
 * short previews of the quotation queue and of the orders still in progress.
 *
 * The figures come from `GET /orders/supplier/summary`, computed over every
 * order. They used to be summed from the first page of the order list, so they
 * were wrong past one page and counted cancelled orders as revenue.
 *
 * @example
 * const { summary, pendingQuotes, recentOrders, error, reload } = useSupplierDashboard();
 */
export const useSupplierDashboard = (): UseSupplierDashboardResult => {
  const [summary, setSummary] = useState<SupplierDashboardSummary | null>(null);
  const [pendingQuotes, setPendingQuotes] = useState<Quotation[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Supplier-scoped endpoints: each returns only what includes this
      // supplier's products, filtered server-side.
      const [totals, quotes, ordersResult] = await Promise.all([
        ordersService.getSupplierSummary(),
        quotationsService.getSupplierQuotations(),
        ordersService.getUserOrders(),
      ]);

      setSummary(totals);
      setPendingQuotes(quotes.filter(isPendingQuote).slice(0, MAX_PENDING_QUOTES));
      setRecentOrders(ordersResult.orders.filter(isActiveOrder).slice(0, MAX_RECENT_ORDERS));
    } catch (loadError) {
      browserLogger.error('Failed to load dashboard data', { error: loadError });
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { summary, pendingQuotes, recentOrders, loading, error, reload };
};
