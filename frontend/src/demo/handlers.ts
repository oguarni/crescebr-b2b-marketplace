/**
 * Endpoint implementations for the browser-side demo API.
 *
 * Each handler mirrors the response envelope and the role rules of its Express
 * counterpart under `backend/src/routes`, because the pages consuming them are
 * the real ones. Routes are matched first-wins, so literal paths are listed
 * before their `:id` siblings.
 */

import type { Company, Order, Product, Quotation, QuotationItem } from '@shared/types';
import { DEMO_PASSWORDS } from './data';
import { getState, persist } from './store';
import {
  calculateQuoteComparison,
  calculateQuoteForItem,
  type QuoteCalculationResult,
  type ShippingMethod,
} from './pricing';

export interface DemoRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
  token: string | null;
  params: Record<string, string>;
}

export interface DemoResponse {
  status: number;
  body: unknown;
}

/** Thrown by handlers to produce a non-2xx response with the backend's shape. */
export class DemoHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'DemoHttpError';
  }
}

const ok = <T>(data: T, message?: string): DemoResponse => ({
  status: 200,
  body: { success: true, data, ...(message ? { message } : {}) },
});

const created = <T>(data: T): DemoResponse => ({ status: 201, body: { success: true, data } });

// --- session -----------------------------------------------------------------

const TOKEN_PREFIX = 'demo.';

const issueToken = (company: Company): string =>
  `${TOKEN_PREFIX}${btoa(unescape(encodeURIComponent(JSON.stringify({ id: company.id }))))}`;

const companyFromToken = (token: string | null): Company | null => {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  try {
    const { id } = JSON.parse(decodeURIComponent(escape(atob(token.slice(TOKEN_PREFIX.length)))));
    return getState().companies.find(c => c.id === id) ?? null;
  } catch {
    return null;
  }
};

const requireAuth = (req: DemoRequest): Company => {
  const company = companyFromToken(req.token);
  if (!company) throw new DemoHttpError(401, 'Authentication required');
  return company;
};

const requireRole = (req: DemoRequest, ...roles: Company['role'][]): Company => {
  const company = requireAuth(req);
  if (!roles.includes(company.role)) throw new DemoHttpError(403, 'Access denied');
  return company;
};

const publicCompany = (company: Company): Omit<Company, 'password'> => {
  const { password: _password, ...rest } = company;
  return rest;
};

// --- lookups -----------------------------------------------------------------

const productById = (id: number): Product => {
  const product = getState().products.find(p => p.id === id);
  if (!product) throw new DemoHttpError(404, 'Product not found');
  return product;
};

const quotationById = (id: number): Quotation => {
  const quotation = getState().quotations.find(q => q.id === id);
  if (!quotation) throw new DemoHttpError(404, 'Quotation not found');
  return quotation;
};

const orderById = (id: string): Order => {
  const order = getState().orders.find(o => o.id === id);
  if (!order) throw new DemoHttpError(404, 'Order not found');
  return order;
};

const withCompany = (quotation: Quotation): Quotation => {
  const company = getState().companies.find(c => c.id === quotation.companyId);
  const identity = company ? publicCompany(company) : undefined;
  return { ...quotation, company: identity, user: identity };
};

/** A quotation belongs to a supplier when it contains one of their products. */
const isSuppliersQuotation = (quotation: Quotation, supplierId: number): boolean =>
  quotation.items.some(item => item.product?.supplierId === supplierId);

const paginate = <T>(rows: T[], query: URLSearchParams, defaultLimit = 10) => {
  const page = Math.max(1, Number(query.get('page')) || 1);
  const limit = Math.max(1, Number(query.get('limit')) || defaultLimit);
  const start = (page - 1) * limit;

  return {
    slice: rows.slice(start, start + limit),
    pagination: {
      total: rows.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    },
  };
};

