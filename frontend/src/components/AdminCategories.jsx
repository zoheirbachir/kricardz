import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

const empty = { label_fr: '', label_ar: '', label_en: '' };

/* Admin management of the vehicle/activity categories. Add, rename (per language),
   enable/disable, reorder and delete. Everything here drives the registration and
   car forms and the search filters live — no code change needed to add a service. */
export default function AdminCategories() {
  const toast = useToast();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null); // {id, label_fr, label_ar, label_en}

  const load = useCallback(() => {
    setLoading(true);
    api.get('/categories/all')
      .then(r => setCats(r.data))
      .catch(() => toast({ type: 'error', message: 'Échec du chargement des catégories.' }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!draft.label_fr.trim()) { toast({ type: 'error', message: 'Le nom (français) est requis.' }); return; }
    setBusy(true);
    try {
      await api.post('/categories', draft);
      setDraft(empty);
      toast({ type: 'success', message: 'Catégorie ajoutée.' });
      load();
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || "Échec de l'ajout." });
    } finally { setBusy(false); }
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await api.put(`/categories/${editing.id}`, {
        label_fr: editing.label_fr, label_ar: editing.label_ar, label_en: editing.label_en,
      });
      setEditing(null);
      toast({ type: 'success', message: 'Catégorie mise à jour.' });
      load();
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || "Échec de l'enregistrement." });
    } finally { setBusy(false); }
  };

  const toggle = async (c) => {
    try {
      await api.put(`/categories/${c.id}`, { active: !c.active });
      load();
    } catch { toast({ type: 'error', message: "Échec de l'opération." }); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Supprimer la catégorie « ${c.label_fr} » ?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      toast({ type: 'success', message: 'Catégorie supprimée.' });
      load();
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || 'Suppression impossible.' });
    }
  };

  /* Reorder by swapping with the neighbour, then persist the whole order. */
  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= cats.length) return;
    const next = [...cats];
    [next[idx], next[j]] = [next[j], next[idx]];
    setCats(next);
    try { await api.post('/categories/reorder', { order: next.map(c => c.id) }); }
    catch { toast({ type: 'error', message: 'Échec du réordonnancement.' }); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white">Catégories de véhicules et d'activités</h2>
        <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
          Gérez la liste proposée aux propriétaires et agences à l'inscription et sur chaque annonce.
          Les changements apparaissent immédiatement sur le site et l'application, sans intervention technique.
        </p>

        {/* Add form */}
        <form onSubmit={add} className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nom (Français) *</label>
            <input className="input" value={draft.label_fr} onChange={e => setDraft(d => ({ ...d, label_fr: e.target.value }))} placeholder="Ex : Voitures de sport" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الاسم (عربي)</label>
            <input className="input" dir="rtl" value={draft.label_ar} onChange={e => setDraft(d => ({ ...d, label_ar: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Name (English)</label>
            <input className="input" value={draft.label_en} onChange={e => setDraft(d => ({ ...d, label_en: e.target.value }))} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary text-sm whitespace-nowrap">Ajouter</button>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Ordre</th>
                  <th className="py-2.5 pe-3 font-medium">Français</th>
                  <th className="py-2.5 pe-3 font-medium">العربية</th>
                  <th className="py-2.5 pe-3 font-medium">English</th>
                  <th className="py-2.5 pe-3 font-medium">Véhicules</th>
                  <th className="py-2.5 pe-3 font-medium">État</th>
                  <th className="py-2.5 px-4 font-medium text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-primary-600 disabled:opacity-30 leading-none" aria-label="Monter">▲</button>
                        <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="text-gray-400 hover:text-primary-600 disabled:opacity-30 leading-none" aria-label="Descendre">▼</button>
                      </div>
                    </td>
                    {editing?.id === c.id ? (
                      <>
                        <td className="py-2 pe-3"><input className="input py-1 text-sm" value={editing.label_fr} onChange={e => setEditing(x => ({ ...x, label_fr: e.target.value }))} /></td>
                        <td className="py-2 pe-3"><input className="input py-1 text-sm" dir="rtl" value={editing.label_ar || ''} onChange={e => setEditing(x => ({ ...x, label_ar: e.target.value }))} /></td>
                        <td className="py-2 pe-3"><input className="input py-1 text-sm" value={editing.label_en || ''} onChange={e => setEditing(x => ({ ...x, label_en: e.target.value }))} /></td>
                        <td className="py-2 pe-3 text-gray-500">{c.cars}</td>
                        <td className="py-2 pe-3" />
                        <td className="py-2 px-4 text-end whitespace-nowrap">
                          <button onClick={saveEdit} disabled={busy} className="text-primary-600 font-medium hover:underline">Enregistrer</button>
                          <button onClick={() => setEditing(null)} className="ms-3 text-gray-500 hover:underline">Annuler</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 pe-3 font-medium text-gray-900 dark:text-white">{c.label_fr}</td>
                        <td className="py-2.5 pe-3 text-gray-600 dark:text-gray-300" dir="rtl">{c.label_ar || '—'}</td>
                        <td className="py-2.5 pe-3 text-gray-600 dark:text-gray-300">{c.label_en || '—'}</td>
                        <td className="py-2.5 pe-3 text-gray-500">{c.cars}</td>
                        <td className="py-2.5 pe-3">
                          {c.active
                            ? <span className="badge-pine">Active</span>
                            : <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">Désactivée</span>}
                        </td>
                        <td className="py-2.5 px-4 text-end whitespace-nowrap">
                          <button onClick={() => setEditing({ id: c.id, label_fr: c.label_fr, label_ar: c.label_ar, label_en: c.label_en })} className="text-primary-600 font-medium hover:underline">Modifier</button>
                          <button onClick={() => toggle(c)} className="ms-3 text-gray-600 dark:text-gray-300 hover:underline">{c.active ? 'Désactiver' : 'Activer'}</button>
                          <button onClick={() => remove(c)} className="ms-3 text-red-600 hover:underline" title={c.cars > 0 ? 'Utilisée par des véhicules — désactivez-la' : ''}>Supprimer</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
