import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

/* Documents a user can send. Only the ones that apply to them are offered:
   agencies also send a commercial register, renters a driving licence. */
const FIELDS = [
  ['front_image', "Pièce d'identité — recto"],
  ['back_image', "Pièce d'identité — verso"],
  ['driving_license_front', 'Permis de conduire — recto'],
  ['driving_license_back', 'Permis de conduire — verso'],
  ['agency_commercial_register', 'Registre de commerce', 'agency'],
  ['selfie_image', 'Selfie avec la pièce'],
];

/* Lets a user (re)send their identity documents.

   Documents used to be accepted only at registration, so a user whose files were
   lost — they were stored inside the deploy folder and erased on each redeploy —
   had no way to restore their account. */
export default function KycReupload({ missing = [], onDone }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);

  const isAgency = user?.lessor_type === 'agency' || user?.role === 'owner';
  const fields = FIELDS.filter(([, , only]) => !only || (only === 'agency' && isAgency));
  const chosen = Object.keys(files).filter(k => files[k]);

  const submit = async (e) => {
    e.preventDefault();
    if (!chosen.length) { toast({ type: 'error', message: 'Choisissez au moins un document.' }); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      for (const k of chosen) fd.append(k, files[k]);
      await api.post('/auth/kyc-documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ type: 'success', message: 'Documents envoyés. Ils seront vérifiés par notre équipe.' });
      setFiles({});
      await refreshUser();
      onDone?.();
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || "Échec de l'envoi. Réessayez." });
    } finally { setBusy(false); }
  };

  const label = (key, text) => missing.includes(key) ? `${text} — à renvoyer` : text;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(([key, text]) => (
          <div key={key}>
            <label className={`block text-xs font-medium mb-1.5 ${missing.includes(key) ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
              {label(key, text)}
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setFiles(f => ({ ...f, [key]: e.target.files?.[0] || null }))}
              className="block w-full text-xs text-gray-500 file:me-3 file:py-1.5 file:px-3 file:rounded-lg
                         file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-600
                         hover:file:bg-primary-100 dark:file:bg-primary-500/15 dark:file:text-primary-300"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={busy || !chosen.length} className="btn-primary text-sm disabled:opacity-60">
          {busy ? 'Envoi…'
            : chosen.length ? `Envoyer ${chosen.length} document${chosen.length > 1 ? 's' : ''}`
              : 'Envoyer les documents'}
        </button>
        <span className="text-xs text-gray-500">Images ou PDF, 8 Mo maximum par fichier.</span>
      </div>
    </form>
  );
}