const numeric = (value: string | null): number | null => {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

// --- auth --------------------------------------------------------------------

const authenticate = (company: Company | undefined, password: unknown): DemoResponse => {
  if (!company || DEMO_PASSWORDS[company.email] !== password) {
    throw new DemoHttpError(401, 'Invalid credentials');
  }
  return ok({ token: issueToken(company), user: publicCompany(company) });
};

const digits = (value: string): string => value.replace(/\D/g, '');

const login = (req: DemoRequest): DemoResponse => {
  const cnpj = digits(String(req.body.cnpj ?? ''));
  return authenticate(
    getState().companies.find(c => digits(c.cnpj) === cnpj),
    req.body.password
  );
};

const loginWithEmail = (req: DemoRequest): DemoResponse => {
  const email = String(req.body.email ?? '').toLowerCase();
  return authenticate(
    getState().companies.find(c => c.email.toLowerCase() === email),
    req.body.password
  );
};

/**
 * Public sign-up is closed on the hosted demo: visitors explore it through the
 * three seeded demo accounts. The route still answers, with the same refusal
 * the backend gives in production, so a stray request fails loudly rather than
 * as a 404 — and nothing is ever added to the visitor's stored demo state.
 */
const registrationClosed = (): DemoResponse => {
  throw new DemoHttpError(403, 'Public registration is disabled');
};

const me = (req: DemoRequest): DemoResponse => ok({ user: publicCompany(requireAuth(req)) });

// --- products ----------------------------------------------------------------

const listProducts = (req: DemoRequest): DemoResponse => {
  const { query } = req;
  const search = (query.get('search') || '').toLowerCase();
  const category = query.get('category');
  const minPrice = numeric(query.get('minPrice'));
  const maxPrice = numeric(query.get('maxPrice'));
  const minMoq = numeric(query.get('minMoq'));
  const maxMoq = numeric(query.get('maxMoq'));
  const maxLeadTime = numeric(query.get('maxLeadTime'));
  const availability = query.getAll('availability');

  let specifications: Record<string, string> = {};
  try {
    specifications = JSON.parse(query.get('specifications') || '{}');
  } catch {
    specifications = {};
  }

  const rows = getState().products.filter(product => {
    if (category && product.category !== category) return false;
    if (search && !`${product.name} ${product.description}`.toLowerCase().includes(search))
      return false;
    if (minPrice !== null && Number(product.unitPrice) < minPrice) return false;
    if (maxPrice !== null && Number(product.unitPrice) > maxPrice) return false;
    if (minMoq !== null && product.minimumOrderQuantity < minMoq) return false;
    if (maxMoq !== null && product.minimumOrderQuantity > maxMoq) return false;
    if (maxLeadTime !== null && product.leadTime > maxLeadTime) return false;
    if (availability.length > 0 && !availability.includes(product.availability)) return false;

    return Object.entries(specifications).every(
      ([key, value]) => !value || String(product.specifications?.[key] ?? '') === value
    );
  });

  const { slice, pagination } = paginate(rows, query, 12);
  return ok({ products: slice, pagination });
};

const listCategories = (): DemoResponse =>
  ok([...new Set(getState().products.map(p => p.category))].sort());

const listSpecifications = (): DemoResponse => {
  const grouped: Record<string, Set<string>> = {};

  for (const product of getState().products) {
    for (const [key, value] of Object.entries(product.specifications ?? {})) {
      grouped[key] = grouped[key] ?? new Set<string>();
      grouped[key].add(String(value));
    }
  }

  return ok(
    Object.fromEntries(Object.entries(grouped).map(([key, values]) => [key, [...values].sort()]))
  );
};

const createProduct = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'admin', 'supplier');
  const state = getState();
  const body = req.body as Partial<Product>;

  const product: Product = {
    ...(body as Product),
    id: state.nextProductId++,
    // A supplier can only publish under their own identity.
    supplierId: actor.role === 'supplier' ? actor.id : Number(body.supplierId ?? actor.id),
    tierPricing: body.tierPricing ?? [],
    specifications: body.specifications ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const owner = state.companies.find(c => c.id === product.supplierId);
  if (owner) {
    product.supplier = {
      id: owner.id,
      companyName: owner.companyName,
      corporateName: owner.corporateName,
    };
  }

  state.products.push(product);
  persist();
  return created(product);
};

