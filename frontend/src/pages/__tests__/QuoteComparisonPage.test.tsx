import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuoteComparisonPage from '../QuoteComparisonPage';
import { productsService } from '../../services/productsService';
import { quotationsService } from '../../services/quotationsService';

vi.mock('../../services/productsService', () => ({
  productsService: {
    getAllProducts: vi.fn(),
  },
}));

vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    compareSupplierQuotes: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), __esModule: true },
}));

const mockProducts = [
  {
    id: 1,
    name: 'Parafuso M8',
    description: 'Parafuso de aço inoxidável M8',
    price: 2.5,
    category: 'Fixadores',
    imageUrl: '/img/parafuso.jpg',
    companyId: 10,
    minimumOrderQuantity: 50,
  },
  {
    id: 2,
    name: 'Porca Sextavada',
    description: 'Porca sextavada de aço',
    price: 1.0,
    category: 'Fixadores',
    imageUrl: '/img/porca.jpg',
    companyId: 10,
    minimumOrderQuantity: null,
  },
];

const mockQuotes = {
  quotes: [
    {
      supplier: {
        id: 100,
        companyName: 'Fornecedor A',
        corporateName: 'Fornecedor A Ltda',
        averageRating: 4.5,
        totalRatings: 12,
        industrySector: 'Metalurgia',
      },
      quote: {
        productId: 1,
        basePrice: 2.5,
        quantity: 100,
        tierDiscount: 0.1,
        unitPriceAfterDiscount: 2.25,
        subtotal: 225.0,
        shippingCost: 30.0,
        tax: 25.5,
        total: 280.5,
        savings: 25.0,
        appliedTier: { minQuantity: 50, maxQuantity: 200 },
      },
      error: undefined,
    },
    {
      supplier: {
        id: 200,
        companyName: 'Fornecedor B',
        corporateName: 'Fornecedor B SA',
        averageRating: 3.8,
        totalRatings: 5,
        industrySector: 'Industrial',
      },
      quote: {
        productId: 1,
        basePrice: 2.8,
        quantity: 100,
        tierDiscount: 0.05,
        unitPriceAfterDiscount: 2.66,
        subtotal: 266.0,
        shippingCost: 25.0,
        tax: 29.1,
        total: 320.1,
        savings: 14.0,
        appliedTier: null,
      },
      error: undefined,
    },
  ],
};

const renderPage = async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <QuoteComparisonPage />
      </BrowserRouter>
    );
  });
};

describe('QuoteComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays products on mount', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Comparar Cotações de Fornecedores')).toBeInTheDocument();
    });

    expect(productsService.getAllProducts).toHaveBeenCalledWith({ limit: 100 });
  });

  it('allows selecting a product from the dropdown', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Comparar Cotações de Fornecedores')).toBeInTheDocument();
    });

    const productSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.mouseDown(productSelect);
    });

    const productOption = await screen.findByRole('option', { name: 'Parafuso M8' });
    await act(async () => {
      fireEvent.click(productOption);
    });

    // After selection, the product info card should appear
    await waitFor(() => {
      expect(screen.getByText('Parafuso de aço inoxidável M8')).toBeInTheDocument();
    });
  });

  it('displays comparison results after clicking compare', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });
    vi.mocked(quotationsService.compareSupplierQuotes).mockResolvedValue(mockQuotes);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Comparar Cotações de Fornecedores')).toBeInTheDocument();
    });

    // Select product
    const productSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.mouseDown(productSelect);
    });
    const productOption = await screen.findByRole('option', { name: 'Parafuso M8' });
    await act(async () => {
      fireEvent.click(productOption);
    });

    // Click compare button
    const compareButton = screen.getByText('Comparar');
    await act(async () => {
      fireEvent.click(compareButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Fornecedor A')).toBeInTheDocument();
      expect(screen.getByText('Fornecedor B')).toBeInTheDocument();
    });

    expect(screen.getByText('Resumo da Comparação')).toBeInTheDocument();
    expect(screen.getByText('Cotações dos Fornecedores')).toBeInTheDocument();
    expect(screen.getByText('Melhor Oferta')).toBeInTheDocument();
  });

  it('shows empty state with no quotes message when no suppliers found', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });
    vi.mocked(quotationsService.compareSupplierQuotes).mockResolvedValue({ quotes: [] });

    const toast = (await import('react-hot-toast')).default;

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Comparar Cotações de Fornecedores')).toBeInTheDocument();
    });

    // Select product
    const productSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.mouseDown(productSelect);
    });
    const productOption = await screen.findByRole('option', { name: 'Parafuso M8' });
    await act(async () => {
      fireEvent.click(productOption);
    });

    // Click compare
    const compareButton = screen.getByText('Comparar');
    await act(async () => {
      fireEvent.click(compareButton);
    });

    await waitFor(() => {
      expect(toast).toBeDefined();
    });

    // The default empty state card should be visible
    expect(screen.getByText('Nenhuma cotação encontrada')).toBeInTheDocument();
  });

  it('shows loading spinner while products are loading', async () => {
    vi.mocked(productsService.getAllProducts).mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(
        <BrowserRouter>
          <QuoteComparisonPage />
        </BrowserRouter>
      );
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Carregando produtos...')).toBeInTheDocument();
  });

  it('shows error toast when loading products fails', async () => {
    const toast = (await import('react-hot-toast')).default;
    vi.mocked(productsService.getAllProducts).mockRejectedValue(new Error('Network error'));

    await renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao carregar produtos');
    });
  });
});
