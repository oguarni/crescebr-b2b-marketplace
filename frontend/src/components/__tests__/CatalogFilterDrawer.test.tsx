import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CatalogFilterDrawer from '../catalog/CatalogFilterDrawer';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '../../utils/catalogFilters';

const renderDrawer = (
  props: Partial<React.ComponentProps<typeof CatalogFilterDrawer>> = {},
  language: 'pt' | 'en' = 'en'
) => {
  const onFiltersChange = vi.fn<(filters: CatalogFilters) => void>();
  render(
    <LanguageProvider initialLanguage={language}>
      <CatalogFilterDrawer
        open
        onClose={vi.fn()}
        filters={DEFAULT_CATALOG_FILTERS}
        onFiltersChange={onFiltersChange}
        specs={{}}
        resultCount={20}
        activeCount={0}
        {...props}
      />
    </LanguageProvider>
  );
  return { onFiltersChange, dialog: screen.getByRole('dialog', { name: /Filters|Filtros/ }) };
};

describe('CatalogFilterDrawer', () => {
  it('applies a slider value once it is set, leaving the other filters alone', () => {
    const { onFiltersChange, dialog } = renderDrawer();

    // Keyboard and assistive input reach the slider through its range input,
    // which reports a change and a commit together.
    fireEvent.change(within(dialog).getByRole('slider', { name: 'Price Range: maximum' }), {
      target: { value: 5000 },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CATALOG_FILTERS,
      priceRange: [0, 5000],
    });

    fireEvent.change(within(dialog).getByRole('slider', { name: 'Minimum Order (MOQ): minimum' }), {
      target: { value: 11 },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CATALOG_FILTERS,
      moqRange: [11, 1000],
    });

    fireEvent.change(within(dialog).getByRole('slider', { name: 'Max Lead Time' }), {
      target: { value: 7 },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CATALOG_FILTERS,
      maxLeadTime: 7,
    });
  });

  it('describes the applied values in Portuguese', () => {
    const { dialog } = renderDrawer(
      {
        filters: {
          ...DEFAULT_CATALOG_FILTERS,
          priceRange: [0, 5000],
          moqRange: [1, 1],
          maxLeadTime: 1,
        },
        activeCount: 3,
      },
      'pt'
    );

    expect(within(dialog).getByText('Até R$ 5.000')).toBeInTheDocument();
    expect(within(dialog).getByText('Até 1 unidade')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Até 1 dia').length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('button', { name: 'Limpar' })).toBeEnabled();
  });

  it.each([
    [null, 'Show products'],
    [0, 'No products found'],
    [1, 'Show 1 product'],
    [7, 'Show 7 products'],
  ])('labels the footer action for a result count of %s', (resultCount, label) => {
    const { dialog } = renderDrawer({ resultCount });
    expect(within(dialog).getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('hides the specification search when the catalogue has no specifications', () => {
    const { dialog } = renderDrawer();
    expect(within(dialog).queryByLabelText('Search specifications')).not.toBeInTheDocument();
  });
});