const assertProductOwnership = (actor: Company, product: Product): void => {
  if (actor.role === 'supplier' && product.supplierId !== actor.id) {
    throw new DemoHttpError(403, 'Access denied');
  }
};

const updateProduct = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'admin', 'supplier');
  const product = productById(Number(req.params.id));
  assertProductOwnership(actor, product);

  Object.assign(product, req.body, {
    id: product.id,
    supplierId: product.supplierId,
    supplier: product.supplier,
    updatedAt: new Date(),
  });
  persist();
  return ok(product);
};

const deleteProduct = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'admin', 'supplier');
  const product = productById(Number(req.params.id));
  assertProductOwnership(actor, product);

  const state = getState();
  state.products = state.products.filter(p => p.id !== product.id);
  persist();
  return ok(null, 'Product deleted successfully');
};

// --- quotations --------------------------------------------------------------

const createQuotation = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'customer');
  const state = getState();
  const rawItems = (req.body.items as Array<{ productId: number; quantity: number }>) ?? [];

  if (rawItems.length === 0) throw new DemoHttpError(400, 'At least one item is required');

  const id = state.nextQuotationId++;
  const now = new Date();

  const items: QuotationItem[] = rawItems.map(item => {
    const product = productById(Number(item.productId));
    const quantity = Number(item.quantity);

    if (product.minimumOrderQuantity && quantity < product.minimumOrderQuantity) {
      throw new DemoHttpError(
        400,
        `Minimum order quantity for ${product.name} is ${product.minimumOrderQuantity} units`
      );
    }

    return {
      id: state.nextQuotationItemId++,
      quotationId: id,
      productId: product.id,
      product,
      quantity,
      createdAt: now,
      updatedAt: now,
    };
  });

  const quotation: Quotation = {
    id,
    companyId: actor.id,
    items,
    status: 'pending',
    adminNotes: null,
    totalAmount: items.reduce(
      (sum, item) => sum + Number(item.product.unitPrice) * item.quantity,
      0
    ),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };

  state.quotations.push(quotation);
  persist();
  return created(withCompany(quotation));
};

const listCustomerQuotations = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'customer');
  return ok(
    getState()
      .quotations.filter(q => q.companyId === actor.id)
      .map(withCompany)
  );
};

const getQuotation = (req: DemoRequest): DemoResponse => {
  const actor = requireAuth(req);
  const quotation = quotationById(Number(req.params.id));

  const visible =
    actor.role === 'admin' ||
    quotation.companyId === actor.id ||
    (actor.role === 'supplier' && isSuppliersQuotation(quotation, actor.id));

  if (!visible) throw new DemoHttpError(403, 'Access denied');
  return ok(withCompany(quotation));
};

const calculateQuote = (req: DemoRequest): DemoResponse => {
  requireAuth(req);
  const items = (req.body.items as Array<{ productId: number; quantity: number }>) ?? [];
  const shippingMethod = (req.body.shippingMethod as ShippingMethod) || 'standard';

  const calculated: QuoteCalculationResult[] = items.map(item => {
    const product = productById(Number(item.productId));
    try {
      return calculateQuoteForItem(product, Number(item.quantity), {
        buyerLocation: req.body.buyerLocation as string | undefined,
        supplierLocation: req.body.supplierLocation as string | undefined,
        shippingMethod,
      });
    } catch (error) {
      throw new DemoHttpError(400, (error as Error).message);
    }
  });

  const calculations = calculateQuoteComparison(calculated);
  const money = (value: number): string => `R$ ${value.toFixed(2)}`;

  return ok({
    calculations,
    summary: {
      totalItems: calculated.length,
      subtotal: money(calculations.totalSubtotal),
      shipping: money(calculations.totalShipping),
      tax: money(calculations.totalTax),
      total: money(calculations.grandTotal),
      savings: money(calculations.totalSavings),
    },
  });
};

const listSupplierQuotations = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'supplier', 'admin');

  const rows =
    actor.role === 'admin'
      ? getState().quotations
      : getState().quotations.filter(q => isSuppliersQuotation(q, actor.id));

  return ok(rows.map(withCompany));
};

