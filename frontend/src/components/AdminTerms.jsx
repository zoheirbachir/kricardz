import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

const LANGS = [
  { code: 'fr', label: 'Français', field: 'content_fr' },
  { code: 'ar', label: 'العربية', field: 'content_ar' },
  { code: 'en', label: 'English', field: 'content_en' },
];

const fmt = (d) => d ? new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleString('fr-DZ', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/* Bumps 1.0 -> 1.1, 2.3 -> 2.4 so the admin rarely has to type a version number. */
function nextVersion(versions) {
  const nums = versions.map(v => parseFloat(v.version)).filter(n => !Number.isNaN(n));
  if (!nums.length) return '1.0';
  return (Math.max(...nums) + 0.1).toFixed(1);
}

/* Terms & conditions editor: edit the wording per language, publish a new
   version (which forces every user to re-accept), and read the consent log. */
export default function AdminTerms() {
  const toast = useToast();
  const [versions, setVersions] = useState([]);
  const [editing, setEditing] = useState(null);   // full version row being edited
  const [lang, setLang] = useState('fr');
  const [consents, setConsents] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVersions = useCallback(() => {
    setLoading(true);
    return api.get('/terms/versions')
      .then(r => setVersions(r.data))
      .catch(() => toast({ type: 'error', message: 'Échec du chargement des versions.' }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const open = async (id) => {
    try {
      const { data } = await api.get(`/terms/versions/${id}`);
      setEditing(data);
    } catch { toast({ type: 'error', message: 'Version introuvable.' }); }
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/terms/versions/${editing.id}`, {
        content_fr: editing.content_fr, content_ar: editing.content_ar, content_en: editing.content_en,
      });
      toast({ type: 'success', message: 'Contenu enregistré.' });
      loadVersions();
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || "Échec de l'enregistrement." });
    } finally { setBusy(false); }
  };

  /* A new version copies the current wording so the admin edits a diff, not a blank page. */
  const createDraft = async () => {
    const base = versions.find(v => v.published) || versions[0];
    const version = window.prompt('Numéro de la nouvelle version :', nextVersion(versions));
    if (!version) return;
    setBusy(true);
    try {
      let content = { content_fr: '', content_ar: '', content_en: '' };
      if (base) {
        const { data } = await api.get(`/terms/versions/${base.id}`);
        content = { content_fr: data.content_fr, content_ar: data.content_ar, content_en: data.content_en };
      }
      const { data } = await api.post('/terms/versions', { version: version.trim(), ...content });
      await loadVersions();
      setEditing(data);
      toast({ type: 'success', message: `Brouillon ${data.version} créé. Publiez-le une fois relu.` });
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || 'Échec de la création.' });
    } finally { setBusy(false); }
  };

  const publish = async (v) => {
    if (!window.confirm(
      `Publier la version ${v.version} ?\n\nTous les utilisateurs devront accepter cette nouvelle version à leur prochaine connexion.`
    )) return;
    setBusy(true);
    try {
      await api.post(`/terms/versions/${v.id}/publish`);
      toast({ type: 'success', message: `Version ${v.version} publiée. Réacceptation demandée aux utilisateurs.` });
      loadVersions();
      if (editing?.id === v.id) open(v.id);
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || 'Échec de la publication.' });
    } finally { setBusy(false); }
  };

  const loadConsents = async () => {
    if (consents) { setConsents(null); return; }   // toggle closed
    try {
      const { data } = await api.get('/terms/consents');
      setConsents(data);
    } catch { toast({ type: 'error', message: 'Échec du chargement du journal.' }); }
  };

  const field = LANGS.find(l => l.code === lang).field;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Conditions générales</h2>
            <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
              Modifiez le texte des conditions dans les trois langues. Publier une nouvelle version
              oblige chaque utilisateur à l'accepter de nouveau — la version acceptée est enregistrée
              avec chaque inscription et chaque réservation.
            </p>
          </div>
          <button onClick={createDraft} disabled={busy} className="btn-primary text-sm whitespace-nowrap">
            Nouvelle version
          </button>
        </div>

        {loading && <div className="mt-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-9 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>}

        {!loading && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pe-3 font-medium">Version</th>
                  <th className="py-2 pe-3 font-medium">État</th>
                  <th className="py-2 pe-3 font-medium">Créée</th>
                  <th className="py-2 pe-3 font-medium">Publiée</th>
                  <th className="py-2 font-medium text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v, i) => {
                  const inForce = v.published && !versions.slice(0, i).some(o => o.published);
                  return (
                    <tr key={v.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="py-2.5 pe-3 font-semibold text-gray-900 dark:text-white">{v.version}</td>
                      <td className="py-2.5 pe-3">
                        {inForce ? <span className="badge-pine">En vigueur</span>
                          : v.published ? <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Archivée</span>
                            : <span className="badge-honey">Brouillon</span>}
                      </td>
                      <td className="py-2.5 pe-3 text-gray-500">{fmt(v.created_at)}</td>
                      <td className="py-2.5 pe-3 text-gray-500">{fmt(v.published_at)}</td>
                      <td className="py-2.5 text-end whitespace-nowrap">
                        <button onClick={() => open(v.id)} className="text-primary-600 hover:underline font-medium">Modifier</button>
                        {!v.published && (
                          <button onClick={() => publish(v)} disabled={busy} className="ms-3 text-primary-600 hover:underline font-medium">Publier</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!versions.length && <tr><td colSpan={5} className="py-4 text-gray-400">Aucune version.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor */}
      {editing && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Version {editing.version}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Mise en forme légère : <code># Titre</code>, <code>## Sous-titre</code>, <code>- puce</code>.
              </p>
            </div>
            <div className="flex gap-1.5">
              {LANGS.map(l => (
                <button key={l.code} type="button" onClick={() => setLang(l.code)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    lang === l.code ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="input font-mono text-[13px] leading-relaxed h-[26rem]"
            value={editing[field] || ''}
            onChange={e => setEditing(t => ({ ...t, [field]: e.target.value }))}
          />

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={save} disabled={busy} className="btn-primary text-sm">
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {!editing.published && (
              <button onClick={() => publish(editing)} disabled={busy} className="btn-secondary text-sm">
                Publier cette version
              </button>
            )}
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Fermer</button>
          </div>
        </div>
      )}

      {/* Consent audit log — the evidence trail for a dispute */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Journal des consentements</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Chaque acceptation est horodatée avec l'adresse IP, le navigateur et la version acceptée.
            </p>
          </div>
          <button onClick={loadConsents} className="btn-secondary text-sm whitespace-nowrap">
            {consents ? 'Masquer' : 'Afficher le journal'}
          </button>
        </div>

        {consents && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pe-3 font-medium">Date</th>
                  <th className="py-2 pe-3 font-medium">Utilisateur</th>
                  <th className="py-2 pe-3 font-medium">Contexte</th>
                  <th className="py-2 pe-3 font-medium">Version</th>
                  <th className="py-2 pe-3 font-medium">IP</th>
                  <th className="py-2 font-medium">Réservation</th>
                </tr>
              </thead>
              <tbody>
                {consents.map(c => (
                  <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2.5 pe-3 text-gray-500 whitespace-nowrap">{fmt(c.created_at)}</td>
                    <td className="py-2.5 pe-3">
                      <div className="text-gray-900 dark:text-white">{c.user_name}</div>
                      <div className="text-xs text-gray-500">{c.user_email}</div>
                    </td>
                    <td className="py-2.5 pe-3">
                      <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{c.context}</span>
                    </td>
                    <td className="py-2.5 pe-3 font-medium">{c.terms_version}</td>
                    <td className="py-2.5 pe-3 text-gray-500 font-mono text-xs">{c.ip || '—'}</td>
                    <td className="py-2.5 text-xs">
                      {c.booking_id
                        ? <span className="font-mono text-gray-500">{c.booking_id.slice(0, 8)}…</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
                {!consents.length && <tr><td colSpan={6} className="py-4 text-gray-400">Aucun consentement enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
