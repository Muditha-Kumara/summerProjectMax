import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fi from './locales/fi.json';
import sv from './locales/sv.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fi: { translation: fi },
      sv: { translation: sv },
      en: { translation: en }
    },
    fallbackLng: 'fi',
    supportedLngs: ['fi', 'sv', 'en'],
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      checkWhitelist: true,
      convertDetectedLanguage: (lng) => {
        // Normalize: "en-US" → "en", "sv-FI" → "sv"
        if (!lng) return 'fi';
        const short = lng.split('-')[0].toLowerCase();
        if (['fi', 'sv', 'en'].includes(short)) return short;
        return 'fi';
      }
    }
  });

export default i18n;