const applyQuotationUpdate = (quotation: Quotation, body: Record<string, unknown>): Quotation => {
  if (typeof body.status === 'string') quotation.status = body.status as Quotation['status'];
  if (typeof body.adminNotes === 'string') quotation.adminNotes = body.adminNotes;
  quotation.updatedAt = new Date();
  persist();
  return withCompany(quotation);
};

const updateSupplierQuotation = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'supplier', 'admin');
  const quotation = quotationById(Number(req.params.id));

  if (actor.role === 'supplier' && !isSuppliersQuotation(quotation, actor.id)) {
    throw new DemoHttpError(403, 'Access denied');
  }

  return ok(applyQuotationUpdate(quotation, req.body));
};

const listAllQuotations = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  return ok(getState().quotations.map(withCompany));
};

const updateQuotationAsAdmin = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  return ok(applyQuotationUpdate(quotationById(Number(req.params.id)), req.body));
};

const compareSupplierQuotes = (req: DemoRequest): DemoResponse => {
  requireAuth(req);
  const state = getState();
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  const shippingMethod = (req.body.shippingMethod as ShippingMethod) || 'standard';
  const reference = productById(productId);

  // Every supplier carrying a product in the same category is a candidate, which
  // is what makes the comparison screen worth looking at.
  const candidates = state.products.filter(p => p.category === reference.category);

  const quotes = candidates.map(product => {
    const supplier = state.companies.find(c => c.id === product.supplierId);
    const identity = {
      id: product.supplierId,
      companyName: supplier?.companyName ?? 'Unknown supplier',
      corporateName: supplier?.corporateName ?? '',
      industrySector: supplier?.industrySector ?? 'other',
      averageRating: supplier?.averageRating,
      totalRatings: supplier?.totalRatings,
    };

    try {
      return {
        supplier: identity,
        quote: calculateQuoteForItem(product, quantity, {
          buyerLocation: req.body.buyerLocation as string | undefined,
          shippingMethod,
        }),
      };
    } catch (error) {
      return { supplier: identity, quote: null, error: (error as Error).message };
    }
  });

  return ok({
    quotes,
    productId,
    quantity,
    buyerLocation: req.body.buyerLocation as string | undefined,
    shippingMethod,
  });
};

// --- orders ------------------------------------------------------------------

const STATUS_FLOW: Record<Order['status'], Order['status'][]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const STATUS_DESCRIPTIONS: Record<Order['status'], string> = {
  pending: 'Order placed, awaiting processing',
  processing: 'Order is being prepared',
  shipped: 'Order has been shipped',
  delivered: 'Order has been delivered',
  cancelled: 'Order has been cancelled',
};

