import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from '../utils/languages/en.json';
import polish from '../utils/languages/pl.json';
import russian from '../utils/languages/ru.json';
import ukrainian from '../utils/languages/uk.json';

const defaultLanguage =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('belcka_language') || 'en'
    : 'en';

type TranslationResource = Record<string, unknown>;

const NUMERIC_ALIAS_PATTERN = /^[\d\s.,:\/()+\-–—%£$€]+$/;

const isSafeAliasKey = (key: string) => {
  const trimmedKey = key.trim();

  return Boolean(trimmedKey && !NUMERIC_ALIAS_PATTERN.test(trimmedKey));
};

const flattenTranslations = (
  source: TranslationResource,
  prefix = '',
  output: Record<string, string> = {},
) => {
  Object.entries(source).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      output[nextKey] = value;

      const keyParts = nextKey.split('.');

      keyParts.forEach((_, index) => {
        const suffixKey = keyParts.slice(index).join('.');

        if (isSafeAliasKey(suffixKey) && !Object.prototype.hasOwnProperty.call(output, suffixKey)) {
          output[suffixKey] = value;
        }
      });

      if (isSafeAliasKey(key) && !Object.prototype.hasOwnProperty.call(output, key)) {
        output[key] = value;
      }

      return;
    }

    if (value && typeof value === 'object') {
      flattenTranslations(value as TranslationResource, nextKey, output);
    }
  });

  return output;
};

const buildTranslationResource = (source: TranslationResource) => ({
  ...source,
  ...flattenTranslations(source),
});

const resources = {
  en: {
    translation: buildTranslationResource(english),
  },
  pl: {
    translation: buildTranslationResource(polish),
  },
  ru: {
    translation: buildTranslationResource(russian),
  },
  uk: {
    translation: buildTranslationResource(ukrainian),
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
