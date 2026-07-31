import { useState, useEffect, useRef } from 'react';
import api, { API_ORIGIN } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const mediaUrl = (p) => (p && p.startsWith('/') ? API_ORIGIN + p : p);

/* Lets an agency owner set the large cover banner (behind/above the profile
   picture) shown on their public page. The circle photo is the account avatar,
   editable from the profile card — shown here only as a preview of the layout.
   Renders nothing for accounts without an agency profile. */
export default function AgencyCover() {
  const { user } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [agency, setAgency] = useState(null);
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/agencies/mine')
      .then(r => { setAgency(r.data); setCover(r.data.cover || null); })
      .catch(() => setAgency(null));
  }, []);

  if (!agency) return null;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ type: 'error', message: 'Choisissez une image.' }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ type: 'error', message: 'Image trop lourde (10 Mo maximum).' }); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('cover', file);
      const r = await api.post(`/agencies/${agency.id}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCover(r.data.cover);
      toast({ type: 'success', message: 'Photo de couverture mise à jour.' });
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || "Échec de l'envoi." });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/agencies/${agency.id}/cover`);
      setCover(null);
      toast({ type: 'info', message: 'Photo de couverture retirée.' });
    } catch { toast({ type: 'error', message: 'Échec de la suppression.' }); }
    finally { setBusy(false); }
  };

  const avatarUrl = user?.avatar ? mediaUrl(user.avatar) : (agency.photo ? mediaUrl(agency.photo) : null);

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Photo de couverture</h2>
          <p className="text-xs text-gray-500 mt-0.5">La grande image affichée en haut de votre page publique, derrière votre logo.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {cover && (
            <button type="button" onClick={remove} disabled={busy} className="btn-secondary text-sm">Retirer</button>
          )}
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="btn-primary text-sm">
            {busy ? '…' : cover ? 'Changer' : 'Ajouter'}
          </button>
        </div>
      </div>

      {/* Live preview matching the public card (cover + overlapping circle) */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="relative h-28 bg-gradient-to-br from-primary-500 to-honey-500">
          {cover && <img src={mediaUrl(cover)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="relative pt-9 px-5 pb-4">
          <div className="absolute -top-6 left-5 w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-md flex items-center justify-center overflow-hidden ring-1 ring-black/5">
            {avatarUrl
              ? <img src={avatarUrl} alt={agency.name} className="w-full h-full object-cover" />
              : <span className="font-display font-semibold text-2xl text-primary-600 dark:text-primary-300">{agency.name?.[0]}</span>}
          </div>
          <p className="font-semibold text-gray-900 dark:text-white truncate">{agency.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">La photo dans le cercle est votre photo de profil (modifiable en haut du tableau de bord).</p>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