const isValidNfeAccessKey = (value: string): boolean => {
  if (!/^\d{44}$/.test(value)) return false;

  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  for (let index = 0; index < 43; index++) {
    sum += Number(value[index]) * weights[(42 - index) % weights.length];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder < 2 ? 0 : 11 - remainder;
  return Number(value[43]) === expectedCheckDigit;
};

const defaultEstimatedDelivery = (): Date => {
  const estimated = new Date();
  estimated.setDate(estimated.getDate() + 5);
  if (estimated.getDay() === 0) estimated.setDate(estimated.getDate() + 1);
  if (estimated.getDay() === 6) estimated.setDate(estimated.getDate() + 2);
  return estimated;
};

const createOrder = (req: DemoRequest): DemoResponse => {
  const actor = requireAuth(req);
  const state = getState();
  const quotation = quotationById(Number(req.body.quotationId));

  if (quotation.companyId !== actor.id) {
    throw new DemoHttpError(404, 'Quotation not found or does not belong to the user');
  }
  if (state.orders.some(o => o.quotationId === quotation.id)) {
    throw new DemoHttpError(409, 'An order already exists for this quotation');
  }
  if (quotation.status !== 'processed') {
    throw new DemoHttpError(400, 'Only processed quotations can be converted to orders');
  }
  if (quotation.validUntil && new Date() > new Date(quotation.validUntil)) {
    throw new DemoHttpError(
      400,
      `This quotation expired on ${new Date(quotation.validUntil).toLocaleDateString()}. Please request a new quotation.`
    );
  }
  const itemCalculations = quotation.items.map(item =>
    calculateQuoteForItem(productById(item.productId), item.quantity)
  );
  const calculations = calculateQuoteComparison(itemCalculations);
  const now = new Date();
  const orderSequence = state.nextOrderSeq++;
  const order: Order = {
    id: `demo-order-${orderSequence}`,
    companyId: quotation.companyId,
    quotationId: quotation.id,
    quotation,
    status: 'pending',
    totalAmount: calculations.grandTotal,
    shippingAddress: actor.address,
    notes: null,
    estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
    items: quotation.items.map((item, index) => ({
      id: state.nextOrderItemId++,
      orderId: orderSequence,
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      price: itemCalculations[index].unitPriceAfterDiscount,
      totalPrice: itemCalculations[index].subtotal,
      createdAt: now,
      updatedAt: now,
    })),
  };

  quotation.status = 'completed';
  state.orders.push(order);
  persist();
  return created(order);
};

/** Orders a company can see: their own, or every order for staff roles. */
const visibleOrders = (actor: Company): Order[] => {
  const state = getState();
  if (actor.role === 'admin') return state.orders;
  if (actor.role === 'supplier') {
    return state.orders.filter(order =>
      order.items.some(item => item.product?.supplierId === actor.id)
    );
  }
  return state.orders.filter(order => order.companyId === actor.id);
};

const withOrderCompany = (order: Order): Order => {
  const company = getState().companies.find(c => c.id === order.companyId);
  return company ? { ...order, company: publicCompany(company) } : order;
};

const listOrders = (req: DemoRequest): DemoResponse => {
  const actor = requireAuth(req);
  const status = req.query.get('status');
  const rows = visibleOrders(actor).filter(o => !status || o.status === status);
  const { slice, pagination } = paginate(rows, req.query);

  return ok({ orders: slice.map(withOrderCompany), pagination });
};

const getOrder = (req: DemoRequest): DemoResponse => {
  const actor = requireAuth(req);
  const order = orderById(req.params.id);

  if (!visibleOrders(actor).some(o => o.id === order.id)) {
    throw new DemoHttpError(403, 'Access denied');
  }
  return ok(withOrderCompany(order));
};

const getOrderHistory = (req: DemoRequest): DemoResponse => {
  const actor = requireAuth(req);
  const order = orderById(req.params.id);

  if (!visibleOrders(actor).some(o => o.id === order.id)) {
    throw new DemoHttpError(403, 'Access denied');
  }

  const timeline = [
    {
      status: 'pending',
      description: STATUS_DESCRIPTIONS.pending,
      date: order.createdAt ?? new Date(),
      canTransitionTo: STATUS_FLOW.pending,
    },
  ];

  if (order.status !== 'pending') {
    timeline.push({
      status: order.status,
      description: STATUS_DESCRIPTIONS[order.status],
      date: order.updatedAt ?? new Date(),
      canTransitionTo: STATUS_FLOW[order.status],
    });
  }

  return ok({ order: withOrderCompany(order), timeline });
};

const updateOrderStatus = (req: DemoRequest): DemoResponse => {
  const actor = requireRole(req, 'admin', 'supplier');
  const order = orderById(req.params.id);

  if (!visibleOrders(actor).some(o => o.id === order.id)) {
    throw new DemoHttpError(403, 'Access denied');
  }

  const next = req.body.status as Order['status'];
  if (!Object.prototype.hasOwnProperty.call(STATUS_FLOW, next)) {
    throw new DemoHttpError(400, 'Invalid status');
  }
  if (!STATUS_FLOW[order.status].includes(next)) {
    throw new DemoHttpError(
      400,
      `Invalid status transition from ${order.status} to ${next}. Valid transitions: ${
        STATUS_FLOW[order.status].join(', ') || 'none'
      }`
    );
  }

  if (order.status === 'processing' && next === 'shipped') {
    if (!req.body.trackingNumber) {
      throw new DemoHttpError(400, 'trackingNumber is required for this status transition');
    }
    if (!req.body.nfeAccessKey) {
      throw new DemoHttpError(400, 'nfeAccessKey is required for this status transition');
    }
  }

  if (typeof req.body.nfeAccessKey === 'string' && !isValidNfeAccessKey(req.body.nfeAccessKey)) {
    throw new DemoHttpError(400, 'NF-e access key has an invalid Modulo 11 check digit');
  }

  order.status = next;
  if (typeof req.body.trackingNumber === 'string') order.trackingNumber = req.body.trackingNumber;
  if (typeof req.body.notes === 'string') order.notes = req.body.notes;
  if (typeof req.body.nfeAccessKey === 'string') order.nfeAccessKey = req.body.nfeAccessKey;
  if (typeof req.body.nfeUrl === 'string') order.nfeUrl = req.body.nfeUrl;
  if (typeof req.body.estimatedDeliveryDate === 'string') {
    order.estimatedDeliveryDate = new Date(req.body.estimatedDeliveryDate);
  } else if (next === 'shipped') {
    order.estimatedDeliveryDate = defaultEstimatedDelivery();
  }
  order.updatedAt = new Date();
  persist();

  return ok(withOrderCompany(order));
};

const listAllOrders = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  const status = req.query.get('status');
  const rows = getState().orders.filter(o => !status || o.status === status);
  const { slice, pagination } = paginate(rows, req.query);

  return ok({ orders: slice.map(withOrderCompany), pagination });
};

