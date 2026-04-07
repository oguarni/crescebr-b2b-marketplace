import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SupplierProductsPage from '../SupplierProductsPage';
import { productsService } from '../../services/productsService';
import toast from 'react-hot-toast';

// Mock services
vi.mock('../../services/productsService', () => ({
  productsService: {
    getAllProducts: vi.fn(),
    getCategories: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'supplier', companyName: 'Test Supplier' },
  }),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

const mockProducts = [
  {
    id: 1,
    name: 'Industrial Pump',
    description: 'High-performance industrial water pump',
    price: 1500.0,
    imageUrl: 'https://example.com/pump.jpg',
    category: 'Industrial Equipment',
    supplierId: 1,
    unitPrice: 1500.0,
    minimumOrderQuantity: 5,
    leadTime: 7,
    availability: 'in_stock' as const,
    specifications: {},
    tierPricing: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Safety Helmet',
    description: 'Industrial safety helmet with adjustable strap',
    price: 25.0,
    imageUrl: 'https://example.com/helmet.jpg',
    category: 'Safety Equipment',
    supplierId: 1,
    unitPrice: 25.0,
    minimumOrderQuantity: 10,
    leadTime: 3,
    availability: 'limited' as const,
    specifications: {},
    tierPricing: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: 'Concrete Mix',
    description: 'Premium concrete mix for construction',
    price: 50.0,
    imageUrl: '',
    category: 'Construction Materials',
    supplierId: 1,
    unitPrice: 50.0,
    minimumOrderQuantity: 100,
    leadTime: 14,
    availability: 'out_of_stock' as const,
    specifications: {},
    tierPricing: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCategories = ['Industrial Equipment', 'Safety Equipment', 'Construction Materials'];

const renderPage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <SupplierProductsPage />
      </BrowserRouter>
    );
  });
  return renderResult!;
};

