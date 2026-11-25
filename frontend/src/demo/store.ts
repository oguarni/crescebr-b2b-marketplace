/**
 * Mutable state for the browser-side demo API.
 *
 * The hosted demo has no server, so this module is the database: it holds the
 * seeded catalog plus whatever the visitor creates, and persists to
 * localStorage so a refresh does not throw the session away. `resetState()`
 * puts a visitor back to a clean marketplace.
 */

import type { Company, Order, Product, Quotation, SystemSettings } from '@shared/types';
import { SEED_COMPANIES, SEED_PRODUCTS } from './data';
import { DEFAULT_SYSTEM_SETTINGS } from '../utils/systemSettingsRules';

/** Bump when the shape below changes so stale saved state is discarded. */
const STATE_VERSION = 2;

/**
 * Seeded orders carry UUIDs like the backend's, so screens that show a short
 * order number (its first eight characters) can tell them apart.
 */
export const SEED_ORDER_IDS = [
  'b7e3c2a9-4f1d-4c8e-9a2b-1d5e6f7a8b9c',
  'e1a94d27-8c3b-4f6e-b5d0-2a7c9e4f1b38',
] as const;

/** A random v4 UUID, as Postgres' `UUIDV4` default would assign. */
export const newOrderId = (): string => globalThis.crypto.randomUUID();

/** The admin-editable pricing parameters, versioned like the backend row. */
export interface DemoSettingsRow {
  values: SystemSettings;
  /** 0 until the first save, matching the backend without a settings row. */
  version: number;
  updatedAt: string | null;
  updatedBy: number | null;
}
const STORAGE_KEY = 'crescebr_demo_state';

export interface DemoState {
  version: number;
  companies: Company[];
  products: Product[];
  quotations: Quotation[];
  orders: Order[];
  settings: DemoSettingsRow;
  nextCompanyId: number;
  nextProductId: number;
  nextQuotationId: number;
  nextQuotationItemId: number;
  nextOrderItemId: number;
  nextOrderSeq: number;
}

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysAhead = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Companies awaiting review, so the admin verification queue has something to
 * act on. Kept out of the seeder because a real deployment gets these from
 * actual signups.
 */
const PENDING_COMPANIES: Company[] = [
  {
    id: 101,
    email: 'contato@metalurgicavale.com.br',
    cpf: '987.654.321-00',
    address: 'Rua das Fundições, 420, Joinville, SC',
    city: 'Joinville',
    state: 'SC',
    zipCode: '89201-100',
    phone: '(47) 3422-8800',
    contactPerson: 'Renata Alves',
    contactTitle: 'Diretora Comercial',
    role: 'supplier',
    status: 'pending',
    companyName: 'Metalúrgica Vale',
    corporateName: 'Metalúrgica Vale Indústria LTDA',
    cnpj: '77.777.777/0001-77',
    cnpjValidated: false,
    industrySector: 'raw_materials',
    companyType: 'supplier',
    companySize: 'medium',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: 102,
    email: 'compras@agroparana.com.br',
    cpf: '456.123.789-11',
    address: 'Av. das Nações, 1500, Maringá, PR',
    city: 'Maringá',
    state: 'PR',
    zipCode: '87010-200',
    phone: '(44) 3025-6100',
    contactPerson: 'Bruno Carvalho',
    contactTitle: 'Gerente de Suprimentos',
    role: 'customer',
    status: 'pending',
    companyName: 'AgroParaná Distribuidora',
    corporateName: 'AgroParaná Distribuidora SA',
    cnpj: '88.888.888/0001-88',
    cnpjValidated: true,
    industrySector: 'food_beverage',
    companyType: 'buyer',
    companySize: 'large',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 103,
    email: 'contato@techmold.com.br',
    cpf: '321.654.987-22',
    address: 'Rua dos Moldes, 88, Caxias do Sul, RS',
    city: 'Caxias do Sul',
    state: 'RS',
    zipCode: '95010-330',
    phone: '(54) 3218-4400',
    contactPerson: 'Helena Prado',
    contactTitle: 'Sócia-Diretora',
    role: 'supplier',
    status: 'rejected',
    companyName: 'TechMold Ferramentaria',
    corporateName: 'TechMold Ferramentaria ME',
    cnpj: '99.999.999/0001-99',
    cnpjValidated: false,
    industrySector: 'components',
    companyType: 'supplier',
    companySize: 'small',
    createdAt: daysAgo(12),
    updatedAt: daysAgo(9),
  },
];

