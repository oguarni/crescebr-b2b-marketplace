import type { Product } from '@shared/types';

/** The columns the CSV importer reads (backend/src/utils/csvImporter.ts), in its order. */
export const PRODUCT_CSV_COLUMNS = [
  'name',
  'description',
  'price',
  'imageUrl',
  'category',
  'supplierId',
  'tierPricing',
] as const;

/**
 * A spreadsheet treats a cell starting with one of these as a formula, so a
 * product named "=HYPERLINK(...)" would run when the file is opened (OWASP
 * "CSV injection"). Such text cells get a leading apostrophe.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

const textCell = (value: string): string =>
  `"${(FORMULA_TRIGGER.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;

const numberCell = (value: number | string | undefined | null): string =>
  value === undefined || value === null || value === '' ? '""' : `"${Number(value)}"`;

/**
 * Serialises products in the importer's format, so an export can be edited and
 * imported back. Every cell is quoted and inner quotes are doubled.
 *
 * @example toProductsCsv(products).split('\n')[0]; // 'name,description,...'
 */
export const toProductsCsv = (products: Product[]): string => {
  const rows = products.map(product =>
    [
      textCell(product.name),
      textCell(product.description ?? ''),
      numberCell(product.unitPrice ?? product.price),
      textCell(product.imageUrl ?? ''),
      textCell(product.category ?? ''),
      numberCell(product.supplierId),
      // JSON is not formula-prone: it always starts with "[".
      `"${JSON.stringify(product.tierPricing ?? []).replace(/"/g, '""')}"`,
    ].join(',')
  );
  return [PRODUCT_CSV_COLUMNS.join(','), ...rows].join('\n');
};

/** Hands the CSV to the browser as a file download. */
export const downloadCsv = (csv: string, fileName: string): void => {
  // The BOM lets Excel open accented Portuguese text as UTF-8.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
