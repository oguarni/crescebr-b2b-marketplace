import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { dateLocaleFor } from '../utils/supplierDashboard';

interface DateFormat {
  /** 25/11/2026 under pt, 11/25/2026 under en. */
  date: (value: Date | string) => string;
  /** Date plus hour and minute, in the same locale. */
  dateTime: (value: Date | string) => string;
}

/**
 * Dates in the interface language. `toLocaleDateString()` without a locale
 * follows the browser instead, which showed US dates inside the Portuguese UI.
 *
 * @example
 * const { date } = useDateFormat();
 * date(order.createdAt); // '25/11/2026'
 */
export const useDateFormat = (): DateFormat => {
  const { language } = useLanguage();
  const locale = dateLocaleFor(language);

  return useMemo(
    () => ({
      date: value => new Date(value).toLocaleDateString(locale),
      dateTime: value =>
        new Date(value).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }),
    }),
    [locale]
  );
};
