import { describe, expect, it } from 'vitest';
import { parseCsv } from '../csvParse';
import { toProductsCsv } from '../productCsv';
import type { Product } from '@shared/types';

describe('parseCsv', () => {
  it('reads quoted commas, doubled quotes, CRLF and line breaks inside quotes', () => {
    const text = '\uFEFFname,description\r\n"Bolt, M8","Say ""hi""\nthen go"\r\nNut,plain\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      { name: 'Bolt, M8', description: 'Say "hi"\nthen go' },
      { name: 'Nut', description: 'plain' },
    ]);
  });

  it('fills missing trailing fields and trims header names', () => {
    expect(parseCsv(' name , price \nA')).toEqual([{ name: 'A', price: '' }]);
  });

  it('returns nothing for an empty file or a header alone', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('name,price')).toEqual([]);
  });

  it('reads back what the product export writes', () => {
    const product = {
      name: 'Rolamento "XYZ", aço',
      description: 'Linha 1\nLinha 2',
      price: 10,
      unitPrice: 10,
      imageUrl: 'https://example.com/x.png',
      category: 'components',
      supplierId: 2,
      tierPricing: [{ minQuantity: 1, maxQuantity: null, discount: 0 }],
    } as Product;

    const [row] = parseCsv(toProductsCsv([product]));
    expect(row).toMatchObject({
      name: product.name,
      description: product.description,
      price: '10',
    });
    expect(JSON.parse(row.tierPricing)).toEqual(product.tierPricing);
  });
});
