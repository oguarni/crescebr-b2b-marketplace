/**
 * Display labels for catalogue data.
 *
 * Product categories and specification keys are stored values: the API filters
 * on them and suppliers create them, so they are never rewritten. These helpers
 * only change how a value is shown, which keeps filtering and stored data
 * untouched in every language.
 */

import type { Translate } from '../contexts/LanguageContext';
import type { TranslationKey } from '../locales';

/**
 * Renders a category in the active language when it belongs to the seeded
 * taxonomy (`categories.*` in the dictionaries), and as stored otherwise.
 * Suppliers can still create free-form categories, and those have no
 * translation to look up.
 *
 * @example
 * categoryLabel(t, 'Machinery'); // 'Máquinas' under pt
 * categoryLabel(t, 'Valves'); // 'Valves' (not part of the taxonomy)
 */
export const categoryLabel = (t: Translate, category: string): string => {
  const key = `categories.${category}`;
  // `t` falls back to the raw key when a path is missing, so getting the key
  // back means the category is not part of the translated taxonomy.
  const label = t(key as TranslationKey);
  return label === key ? category : label;
};

/**
 * Turns a specification key such as `flashPoint` or `io_count` into a
 * readable label ("Flash point", "Io count").
 */
export const formatSpecLabel = (key: string): string => {
  const words = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
