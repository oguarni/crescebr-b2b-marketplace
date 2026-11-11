import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProductCard, { PREVIEW_DELAY_MS } from '../ProductCard';
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

const LocationProbe = () => <div data-testid='location'>{useLocation().pathname}</div>;

const renderCard = (onAddToCart = vi.fn()) => {
  render(
    <LanguageProvider initialLanguage='en'>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path='/'
            element={<ProductCard product={mockProduct} onAddToCart={onAddToCart} />}
          />
          <Route path='*' element={null} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </LanguageProvider>
  );
  return { onAddToCart };
};

const detailsLink = () => screen.getByRole('link', { name: /^Industrial Pump — View details/ });
const previewText = () => screen.queryByText('High-performance industrial water pump');

describe('ProductCard', () => {
  it('renders the name, category, SKU and formatted price', () => {
    renderCard();

    expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    expect(screen.getByText('Industrial Equipment')).toBeInTheDocument();
    expect(screen.getByText('SKU-42')).toBeInTheDocument();
    expect(screen.getByText(/1\.500,00/)).toBeInTheDocument();
  });

  it('links to the product details page by product id', () => {
    renderCard();

    expect(detailsLink()).toHaveAttribute('href', '/products/42');
  });

  it('navigates to the details page when the card is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(detailsLink());

    expect(screen.getByTestId('location')).toHaveTextContent('/products/42');
  });

  it('opens the details page from the keyboard', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.tab();
    expect(detailsLink()).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/products/42');
  });

  it('keeps the preview hidden until a mouse pointer rests on the card', () => {
    renderCard();

    expect(previewText()).not.toBeInTheDocument();
    expect(screen.queryByText('Lead Time')).not.toBeInTheDocument();
  });

  it('shows a preview with description, MOQ, lead time and availability on hover', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.hover(detailsLink());

    expect(await screen.findByText('High-performance industrial water pump')).toBeInTheDocument();
    expect(screen.getByText('Minimum Order (MOQ)')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    // Hovering is not a click: the visitor stays on the catalog.
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('dismisses the preview when the pointer leaves the card', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.hover(detailsLink());
    expect(await screen.findByText('High-performance industrial water pump')).toBeInTheDocument();

    await user.unhover(detailsLink());

    await waitFor(() => expect(previewText()).not.toBeInTheDocument());
  });

  describe('with a controlled clock', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    // jsdom has no PointerEvent, so fireEvent cannot set pointerType; React
    // derives enter/leave from pointerover/pointerout and reads pointerType
    // off the native event.
    const point = (type: 'pointerover' | 'pointerout', pointerType: string) => {
      const event = new MouseEvent(type, { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      act(() => {
        detailsLink().dispatchEvent(event);
      });
    };
    const advance = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms);
      });

    it('opens the preview only after the pointer has rested for the delay', () => {
      renderCard();

      point('pointerover', 'mouse');
      advance(PREVIEW_DELAY_MS - 1);
      expect(previewText()).not.toBeInTheDocument();

      advance(1);
      expect(previewText()).toBeInTheDocument();
    });

    it('does not open a preview for a pointer that only sweeps across the card', () => {
      renderCard();

      point('pointerover', 'mouse');
      advance(100);
      point('pointerout', 'mouse');
      advance(1000);

      expect(previewText()).not.toBeInTheDocument();
    });

    it('never opens a hover preview for touch input', () => {
      renderCard();

      point('pointerover', 'touch');
      advance(1000);

      expect(previewText()).not.toBeInTheDocument();
    });
  });

  it('closes the preview on Escape while focus is elsewhere on the page', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.hover(detailsLink());
    expect(await screen.findByText('High-performance industrial water pump')).toBeInTheDocument();

    // A hovering mouse leaves focus on the page body, not on the card.
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document.body, { key: 'Escape' });

    await waitFor(() => expect(previewText()).not.toBeInTheDocument());
  });

  it('adds to the quote without navigating away', async () => {
    const user = userEvent.setup();
    const { onAddToCart } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Add to quote — Industrial Pump' }));

    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('hides the add-to-quote action when showAddToCart is false', () => {
    render(
      <LanguageProvider initialLanguage='en'>
        <MemoryRouter>
          <ProductCard product={mockProduct} onAddToCart={vi.fn()} showAddToCart={false} />
        </MemoryRouter>
      </LanguageProvider>
    );

    expect(screen.queryByRole('button', { name: /Add to quote/ })).not.toBeInTheDocument();
  });
});
