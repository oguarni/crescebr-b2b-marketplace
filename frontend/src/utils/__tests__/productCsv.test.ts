import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@shared/types';
import { downloadCsv, toProductsCsv } from '../productCsv';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  name: 'Rolamento "XYZ"',
  description: 'Alta precisão, aço',
  price: 150,
  unitPrice: 150,
  imageUrl: 'https://example.com/a.png',
  category: 'components',
  supplierId: 2,
  tierPricing: [{ minQuantity: 1, maxQuantity: null, discount: 0.1 }],
  specifications: {},
  minimumOrderQuantity: 1,
  leadTime: 7,
  availability: 'in_stock',
  ...overrides,
});

describe('toProductsCsv', () => {
  it('writes the importer header and quotes every cell', () => {
    const [header, row] = toProductsCsv([product()]).split('\n');
    expect(header).toBe('name,description,price,imageUrl,category,supplierId,tierPricing');
    expect(row).toBe(
      '"Rolamento ""XYZ""","Alta precisão, aço","150","https://example.com/a.png","components","2","[{""minQuantity"":1,""maxQuantity"":null,""discount"":0.1}]"'
    );
  });

  it.each(['=HYPERLINK("x")', '+1', '-1', '@SUM(A1)'])(
    'neutralises a formula-looking name %p',
    name => {
      const row = toProductsCsv([product({ name })]).split('\n')[1];
      expect(row.startsWith(`"'${name.replace(/"/g, '""')}"`)).toBe(true);
    }
  );

  it('falls back to the list price and empty optional fields', () => {
    const row = toProductsCsv([
      product({
        unitPrice: undefined as unknown as number,
        description: undefined as unknown as string,
        imageUrl: undefined as unknown as string,
        category: undefined as unknown as string,
        supplierId: undefined as unknown as number,
        tierPricing: undefined as unknown as Product['tierPricing'],
      }),
    ]).split('\n')[1];
    expect(row).toBe('"Rolamento ""XYZ""","","150","","","","[]"');
  });

  it('exports only the header for an empty catalog', () => {
    expect(toProductsCsv([])).toBe(
      'name,description,price,imageUrl,category,supplierId,tierPricing'
    );
  });
});

describe('downloadCsv', () => {
  it('downloads a UTF-8 file and releases the object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:csv');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(window.HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    downloadCsv('a,b', 'produtos.csv');

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