const countByStatus = (orders: Order[]): Record<string, number> =>
  orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

const orderStats = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  const orders = getState().orders;
  const counts = countByStatus(orders);

  return ok({
    statusCounts: {
      pending: counts.pending || 0,
      processing: counts.processing || 0,
      shipped: counts.shipped || 0,
      delivered: counts.delivered || 0,
      cancelled: counts.cancelled || 0,
    },
    totalOrders: orders.length,
    averageProcessingTime: 3.2,
  });
};

// --- admin -------------------------------------------------------------------

const inRange = (order: Order, start: string | null, end: string | null): boolean => {
  const created = new Date(order.createdAt ?? Date.now()).getTime();
  if (start && created < new Date(start).getTime()) return false;
  // An end date with no time component means "through the end of that day".
  if (end && created > new Date(end).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
  return true;
};

const adminTransactions = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  const status = req.query.get('status');

  const orders = getState()
    .orders.filter(o => !status || o.status === status)
    .filter(o => inRange(o, req.query.get('startDate'), req.query.get('endDate')));

  return ok({
    orders: orders.map(order => {
      const company = getState().companies.find(c => c.id === order.companyId);
      return {
        id: order.id,
        status: order.status,
        companyId: order.companyId,
        quotationId: order.quotationId,
        totalAmount: order.totalAmount,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        trackingNumber: order.trackingNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        user: {
          id: company?.id ?? order.companyId,
          email: company?.email ?? '',
          companyName: company?.companyName ?? '',
          role: company?.role ?? 'customer',
        },
        quotation: {
          id: order.quotationId ?? 0,
          totalAmount: order.totalAmount,
          status: order.quotation?.status ?? 'completed',
        },
      };
    }),
    totalRevenue: orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    ordersByStatus: countByStatus(orders),
    totalOrders: orders.length,
  });
};

const verificationQueue = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  const filter = req.query.get('filter') || 'pending';

  const rows = getState().companies.filter(company => {
    if (company.role === 'admin') return false;
    if (filter === 'pending') return company.status === 'pending';
    if (filter === 'unvalidated_cnpj') return !company.cnpjValidated;
    return true;
  });

  const { slice, pagination } = paginate(rows, req.query);

  return ok({
    companies: slice,
    totalCount: pagination.total,
    currentPage: pagination.page,
    totalPages: pagination.totalPages,
  });
};

const companyById = (id: number): Company => {
  const company = getState().companies.find(c => c.id === id);
  if (!company) throw new DemoHttpError(404, 'Company not found');
  return company;
};

const verifyCompany = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  const company = companyById(Number(req.params.id));
  const status = req.body.status as Company['status'];

  company.status = status;
  if (req.body.validateCNPJ === true && status === 'approved') company.cnpjValidated = true;
  company.updatedAt = new Date();
  persist();

  return ok({ message: `Company ${status === 'approved' ? 'approved' : 'rejected'} successfully` });
};

