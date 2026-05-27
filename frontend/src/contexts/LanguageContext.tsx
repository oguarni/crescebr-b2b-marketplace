import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, DEFAULT_LANGUAGE, pt, type Language, type TranslationKey } from '../locales';

type TranslationVars = Record<string, string | number>;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
}

const STORAGE_KEY = 'crescebr_language';

const resolveKey = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);

const interpolate = (value: string, vars?: TranslationVars): string => {
  if (!vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
    name in vars ? String(vars[name]) : `{{${name}}}`
  );
};

// Resolves a key in the active language, falling back to the default language,
// then to the raw key so a missing string is never rendered as blank.
const translate = (language: Language, key: string, vars?: TranslationVars): string => {
  let value = resolveKey(dictionaries[language], key);
  if (typeof value !== 'string') {
    value = resolveKey(pt, key);
  }
  if (typeof value !== 'string') {
    return key;
  }
  return interpolate(value, vars);
};

const isLanguage = (value: string | null): value is Language => value === 'pt' || value === 'en';

const getInitialLanguage = (initial?: Language): Language => {
  if (initial) return initial;
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  }
  return DEFAULT_LANGUAGE;
};

// Default value keeps useT()/useLanguage() working outside a provider (e.g. in
// isolated component tests), resolving against the default language.
const defaultContext: LanguageContextType = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, vars) => translate(DEFAULT_LANGUAGE, key, vars),
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: Language;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<Language>(() =>
    getInitialLanguage(initialLanguage)
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    }
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = (): LanguageContextType => useContext(LanguageContext);

// eslint-disable-next-line react-refresh/only-export-components
export const useT = (): LanguageContextType['t'] => useContext(LanguageContext).t;
