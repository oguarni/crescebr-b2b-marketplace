import { pt } from './pt';
import { en } from './en';

export type Language = 'pt' | 'en';

export const DEFAULT_LANGUAGE: Language = 'pt';

export const dictionaries: Record<Language, typeof pt> = { pt, en };

// Recursively builds the union of dot-separated key paths (e.g. 'login.title').
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DotPaths<typeof pt>;

export { pt, en };
