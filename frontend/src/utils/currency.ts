/**
 * Formats a monetary amount as Brazilian Real using the pt-BR locale.
 *
 * Example: 1500 -> "R$ 1.500,00".
 *
 * Accepts strings as well as numbers because Sequelize returns DECIMAL columns
 * (price, unitPrice, totalAmount, ...) as strings under PostgreSQL — e.g.
 * "1500.00". `Number.isFinite` does not coerce strings, so without parsing,
 * every price would fall back to 0 and render "R$ 0,00".
 *
 * Nullish or non-finite values fall back to 0 so the UI never renders "R$ NaN".
 */
export const formatBRL = (value: number | string | null | undefined): string => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numeric as number) ? (numeric as number) : 0);
};
