import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import type { Product } from '@shared/types';
import ProductDetailPage from '../ProductDetailPage';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { productsService } from '../../services/productsService';

vi.mock('../../services/productsService', () => ({
  productsService: { getProductById: vi.fn() },
}));

const mockAddItem = vi.fn();
vi.mock('../../contexts/QuotationContext', () => ({
  useQuotationRequest: () => ({ addItem: mockAddItem }),
}));

let mockUser: { role: 'customer' | 'supplier' | 'admin' } | null = null;
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: Boolean(mockUser) }),
}));

const product: Product = {
  id: 1,
  name: 'Industrial Bearing XYZ-500',
  description: 'High-precision ball bearing for industrial machinery.',
  price: 150,
  imageUrl: '',
  category: 'Components',
  supplierId: 2,
  supplier: {
    id: 2,
    companyName: 'Industrial Solutions',
    corporateName: 'Industrial Solutions LTDA',
  },
  tierPricing: [
    { minQuantity: 1, maxQuantity: 50, discount: 0 },
    { minQuantity: 51, maxQuantity: 200, discount: 0.1 },
    { minQuantity: 201, maxQuantity: null, discount: 0.2 },
  ],
  specifications: { size: '50mm', material: 'Steel' },
  unitPrice: 150,
  minimumOrderQuantity: 10,
  leadTime: 5,
  availability: 'in_stock',
};

const notFoundError = () =>
  new AxiosError('Product not found', AxiosError.ERR_BAD_REQUEST, undefined, null, {
    status: 404,
    statusText: 'Not Found',
    data: { success: false, error: 'Product not found' },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const LocationProbe = () => <div data-testid='location'>{useLocation().pathname}</div>;

const renderAt = (path: string) =>
  render(
    <LanguageProvider initialLanguage='en'>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path='/products/:id' element={<ProductDetailPage />} />
          <Route path='/' element={<div>Catalog</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </LanguageProvider>
  );

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  it('loads the product named in the URL and shows its full details', async () => {
    vi.mocked(productsService.getProductById).mockResolvedValue(product);
    renderAt('/products/1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Industrial Bearing XYZ-500' })
    ).toBeInTheDocument();
    expect(productsService.getProductById).toHaveBeenCalledWith(1);

    expect(screen.getByText(product.description)).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText(/SKU-1/)).toBeInTheDocument();
    expect(screen.getByText('Industrial Solutions')).toBeInTheDocument();
    expect(screen.getByText('10 units')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();

    const specs = screen.getByRole('table', { name: 'Technical Specifications' });
    expect(within(specs).getByRole('rowheader', { name: 'Size' })).toBeInTheDocument();
    expect(within(specs).getByText('50mm')).toBeInTheDocument();
  });

  it('derives each volume tier price from the unit price and the tier discount', async () => {
    vi.mocked(productsService.getProductById).mockResolvedValue(product);
    renderAt('/products/1');

    const tiers = await screen.findByRole('table', { name: 'Volume pricing' });
    const rows = within(tiers).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(/1–50 units—R\$\s?150,00/);
    expect(rows[1]).toHaveTextContent(/51–200 units10%R\$\s?135,00/);
    expect(rows[2]).toHaveTextContent(/201\+ units20%R\$\s?120,00/);
  });

  it('omits the volume pricing section when the product has no tiers', async () => {
    vi.mocked(productsService.getProductById).mockResolvedValue({ ...product, tierPricing: [] });
    renderAt('/products/1');

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('table', { name: 'Volume pricing' })).not.toBeInTheDocument();
  });

  it('falls back to the placeholder image when the product has none', async () => {
    vi.mocked(productsService.getProductById).mockResolvedValue(product);
    renderAt('/products/1');

    const image = await screen.findByRole('img', { name: product.name });
    expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('adds the product to the quotation request for a visitor or buyer', async () => {
    const user = userEvent.setup();
    mockUser = { role: 'customer' };
    vi.mocked(productsService.getProductById).mockResolvedValue(product);
    renderAt('/products/1');

    await user.click(await screen.findByRole('button', { name: 'Add to quote' }));

    expect(mockAddItem).toHaveBeenCalledWith(product);
    expect(screen.getByTestId('location')).toHaveTextContent('/products/1');
  });

  it.each(['supplier', 'admin'] as const)('offers no quotation action to a %s', async role => {
    mockUser = { role };
    vi.mocked(productsService.getProductById).mockResolvedValue(product);
    renderAt('/products/1');

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Add to quote' })).not.toBeInTheDocument();
  });

  it('shows a loading state until the product arrives', async () => {
    let answer: (value: Product) => void = () => {};
    vi.mocked(productsService.getProductById).mockReturnValue(
      new Promise(resolve => (answer = resolve))
    );
    renderAt('/products/1');

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    answer(product);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('reports a product the API does not know as not found', async () => {
    vi.mocked(productsService.getProductById).mockRejectedValue(notFoundError());
    renderAt('/products/999');

    expect(await screen.findByText('Product not found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it.each(['abc', '1.5', '-2', '0', '12abc'])(
    'treats the invalid id "%s" as not found without calling the API',
    async id => {
      renderAt(`/products/${id}`);

      expect(await screen.findByText('Product not found')).toBeInTheDocument();
      expect(productsService.getProductById).not.toHaveBeenCalled();
    }
  );

  it('offers a retry after a failed load and recovers', async () => {
    const user = userEvent.setup();
    vi.mocked(productsService.getProductById)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(product);
    renderAt('/products/1');

    expect(
      await screen.findByText('Could not load this product. Please try again.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('returns a deep-linked visitor to the catalog', async () => {
    const user = userEvent.setup();
    vi.mocked(productsService.getProductById).mockResolvedValue(product);
    renderAt('/products/1');

    await user.click(await screen.findByRole('button', { name: 'Back to catalog' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
  });
});
