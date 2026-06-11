import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from '../ProductCard';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { Product } from '@shared/types';

const mockProduct: Product = {
  id: 42,
  name: 'Industrial Pump',
  description: 'High-performance industrial water pump',
  price: 1500.0,
  imageUrl: 'https://example.com/pump.jpg',
  category: 'Industrial Equipment',
  supplierId: 7,
  unitPrice: 1500.0,
  minimumOrderQuantity: 5,
  leadTime: 14,
  availability: 'in_stock',
  specifications: { material: 'steel', voltage: '220V' },
  tierPricing: [],
};

const renderCard = (onAddToCart = vi.fn()) => {
  render(
    <LanguageProvider initialLanguage='en'>
      <ProductCard product={mockProduct} onAddToCart={onAddToCart} />
    </LanguageProvider>
  );
  return { onAddToCart };
};

describe('ProductCard', () => {
  it('renders the name, category, SKU and formatted price', () => {
    renderCard();

    expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    expect(screen.getByText('Industrial Equipment')).toBeInTheDocument();
    expect(screen.getByText('SKU-42')).toBeInTheDocument();
    expect(screen.getByText(/1\.500,00/)).toBeInTheDocument();
  });

  it('keeps detailed information hidden until the card is clicked', () => {
    renderCard();

    // Collapse uses unmountOnExit, so details are absent before expanding.
    expect(screen.queryByText('High-performance industrial water pump')).not.toBeInTheDocument();
    expect(screen.queryByText('Lead Time')).not.toBeInTheDocument();
  });

  it('reveals description, lead time, availability and specs when clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    // The accessible name is "<product> — View details"; anchoring distinguishes
    // the expand trigger from the "Add to quote — <product>" icon button.
    const trigger = screen.getByRole('button', { name: /^Industrial Pump/i });
    await user.click(trigger);

    expect(await screen.findByText('High-performance industrial water pump')).toBeInTheDocument();
    expect(screen.getByText('Lead Time')).toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('material: steel')).toBeInTheDocument();
  });

  it('calls onAddToCart with the product when the add button is clicked', async () => {
    const user = userEvent.setup();
    const { onAddToCart } = renderCard();

    const addButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="AddShoppingCartIcon"]'));
    expect(addButton).toBeDefined();

    await user.click(addButton!);
    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
  });
});
