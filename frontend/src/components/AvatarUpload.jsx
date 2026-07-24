import { useRef, useState } from 'react';
import api, { API_ORIGIN } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const mediaUrl = (p) => (p && p.startsWith('/') ? API_ORIGIN + p : p);

/* Profile picture with an upload control, available to every account.
   Shows the current avatar (or the name's initial) with a camera button that
   picks an image, uploads it and refreshes the user everywhere it's shown. */
export default function AvatarUpload({ size = 'w-16 h-16' }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ type: 'error', message: 'Choisissez une image (jpg, png, webp).' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ type: 'error', message: 'Image trop lourde (5 Mo maximum).' }); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await api.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      toast({ type: 'success', message: 'Photo de profil mise à jour.' });
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || "Échec de l'envoi de la photo." });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete('/auth/avatar');
      await refreshUser();
    } catch {
      toast({ type: 'error', message: 'Échec de la suppression.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="relative shrink-0">
      <div className={`${size} rounded-full overflow-hidden bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-display font-semibold text-2xl`}>
        {user?.avatar
          ? <img src={mediaUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
          : user?.name?.[0]?.toUpperCase()}
      </div>

      {/* Camera button */}
      <button type="button" onClick={pick} disabled={busy} aria-label="Changer la photo de profil"
        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-900 hover:bg-primary-600 disabled:opacity-60">
        {busy
          ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      </button>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {user?.avatar && !busy && (
        <button type="button" onClick={remove}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-700/80 text-white flex items-center justify-center text-xs hover:bg-red-600" aria-label="Retirer la photo">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}
