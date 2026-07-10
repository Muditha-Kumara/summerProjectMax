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
    lng: 'fi',
    fallbackLng: 'fi',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      checkWhitelist: true
    }
  });

export default i18n;