const findProduct = (products: Product[], id: number): Product => {
  const product = products.find(p => p.id === id);
  if (!product) throw new Error(`Demo seed references unknown product ${id}`);
  return product;
};

/**
 * Prior quotations and orders for the buyer account, so the dashboards, order
 * history and admin transaction charts are populated on a visitor's first
 * click instead of showing empty states.
 */
const buildHistory = (
  products: Product[],
  buyerId: number
): { quotations: Quotation[]; orders: Order[] } => {
  const lines: Array<{
    productId: number;
    quantity: number;
    status: Quotation['status'];
    ageDays: number;
    notes: string | null;
  }> = [
    {
      productId: 1,
      quantity: 120,
      status: 'completed',
      ageDays: 34,
      notes: 'Volume tier applied.',
    },
    { productId: 2, quantity: 1, status: 'completed', ageDays: 21, notes: 'Delivery scheduled.' },
    { productId: 5, quantity: 200, status: 'processed', ageDays: 12, notes: 'Awaiting PO number.' },
    { productId: 9, quantity: 6, status: 'pending', ageDays: 4, notes: null },
    { productId: 3, quantity: 8, status: 'rejected', ageDays: 8, notes: 'Out of delivery radius.' },
  ];

  const quotations: Quotation[] = lines.map((line, index) => {
    const product = findProduct(products, line.productId);
    const created = daysAgo(line.ageDays);

    return {
      id: index + 1,
      companyId: buyerId,
      status: line.status,
      adminNotes: line.notes,
      totalAmount: Number(product.unitPrice) * line.quantity,
      validUntil: daysAhead(30 - line.ageDays),
      createdAt: created,
      updatedAt: created,
      items: [
        {
          id: index + 1,
          quotationId: index + 1,
          productId: product.id,
          product,
          quantity: line.quantity,
          createdAt: created,
          updatedAt: created,
        },
      ],
    };
  });

  // Only completed quotations became orders, which is the flow the app enforces.
  const orderable: Array<{ quotation: Quotation; status: Order['status']; tracking?: string }> = [
    { quotation: quotations[0], status: 'delivered', tracking: 'BR932188457PR' },
    { quotation: quotations[1], status: 'shipped', tracking: 'BR774310982PR' },
  ];

  const orders: Order[] = orderable.map(({ quotation, status, tracking }, index) => {
    const item = quotation.items[0];
    const created = daysAgo(30 - index * 8);

    return {
      id: SEED_ORDER_IDS[index],
      companyId: quotation.companyId,
      quotationId: quotation.id,
      quotation,
      status,
      totalAmount: quotation.totalAmount ?? 0,
      trackingNumber: tracking,
      estimatedDeliveryDate: daysAhead(index === 0 ? -6 : 3),
      shippingAddress: 'Av. Brasil, 456, Foz do Iguacu, PR',
      notes: null,
      createdAt: created,
      updatedAt: created,
      items: [
        {
          id: index + 1,
          orderId: index + 1,
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          price: Number(item.product.unitPrice),
          totalPrice: Number(item.product.unitPrice) * item.quantity,
          createdAt: created,
          updatedAt: created,
        },
      ],
    };
  });

  return { quotations, orders };
};

const buildInitialState = (): DemoState => {
  const companies = [...SEED_COMPANIES, ...PENDING_COMPANIES];
  const products = SEED_PRODUCTS.map(product => ({ ...product }));
  const buyer = companies.find(c => c.role === 'customer');
  const { quotations, orders } = buildHistory(products, buyer ? buyer.id : 3);

  return {
    version: STATE_VERSION,
    companies,
    products,
    quotations,
    orders,
    settings: { values: DEFAULT_SYSTEM_SETTINGS, version: 0, updatedAt: null, updatedBy: null },
    nextCompanyId: 200,
    nextProductId: products.length + 1,
    nextQuotationId: quotations.length + 1,
    nextQuotationItemId: quotations.length + 1,
    nextOrderItemId: orders.length + 1,
    nextOrderSeq: orders.length + 1,
  };
};

/**
 * Dates survive persistence as ISO strings; the app formats them through
 * `new Date(...)`, which accepts both, so no revival pass is needed.
 */
const load = (): DemoState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    // Unreadable or disabled storage is not fatal — fall back to a fresh state.
  }
  return buildInitialState();
};

let state: DemoState = load();

export const getState = (): DemoState => state;

export const persist = (): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or private-mode failures only cost persistence, not correctness.
  }
};

export const resetState = (): void => {
  state = buildInitialState();
  persist();
};
