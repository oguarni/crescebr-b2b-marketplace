/**
 * Formats a numeric amount as Brazilian Real using the pt-BR locale.
 *
 * Example: 1500 -> "R$ 1.500,00".
 *
 * Nullish or non-finite values fall back to 0 so the UI never renders
 * "R$ NaN" when a price is missing.
 */
export const formatBRL = (value: number | null | undefined): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value as number) ? (value as number) : 0);
