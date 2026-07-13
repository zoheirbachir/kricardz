import { useState } from 'react';
import api, { API_ORIGIN } from '../api';
import { useToast } from '../context/ToastContext';

/* Owner-only handover documentation for a confirmed booking: a video + odometer
   reading before delivery (check-in) and after return (check-out). Distance is
   computed by the backend. Calls onUpdated(updatedBooking) after each save. */
export default function HandoverControls({ booking: b, onUpdated }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [inKm, setInKm] = useState(b.checkin_km ?? '');
  const [outKm, setOutKm] = useState(b.checkout_km ?? '');
  const [inVideo, setInVideo] = useState(null);
  const [outVideo, setOutVideo] = useState(null);

  const submit = async (phase) => {
    const km = phase === 'checkin' ? inKm : outKm;
    if (km === '' || isNaN(Number(km))) { toast({ type: 'error', message: 'Indiquez le kilométrage.' }); return; }
    setBusy(phase);
    try {
      const fd = new FormData();
      fd.append(`${phase}_km`, km);
      const file = phase === 'checkin' ? inVideo : outVideo;
      if (file) fd.append(`${phase}_video`, file);
      const r = await api.post(`/bookings/${b.id}/${phase}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdated?.(r.data);
      toast({ type: 'success', message: phase === 'checkin' ? 'Livraison enregistrée.' : 'Retour enregistré.' });
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || 'Échec de l\'enregistrement.' });
    } finally { setBusy(''); }
  };

  const distance = (b.checkin_km != null && b.checkout_km != null) ? b.checkout_km - b.checkin_km : null;

  return (
    <div className="w-full mt-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="text-xs text-gray-600 hover:text-gray-900 underline">
        {open ? 'Masquer la remise' : '🚗 Remise du véhicule (vidéo + km)'}
      </button>
      {open && (
        <div className="mt-2 border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50/60">
          {[
            { phase: 'checkin', title: 'À la livraison', km: inKm, setKm: setInKm, setVideo: setInVideo, done: b.checkin_at, video: b.checkin_video },
            { phase: 'checkout', title: 'Au retour', km: outKm, setKm: setOutKm, setVideo: setOutVideo, done: b.checkout_at, video: b.checkout_video },
          ].map((p) => (
            <div key={p.phase} className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-700">{p.title} {p.done && <span className="text-pine-600 font-normal">✓ enregistré</span>}</p>
              <div className="flex items-center gap-2">
                <input type="number" min={0} className="input text-xs py-1.5 flex-1" placeholder="Kilométrage"
                  value={p.km} onChange={e => p.setKm(e.target.value)} />
                <label className="text-xs text-primary-600 cursor-pointer whitespace-nowrap">
                  🎬 Vidéo
                  <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                    onChange={e => p.setVideo(e.target.files[0] || null)} />
                </label>
                <button type="button" disabled={busy === p.phase} onClick={() => submit(p.phase)}
                  className="btn-primary text-xs py-1.5 px-2.5">{busy === p.phase ? '…' : 'Enregistrer'}</button>
              </div>
              {p.video && (
                <a href={API_ORIGIN + p.video} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-500 hover:text-primary-600">Voir la vidéo</a>
              )}
            </div>
          ))}
          {distance != null && (
            <p className="text-xs pt-1 border-t border-gray-200">Distance parcourue : <span className="font-semibold">{distance} km</span></p>
          )}
        </div>
      )}
    </div>
  );
}
