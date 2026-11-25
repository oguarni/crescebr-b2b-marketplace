/**
 * Derivations behind the supplier dashboard.
 *
 * Everything here is pure: the hook fetches, these functions decide what the
 * numbers and the visual treatment should be.
 */

import type { Order, Quotation } from '@shared/types';

/** How many of each list the dashboard previews before "view all". */
export const MAX_PENDING_QUOTES = 4;
export const MAX_RECENT_ORDERS = 3;

// Awaiting the supplier's response; a `processed` quotation waits on the buyer.
const PENDING_QUOTE_STATUSES = ['pending'];
const ACTIVE_ORDER_STATUSES = ['pending', 'processing'];

export const isPendingQuote = (quote: Quotation): boolean =>
  PENDING_QUOTE_STATUSES.includes(quote.status);

export const isActiveOrder = (order: Order): boolean =>
  ACTIVE_ORDER_STATUSES.includes(order.status);

/** A quote awaiting a first response versus one already sent back for review. */
export type QuoteDisplayStatus = 'New' | 'Review';

export const quoteDisplayStatus = (status: string): QuoteDisplayStatus =>
  status === 'pending' ? 'New' : 'Review';

interface ChipPalette {
  bgcolor: string;
  color: string;
  borderColor: string;
}

// Fixed hex values rather than theme tokens: these badges are intentionally
// flatter and lighter than the theme's semantic colours at this density.
export const QUOTE_STATUS_CHIP_STYLES: Record<QuoteDisplayStatus, ChipPalette> = {
  New: { bgcolor: '#e3f2fd', color: '#1565c0', borderColor: '#bbdefb' },
  Review: { bgcolor: '#fff3e0', color: '#e65100', borderColor: '#ffe0b2' },
};

/**
 * Sums, at catalogue price, the lines of a quotation that are this supplier's
 * own products. A request can mix suppliers; the others' lines are not theirs
 * to quote.
 */
export const quoteTotalValue = (quote: Quotation, supplierId: number): number =>
  quote.items
    .filter(item => item.product?.supplierId === supplierId)
    .reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);

interface OrderProgressStyle {
  progress: number;
  color: string;
  iconBg: string;
  iconColor: string;
}

const ORDER_PROGRESS_STYLES: Record<string, OrderProgressStyle> = {
  delivered: {
    progress: 100,
    color: 'primary.main',
    iconBg: 'secondary.50',
    iconColor: 'secondary.main',
  },
  processing: {
    progress: 25,
    color: 'warning.main',
    iconBg: 'warning.50',
    iconColor: 'warning.main',
  },
};

// Anything not delivered or processing is treated as in-between: shipped, ready
// for pickup and similar states all sit at three quarters of the bar.
const DEFAULT_ORDER_PROGRESS: OrderProgressStyle = {
  progress: 75,
  color: 'success.main',
  iconBg: 'primary.50',
  iconColor: 'primary.main',
};

/** @example orderProgressStyle('processing').progress; // 25 */
export const orderProgressStyle = (status: string): OrderProgressStyle =>
  ORDER_PROGRESS_STYLES[status] ?? DEFAULT_ORDER_PROGRESS;

/** The dashboard shows dates in the active UI language, unlike the BRL amounts beside them. */
export const dateLocaleFor = (language: string): string => (language === 'pt' ? 'pt-BR' : 'en-US');
