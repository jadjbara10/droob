// ============================================================================
// دروب (Droob) — i18n Initialization
// i18next + react-i18next, Arabic primary, English secondary
// ============================================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar';
import en from './en';

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: 'ar',
  fallbackLng: 'ar',
  returnObjects: true,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
