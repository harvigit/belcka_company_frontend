import { useTranslation } from 'react-i18next';
import i18n from '@/utils/i18n';

export type TranslationValues = Record<string, string | number | boolean | null | undefined>;

const INTERPOLATION_PATTERN = /{{\s*[\w.]+\s*}}/;
const NUMERIC_TEXT_PATTERN = /^[\d\s.,:\/()+\-–—%£$€]+$/;

const isStaticTranslationCandidate = (value: string) => {
  const trimmedValue = value.trim();

  return Boolean(
    trimmedValue &&
    !INTERPOLATION_PATTERN.test(trimmedValue) &&
    !NUMERIC_TEXT_PATTERN.test(trimmedValue),
  );
};

const getTranslationResources = (): Record<string, any> => {
  return ((i18n as any).store?.data || (i18n as any).services?.resourceStore?.data || {}) as Record<string, any>;
};

const flattenTranslations = (
  value: unknown,
  prefix = '',
  result: Record<string, string> = {},
) => {
  if (typeof value === 'string') {
    result[prefix] = value;
    return result;
  }

  if (!value || typeof value !== 'object') return result;

  Object.entries(value as Record<string, unknown>).forEach(([key, childValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    flattenTranslations(childValue, nextKey, result);
  });

  return result;
};

let cachedLookupLanguage = '';
let cachedLookup: Map<string, string> | null = null;

export const getStaticTranslationLookup = () => {
  const resources = getTranslationResources();
  const cacheKey = Object.keys(resources).sort().join('|');

  if (cachedLookup && cachedLookupLanguage === cacheKey) {
    return cachedLookup;
  }

  const lookup = new Map<string, string>();

  Object.values(resources).forEach((languageResource: any) => {
    const translations = flattenTranslations(languageResource?.translation || {});

    Object.entries(translations).forEach(([key, value]) => {
      const cleanKey = key.trim();
      const cleanValue = value.trim();

      if (isStaticTranslationCandidate(cleanKey)) {
        lookup.set(cleanKey, key);
      }

      if (isStaticTranslationCandidate(cleanValue)) {
        lookup.set(cleanValue, key);
      }
    });
  });

  cachedLookup = lookup;
  cachedLookupLanguage = cacheKey;

  return lookup;
};

export const translateStaticText = (value: string) => {
  const trimmedValue = value.trim();
  if (!isStaticTranslationCandidate(trimmedValue)) return value;

  const key = getStaticTranslationLookup().get(trimmedValue);
  if (!key) return value;

  const translatedValue = i18n.t(key);
  if (typeof translatedValue !== 'string' || !translatedValue || translatedValue === value) {
    return value;
  }

  return value.replace(trimmedValue, translatedValue);
};

export const translateColumnLabel = (headerOrLabel: unknown, fallback = '') => {
  if (typeof headerOrLabel !== 'string' || !headerOrLabel.trim()) {
    return fallback ? translateStaticText(fallback) : fallback;
  }

  return translateStaticText(headerOrLabel);
};

export const useT = () => {
  const { t } = useTranslation();

  return (key: string, values?: TranslationValues) => t(key, values);
};
