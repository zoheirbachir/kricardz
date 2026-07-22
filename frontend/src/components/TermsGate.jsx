import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* Shown when the admin has published a new version of the terms: the logged-in
   user must accept it before continuing. The acceptance is logged (version, IP,
   browser, language) in the consent audit trail. */
export default function TermsGate() {
  const { user, refreshUser, logout } = useAuth();
  const { i18n } = useTranslation();
  const [terms, setTerms] = useState(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const required = Boolean(user?.terms_reaccept_required);
  const lang = ['fr', 'ar', 'en'].includes(i18n.language) ? i18n.language : 'fr';

  useEffect(() => {
    if (!required || terms) return;
    api.get('/terms/current').then(r => setTerms(r.data)).catch(() => {});
  }, [required, terms]);

  if (!required) return null;

  const accept = async () => {
    setBusy(true); setError('');
    try {
      await api.post('/terms/accept', { context: 'reaccept', lang });
      await refreshUser();
    } catch (e) {
      setError(e.response?.data?.error || "Échec de l'enregistrement. Réessayez.");
    } finally { setBusy(false); }
  };

  const content = terms?.contents?.[lang] || terms?.contents?.fr || '';

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl max-h-[88vh] flex flex-col p-5 sm:p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="mb-3">
          <p className="eyebrow mb-1.5">Mise à jour</p>
          <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">
            Nos conditions générales ont changé
          </h2>
          <p className="text-sm text-gray-500 mt-1.5">
            Version {terms?.version || user.terms_current_version} — vous devez l'accepter pour continuer à
            utiliser DzKricar.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {content || 'Chargement…'}
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            J'ai lu et j'accepte la nouvelle version des conditions générales de DzKricar.
          </span>
        </label>

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={accept} disabled={!checked || busy} className="btn-primary text-sm">
            {busy ? 'Enregistrement…' : 'Accepter et continuer'}
          </button>
          <button onClick={logout} className="btn-secondary text-sm">Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}
