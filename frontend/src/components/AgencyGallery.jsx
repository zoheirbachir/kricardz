import { useState, useEffect } from 'react';
import api, { API_ORIGIN } from '../api';
import { useToast } from '../context/ToastContext';

const mediaUrl = (p) => (p && p.startsWith('/') ? API_ORIGIN + p : p);
const MAX = 12;

/* Lets an agency owner manage the photo gallery (fleet / premises) shown on the
   public agency page. Hidden entirely if the account has no agency profile. */
export default function AgencyGallery() {
  const toast = useToast();
  const [agency, setAgency] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/agencies/mine')
      .then(r => { setAgency(r.data); setGallery(r.data.gallery || []); })
      .catch(() => setAgency(null));
  }, []);

  if (!agency) return null;

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (gallery.length + files.length > MAX) {
      toast({ type: 'error', message: `Maximum ${MAX} photos.` });
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f));
      const r = await api.post(`/agencies/${agency.id}/gallery`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGallery(r.data.gallery);
      toast({ type: 'success', message: 'Photos ajoutées.' });
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || "Échec de l'envoi." });
    } finally { setBusy(false); }
  };

  const remove = async (photo) => {
    setBusy(true);
    try {
      const r = await api.delete(`/agencies/${agency.id}/gallery`, { data: { photo } });
      setGallery(r.data.gallery);
      toast({ type: 'info', message: 'Photo supprimée.' });
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || 'Échec de la suppression.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Galerie de l'agence</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Photos de votre flotte et de vos locaux, affichées sur votre page publique. {gallery.length}/{MAX}
          </p>
        </div>
        <label className={`btn-primary text-sm shrink-0 ${busy || gallery.length >= MAX ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
          {busy ? '…' : 'Ajouter des photos'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={upload} disabled={busy || gallery.length >= MAX} />
        </label>
      </div>

      {gallery.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune photo. Ajoutez des photos pour renforcer la confiance des clients.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {gallery.map(p => (
            <div key={p} className="relative group">
              <img src={mediaUrl(p)} alt="" className="w-full h-20 object-cover rounded-lg" />
              <button type="button" onClick={() => remove(p)} disabled={busy} aria-label="Supprimer la photo"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-red-600">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