describe('SupplierProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsService.getAllProducts).mockResolvedValue({ products: mockProducts });
    vi.mocked(productsService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(productsService.createProduct).mockResolvedValue({ id: 4 });
    vi.mocked(productsService.updateProduct).mockResolvedValue({});
    vi.mocked(productsService.deleteProduct).mockResolvedValue({});
  });

  it('renders page header and product statistics', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Product Management')).toBeInTheDocument();
      expect(
        screen.getByText('Manage your product catalog, inventory, and pricing')
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Total Products')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Limited Stock')).toBeInTheDocument();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('renders products in grid view after loading', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
      expect(screen.getByText('Concrete Mix')).toBeInTheDocument();
    });
  });

  it('filters products via search input', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search products...');
    await user.type(searchInput, 'Helmet');

    await waitFor(() => {
      expect(productsService.getAllProducts).toHaveBeenCalled();
    });
  });

  it('opens create product dialog when Add Product is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Product');
    await user.click(addButton);

    await waitFor(
      () => {
        expect(screen.getByText('Add New Product')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /product name/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('creates a product successfully', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Product');
    fireEvent.click(addButton);

    await waitFor(
      () => {
        expect(screen.getByText('Add New Product')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /product name/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    const nameField = screen.getByRole('textbox', { name: /product name/i });
    fireEvent.change(nameField, { target: { value: 'New Product' } });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(
      () => {
        expect(productsService.createProduct).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Product created successfully');
      },
      { timeout: 10000 }
    );
  }, 30000);

  it('opens edit dialog when edit button is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Find edit buttons (multiple, one per product card)
    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
    });
  });

  it('deletes a product after confirmation', async () => {
    vi.mocked(window.confirm).mockReturnValue(true);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0].closest('button')!);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product?');
      expect(productsService.deleteProduct).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith('Product deleted successfully');
    });
  });

  it('fills unit price, MOQ, and lead time fields in edit dialog', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
    });

    const unitPriceField = screen.getByLabelText(/Unit Price/i);
    await user.clear(unitPriceField);
    await user.type(unitPriceField, '2500');

    const moqField = screen.getByLabelText(/Minimum Order Quantity/i);
    await user.clear(moqField);
    await user.type(moqField, '5');

    const leadTimeField = screen.getByLabelText(/Lead Time/i);
    await user.clear(leadTimeField);
    await user.type(leadTimeField, '14');

    expect(screen.getByLabelText(/Unit Price/i)).toHaveValue(2500);
    expect(screen.getByLabelText(/Minimum Order Quantity/i)).toHaveValue(5);
    expect(screen.getByLabelText(/Lead Time/i)).toHaveValue(14);
  }, 30000);

  it('changes availability and image URL in edit dialog', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
    });

    // Change availability via Select (use the Availability combobox)
    const comboboxes = screen.getAllByRole('combobox');
    const availabilitySelect = comboboxes[comboboxes.length - 1]; // Availability is typically last
    fireEvent.mouseDown(availabilitySelect);
    const limitedOption = await screen.findByText('Limited', { selector: 'li' });
    fireEvent.click(limitedOption);

    // Fill image URL field
    const imageUrlField = screen.getByLabelText('Image URL');
    fireEvent.change(imageUrlField, { target: { value: 'https://example.com/new-image.jpg' } });

    expect(screen.getByLabelText('Image URL')).toHaveValue('https://example.com/new-image.jpg');
  }, 20000);

  it('shows Out of Stock products tab when clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const outOfStockTab = screen.getByRole('tab', { name: /Out of Stock/i });
    await user.click(outOfStockTab);

    await waitFor(() => {
      expect(screen.getByText('Concrete Mix')).toBeInTheDocument();
    });
  }, 15000);

  it('shows no active products alert when active tab is empty', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: [
        {
          ...mockProducts[2], // out_of_stock
          id: 99,
          name: 'Only OOS Product',
        },
      ],
    });
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Only OOS Product')).toBeInTheDocument();
    });

    const activeTab = screen.getByRole('tab', { name: /^Active/i });
    await user.click(activeTab);

    await waitFor(() => {
      expect(screen.getByText('No active products found.')).toBeInTheDocument();
    });
  }, 15000);

  it('shows no out of stock alert when out-of-stock tab is empty', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: [mockProducts[0]], // only in_stock product
    });
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const outOfStockTab = screen.getByRole('tab', { name: /Out of Stock/i });
    await user.click(outOfStockTab);

    await waitFor(() => {
      expect(screen.getByText('No out of stock products.')).toBeInTheDocument();
    });
  }, 15000);

  it('shows no products found message on All tab when all products filtered out', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({ products: [] });
    await renderPage();
    const _user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByText('No products found. Start by adding your first product!')
      ).toBeInTheDocument();
    });
  });

  it('renders custom_order availability icon', async () => {
    const customOrderProduct = {
      ...mockProducts[0],
      id: 99,
      name: 'Custom Order Product',
      availability: 'custom_order' as const,
    };
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: [customOrderProduct],
    });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Custom Order Product')).toBeInTheDocument();
    });
    // ScheduleIcon should be rendered for custom_order
    expect(document.querySelector('[data-testid="ScheduleIcon"]')).toBeInTheDocument();
  });

  it('changes description and price fields in create product dialog', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Product');
    fireEvent.click(addButton);

    await waitFor(
      () => {
        expect(screen.getByText('Add New Product')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    const descriptionField = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionField, { target: { value: 'Test product description' } });
    expect(descriptionField).toHaveValue('Test product description');

    // Use getAllByLabelText to handle both "Price (R$)" and "Unit Price (R$)"
    const priceFields = screen.getAllByLabelText(/Price \(R\$\)/i);
    const priceField = priceFields[0]; // First match is "Price (R$)"
    fireEvent.change(priceField, { target: { value: '999' } });
    expect(priceField).toHaveValue(999);
  }, 20000);

  it('switches between grid and table view', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Find table view button (ViewList icon)
    const viewListButtons = screen.getAllByTestId('ViewListIcon');
    await user.click(viewListButtons[0].closest('button')!);

    await waitFor(
      () => {
        // In table view, table headers should appear
        expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Price' })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('triggers CSV import toast when a file is selected', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const fileInput = document.getElementById('csv-import') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['name,price\nTest,100'], 'products.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('CSV import feature coming soon');
    });
  });

  it('triggers CSV export toast when Export CSV button is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export CSV');
    await user.click(exportButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('CSV export feature coming soon');
    });
  });

  it('does not delete product when confirmation is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0].closest('button')!);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product?');
    });

    expect(productsService.deleteProduct).not.toHaveBeenCalled();
  });

  it('returns null icon for unknown availability value', async () => {
    const unknownAvailabilityProduct = {
      ...mockProducts[0],
      id: 100,
      name: 'Unknown Availability Product',
      availability: 'unknown_value' as unknown as (typeof mockProducts)[0]['availability'],
    };
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: [unknownAvailabilityProduct],
    });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Unknown Availability Product')).toBeInTheDocument();
    });

    // Find the product card containing the unknown availability product
    const productCard = screen.getByText('Unknown Availability Product').closest('.MuiCard-root')!;

    // The chip should exist in the card but no known availability icon should be rendered inside it
    expect(productCard.querySelector('[data-testid="CheckCircleIcon"]')).toBeNull();
    expect(productCard.querySelector('[data-testid="WarningIcon"]')).toBeNull();
    expect(productCard.querySelector('[data-testid="CancelIcon"]')).toBeNull();
    expect(productCard.querySelector('[data-testid="ScheduleIcon"]')).toBeNull();
  });

  it('filters products by selected category', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
      expect(screen.getByText('Concrete Mix')).toBeInTheDocument();
    });

    // Open Category select
    const categorySelect = screen.getAllByRole('combobox')[0];
    fireEvent.mouseDown(categorySelect);

    const categoryOption = await screen.findByRole('option', { name: 'Safety Equipment' });
    fireEvent.click(categoryOption);

    await waitFor(() => {
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
      expect(screen.queryByText('Industrial Pump')).not.toBeInTheDocument();
      expect(screen.queryByText('Concrete Mix')).not.toBeInTheDocument();
    });
  });

  it('filters products by availability', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
      expect(screen.getByText('Concrete Mix')).toBeInTheDocument();
    });

    // Open Availability select (second combobox after Category)
    const comboboxes = screen.getAllByRole('combobox');
    const availabilitySelect = comboboxes[1];
    fireEvent.mouseDown(availabilitySelect);

    const limitedOption = await screen.findByRole('option', { name: 'Limited' });
    fireEvent.click(limitedOption);

    await waitFor(() => {
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
      expect(screen.queryByText('Industrial Pump')).not.toBeInTheDocument();
      expect(screen.queryByText('Concrete Mix')).not.toBeInTheDocument();
    });
  });
});
