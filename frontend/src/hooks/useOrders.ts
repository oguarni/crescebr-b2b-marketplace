import { useState, useEffect, useCallback } from 'react';
import { ordersService } from '../services/ordersService';
import { Order } from '@shared/types';
import { getErrorMessage } from '../utils/errorHandler';

interface UseOrdersOptions {
  autoFetch?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

export const useOrders = (options: UseOrdersOptions = { autoFetch: true }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersService.getUserOrders({
        status: options.status,
        page: options.page,
        limit: options.limit,
      });
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.page, options.limit]);

  useEffect(() => {
    if (options.autoFetch) {
      fetchOrders();
    }
  }, [options.autoFetch, fetchOrders]);

  return { orders, loading, error, pagination, refetch: fetchOrders };
};

export const useOrder = (id: string) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await ordersService.getOrderById(id);
        setOrder(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  return { order, loading, error };
};
