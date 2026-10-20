/**
 * Display text for order statuses and order timeline entries.
 *
 * Statuses are stored, language-independent values; these helpers only choose
 * what is shown. Like `quotationStatus.ts`, they take `t` as a parameter so they
 * stay pure and usable outside a component.
 */

import type { Order } from '@shared/types';
import type { Translate } from '../contexts/LanguageContext';

export type OrderStatus = Order['status'];

const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export const isOrderStatus = (status: string): status is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(status);

/**
 * Renders an order status in the active language, falling back to the raw
 * value for a status this client does not know.
 *
 * @example
 * orderStatusLabel(t, 'shipped'); // 'Enviado' under pt
 */
export const orderStatusLabel = (t: Translate, status: string): string =>
  isOrderStatus(status) ? t(`supplierDashboard.orderStatus.${status}`) : status;

/**
 * Text for a timeline entry. The API's `description` is English and a fixed
 * function of the status (`OrderStatusService.getStatusDescription`, mirrored by
 * the demo handlers), so the status selects a translated sentence; the API text
 * is kept for a status this client does not know.
 */
export const orderTimelineDescription = (
  t: Translate,
  status: string,
  apiDescription: string
): string => (isOrderStatus(status) ? t(`orderTimeline.${status}`) : apiDescription);
