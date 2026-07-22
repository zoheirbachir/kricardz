import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];

/* The terms are stored as light markdown (# / ## headings, - bullets) so an admin
   can edit them from the dashboard without touching code. */
function renderMarkdown(text) {
  if (!text) return null;
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    const flush = () => { if (list) { blocks.push(<ul key={`u${i}`} className="list-disc ps-6 space-y-1.5 text-gray-600 dark:text-gray-300">{list}</ul>); list = null; } };
    if (!line) { flush(); return; }
    if (line.startsWith('## ')) {
      flush();
      blocks.push(<h2 key={i} className="font-display text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      flush();
      blocks.push(<h1 key={i} className="section-title mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ')) {
      (list ||= []).push(<li key={i}>{line.slice(2)}</li>);
    } else {
      flush();
      blocks.push(<p key={i} className="text-gray-600 dark:text-gray-300 leading-relaxed text-[15px] mb-3">{line}</p>);
    }
  });
  if (list) blocks.push(<ul key="ul-last" className="list-disc ps-6 space-y-1.5 text-gray-600 dark:text-gray-300">{list}</ul>);
  return blocks;
}

export default function Terms() {
  const { i18n } = useTranslation();
  const [terms, setTerms] = useState(null);
  const [lang, setLang] = useState(() => (['fr', 'ar', 'en'].includes(i18n.language) ? i18n.language : 'fr'));
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/terms/current')
      .then(r => setTerms(r.data))
      .catch(() => setError("Les conditions ne sont pas disponibles pour le moment."));
  }, []);

  const content = terms?.contents?.[lang] || terms?.contents?.fr;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow mb-1.5">Mentions légales</p>
          <h1 className="section-title">Conditions générales</h1>
          {terms && (
            <p className="text-sm text-gray-400 mt-1.5">
              Version {terms.version}
              {terms.published_at ? ` · publiée le ${new Date(terms.published_at).toLocaleDateString('fr-FR')}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          {LANGS.map(l => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                lang === l.code
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!terms && !error && (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-4 rounded skeleton bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      )}
      {content && <div className="mt-2">{renderMarkdown(content)}</div>}
    </div>
  );
}
