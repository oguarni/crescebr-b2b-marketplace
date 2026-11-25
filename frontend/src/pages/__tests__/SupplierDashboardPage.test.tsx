import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Company, Order, Product, Quotation, SupplierDashboardSummary } from '@shared/types';
import SupplierDashboardPage from '../SupplierDashboardPage';
import { ordersService } from '../../services/ordersService';
import { quotationsService } from '../../services/quotationsService';

vi.mock('../../services/ordersService', () => ({
  ordersService: {
    getUserOrders: vi.fn(),
    getSupplierSummary: vi.fn(),
  },
}));

vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    getSupplierQuotations: vi.fn(),
  },
}));

const mockUser = vi.hoisted(() => ({
  current: { id: 1, role: 'supplier', status: 'approved', companyName: 'Test Supplier' } as {
    id: number;
    role: string;
    status: string;
    companyName: string;
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

const makeProduct = (id: number, name: string, price: number): Product => ({
  id,
  name,
  description: `${name} description`,
  price,
  imageUrl: '',
  category: 'Industrial',
  supplierId: 1,
  tierPricing: [],
  specifications: {},
  unitPrice: price,
  minimumOrderQuantity: 1,
  leadTime: 7,
  availability: 'in_stock',
});

const mockBuyer: Company = {
  id: 2,
  email: 'buyer@example.com',
  cpf: '12345678901',
  address: 'Rua Teste, 123',
  role: 'customer',
  status: 'approved',
  companyName: 'Buyer Corp',
  corporateName: 'Buyer Corp',
  cnpj: '12345678000190',
  cnpjValidated: true,
  industrySector: 'Industrial',
  companyType: 'buyer',
};

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    companyId: 2,
    status: 'pending',
    totalAmount: 5000,
    createdAt: new Date('2026-03-15T10:00:00Z'),
    shippingAddress: 'Rua Teste, 123',
    notes: null,
    items: [
      {
        id: 1,
        orderId: 1,
        productId: 1,
        product: makeProduct(1, 'Pump', 2500),
        quantity: 2,
        price: 2500,
        totalPrice: 5000,
      },
    ],
    company: mockBuyer,
  },
  {
    id: 'ORD-002',
    companyId: 3,
    status: 'processing',
    totalAmount: 3200,
    createdAt: new Date('2026-03-14T10:00:00Z'),
    shippingAddress: 'Avenida Teste, 456',
    notes: null,
    items: [
      {
        id: 2,
        orderId: 2,
        productId: 2,
        product: makeProduct(2, 'Valve', 640),
        quantity: 5,
        price: 640,
        totalPrice: 3200,
      },
    ],
    company: {
      ...mockBuyer,
      id: 3,
      companyName: 'Another Buyer',
      corporateName: 'Another Buyer',
    },
  },
];

const mockQuotations: Quotation[] = [
  {
    id: 1,
    companyId: 2,
    status: 'pending',
    adminNotes: null,
    createdAt: new Date('2026-03-15T10:00:00Z'),
    company: mockBuyer,
    items: [
      {
        id: 1,
        quotationId: 1,
        productId: 1,
        quantity: 10,
        product: makeProduct(1, 'Pump', 500),
      },
    ],
  },
  {
    id: 2,
    companyId: 3,
    status: 'processed',
    adminNotes: null,
    createdAt: new Date('2026-03-14T10:00:00Z'),
    company: {
      ...mockBuyer,
      id: 3,
      companyName: 'Another Buyer',
      corporateName: 'Another Buyer',
    },
    items: [
      {
        id: 2,
        quotationId: 2,
        productId: 2,
        quantity: 20,
        product: makeProduct(2, 'Valve', 100),
      },
    ],
  },
];

const summary = (overrides: Partial<SupplierDashboardSummary> = {}): SupplierDashboardSummary => ({
  pendingQuotations: 12,
  activeOrders: 2,
  billableOrders: 31,
  orderVolume: 1234567.89,
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <SupplierDashboardPage />
    </MemoryRouter>
  );

describe('SupplierDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.current = {
      id: 1,
      role: 'supplier',
      status: 'approved',
      companyName: 'Test Supplier',
    };
    vi.mocked(ordersService.getSupplierSummary).mockResolvedValue(summary());
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: mockOrders,
      pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue(mockQuotations);
  });

  it('has one page heading under the app header, with the company name', async () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Painel do fornecedor' })
    ).toBeInTheDocument();
    expect(screen.getByText('Test Supplier')).toBeInTheDocument();
    expect(await screen.findByText('Buyer Corp')).toBeInTheDocument();
    // The old in-page app bar, drawer and bottom bar are gone.
    expect(screen.queryByRole('button', { name: /menu de navegação/i })).not.toBeInTheDocument();
  });

  it('shows the API aggregate, not figures summed from one page of orders', async () => {
    renderPage();

    const pending = await screen.findByTestId('metric-pending');
    expect(pending).toHaveTextContent('12');
    expect(pending).toHaveAttribute('href', '/supplier/quotations');
    expect(screen.getByTestId('metric-active')).toHaveTextContent('2');
    const volume = screen.getByTestId('metric-volume');
    expect(volume).toHaveTextContent(/R\$\s1\.234\.567,89/);
    expect(volume).toHaveTextContent('31 pedidos não cancelados');
    expect(volume).toHaveAttribute('href', '/supplier/orders');
  });

  it('uses the singular for one order and one item', async () => {
    vi.mocked(ordersService.getSupplierSummary).mockResolvedValue(summary({ billableOrders: 1 }));
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([
      { ...mockQuotations[0], items: mockQuotations[0].items.slice(0, 1) },
    ]);
    renderPage();

    expect(await screen.findByText('1 pedido não cancelado')).toBeInTheDocument();
    expect(screen.getByText(/^1 item •/)).toBeInTheDocument();
  });

  it('links each queued quotation to its detail page', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: /Abrir cotação #QT-1 de Buyer Corp/ });
    expect(link).toHaveAttribute('href', '/supplier/quotations/1');
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/supplier/quotations'
    );
  });

  it('lists orders to prepare with short order numbers', async () => {
    renderPage();

    const section = await screen.findByRole('region', { name: 'Pedidos a preparar' });
    expect(within(section).getByText('Pedido #ORD-001')).toBeInTheDocument();
    expect(within(section).getAllByRole('link')[0]).toHaveAttribute('href', '/supplier/orders');
  });

  it('shows empty states instead of blank cards', async () => {
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([]);
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    renderPage();

    expect(await screen.findByText('Nenhuma cotação aguardando resposta.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum pedido a preparar.')).toBeInTheDocument();
  });

  it('offers a retry instead of zeros when loading fails', async () => {
    vi.mocked(ordersService.getSupplierSummary)
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(summary({ pendingQuotations: 3 }));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Não foi possível carregar o painel.')).toBeInTheDocument();
    expect(screen.queryByTestId('metric-pending')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByTestId('metric-pending')).toHaveTextContent('3');
  });

  it('tells a supplier awaiting approval why their lists are empty', async () => {
    mockUser.current = { ...mockUser.current, status: 'pending' };
    renderPage();
    expect(await screen.findByText(/pendente de aprovação/)).toBeInTheDocument();
  });
});
