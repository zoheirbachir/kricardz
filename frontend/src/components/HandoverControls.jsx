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

  /* Best-effort device position, recorded as proof of place. Resolves to null if
     the user denies it or the browser has no geolocation. */
  const getPosition = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });

  const submit = async (phase) => {
    const km = phase === 'checkin' ? inKm : outKm;
    if (km === '' || isNaN(Number(km))) { toast({ type: 'error', message: 'Indiquez le kilométrage.' }); return; }
    const file = phase === 'checkin' ? inVideo : outVideo;
    /* The video is the dispute evidence and is required; it can't be added later
       because the record is locked once saved. */
    if (!file) { toast({ type: 'error', message: 'La vidéo du véhicule est obligatoire.' }); return; }
    setBusy(phase);
    try {
      const pos = await getPosition();
      const fd = new FormData();
      fd.append(`${phase}_km`, km);
      fd.append(`${phase}_video`, file);
      if (pos) { fd.append('lat', pos.lat); fd.append('lng', pos.lng); }
      const r = await api.post(`/bookings/${b.id}/${phase}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdated?.(r.data);
      toast({
        type: 'success',
        message: (phase === 'checkin' ? 'Livraison enregistrée.' : 'Retour enregistré.') + (pos ? '' : ' (position GPS indisponible)'),
      });
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
              <p className="text-xs font-semibold text-gray-700">{p.title} {p.done && <span className="text-pine-600 font-normal">✓ enregistré · verrouillé</span>}</p>
              {p.done ? (
                /* Locked: an immutable record can't be re-recorded. */
                <div className="text-[11px] text-gray-500 space-y-0.5">
                  {p.km != null && <div>Kilométrage : <span className="font-medium text-gray-700">{p.km} km</span></div>}
                  {p.video && (
                    <a href={API_ORIGIN + p.video} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-600">🎬 Voir la vidéo</a>
                  )}
                </div>
              ) : (
                <>
                  <input type="number" min={0} className="input text-xs py-1.5 w-full" placeholder="Kilométrage (km)"
                    value={p.km} onChange={e => p.setKm(e.target.value)} />

                  {/* Clear, obvious upload button. Turns green with the file name once a video is chosen. */}
                  {(() => {
                    const file = p.phase === 'checkin' ? inVideo : outVideo;
                    return (
                      <label className={`flex items-center gap-2 w-full cursor-pointer rounded-lg border-2 border-dashed px-3 py-2.5 transition-colors ${
                        file
                          ? 'border-pine-400 bg-pine-50 text-pine-700 dark:bg-pine-500/10'
                          : 'border-primary-300 bg-primary-50/60 text-primary-700 hover:border-primary-500 hover:bg-primary-50 dark:bg-primary-500/10 dark:text-primary-300'}`}>
                        {file ? (
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                        <span className="text-xs font-medium truncate">
                          {file ? file.name : 'Ajouter une vidéo du véhicule'}
                        </span>
                        {!file && <span className="text-[10px] text-primary-500/80 ms-auto shrink-0">Appuyez ici</span>}
                        <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" capture="environment" className="hidden"
                          onChange={e => p.setVideo(e.target.files[0] || null)} />
                      </label>
                    );
                  })()}

                  <button type="button" disabled={busy === p.phase} onClick={() => submit(p.phase)}
                    className="btn-primary text-xs py-2 w-full justify-center">{busy === p.phase ? 'Enregistrement…' : 'Enregistrer'}</button>
                  <p className="text-[10px] text-gray-400">Vidéo obligatoire · position GPS enregistrée · non modifiable après enregistrement.</p>
                </>
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