const validateCnpj = (req: DemoRequest): DemoResponse => {
  requireRole(req, 'admin');
  const company = companyById(Number(req.params.id));

  company.cnpjValidated = true;
  company.updatedAt = new Date();
  persist();

  return ok({ user: publicCompany(company) });
};

// --- routing -----------------------------------------------------------------

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handle: (req: DemoRequest) => DemoResponse;
}

const route = (method: string, path: string, handle: (req: DemoRequest) => DemoResponse): Route => {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:[A-Za-z]+/g, match => {
      keys.push(match.slice(1));
      return '([^/]+)';
    })}$`
  );
  return { method, pattern, keys, handle };
};

/** Literal paths precede `:id` patterns; matching is first-wins. */
export const ROUTES: Route[] = [
  route('POST', '/auth/login', login),
  route('POST', '/auth/login-email', loginWithEmail),
  route('POST', '/auth/register', registrationClosed),
  route('POST', '/auth/register-supplier', registrationClosed),
  route('GET', '/auth/me', me),
  route('POST', '/auth/logout', () => ok(null, 'Logged out')),

  route('GET', '/products/categories', listCategories),
  route('GET', '/products/specifications', listSpecifications),
  route('GET', '/products', listProducts),
  route('POST', '/products', createProduct),
  route('GET', '/products/:id', req => ok(productById(Number(req.params.id)))),
  route('PUT', '/products/:id', updateProduct),
  route('DELETE', '/products/:id', deleteProduct),

  route('POST', '/quotations/calculate', calculateQuote),
  route('POST', '/quotations/compare-suppliers', compareSupplierQuotes),
  route('GET', '/quotations/admin/all', listAllQuotations),
  route('PUT', '/quotations/admin/:id', updateQuotationAsAdmin),
  route('GET', '/quotations/supplier', listSupplierQuotations),
  route('PUT', '/quotations/supplier/:id', updateSupplierQuotation),
  route('POST', '/quotations', createQuotation),
  route('GET', '/quotations', listCustomerQuotations),
  route('GET', '/quotations/:id', getQuotation),

  route('GET', '/orders/admin/all', listAllOrders),
  route('GET', '/orders/admin/stats', orderStats),
  route('POST', '/orders', createOrder),
  route('GET', '/orders', listOrders),
  route('GET', '/orders/:id/history', getOrderHistory),
  route('PUT', '/orders/:id/status', updateOrderStatus),
  route('GET', '/orders/:id', getOrder),

  route('GET', '/admin/transactions', adminTransactions),
  route('GET', '/admin/companies/queue', verificationQueue),
  route('PUT', '/admin/companies/:id/verify', verifyCompany),
  route('POST', '/admin/companies/:id/validate-cnpj', validateCnpj),
];

/**
 * Resolves one request against the route table.
 *
 * Errors are converted to the backend's `{ success: false, error }` envelope so
 * the app's existing error handling — including the axios interceptor's 401
 * logout — behaves exactly as it does against the real API.
 */
export const handleDemoRequest = (
  method: string,
  url: string,
  body: Record<string, unknown>,
  token: string | null
): DemoResponse => {
  const [rawPath, rawQuery = ''] = url.split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const upperMethod = method.toUpperCase();

  for (const candidate of ROUTES) {
    if (candidate.method !== upperMethod) continue;
    const match = candidate.pattern.exec(path);
    if (!match) continue;

    const params = Object.fromEntries(
      candidate.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])])
    );

    try {
      return candidate.handle({
        method: upperMethod,
        path,
        query: new URLSearchParams(rawQuery),
        body,
        token,
        params,
      });
    } catch (error) {
      if (error instanceof DemoHttpError) {
        return { status: error.status, body: { success: false, error: error.message } };
      }
      return {
        status: 500,
        body: { success: false, error: (error as Error).message || 'Demo request failed' },
      };
    }
  }

  return { status: 404, body: { success: false, error: `Not found: ${upperMethod} ${path}` } };
};
