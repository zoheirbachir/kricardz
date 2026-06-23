import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import ar from './ar.json';
import en from './en.json';

const savedLang = localStorage.getItem('lang') || 'fr';

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, ar: { translation: ar }, en: { translation: en } },
  lng: savedLang,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

/* Apply text direction on first load (Arabic = RTL), not only when switching. */
if (typeof document !== 'undefined') {
  document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = savedLang;
}

export default i18n;
