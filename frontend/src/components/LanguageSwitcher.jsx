import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const langs = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'ar', label: 'AR', flag: '🇩🇿' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = langs.find(l => l.code === i18n.language) || langs[0];

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 border border-gray-200">
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[100px]">
          {langs.map(l => (
            <button key={l.code} onClick={() => change(l.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${l.code === i18n.language ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}>
              <span>{l.flag}</span><span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
