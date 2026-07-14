import { useEffect, useState } from 'react';
import { API_ORIGIN } from '../api';

/* Shows a private, auth-gated document (KYC / car papers).

   We fetch it with an Authorization: Bearer header and display the result as a
   blob URL, instead of putting the JWT in a ?token= query on the <img src>.
   Hostinger's CDN treats any URL ending in an image extension (.jpg/.png/…) as a
   static asset and STRIPS the query string before it reaches the Node backend —
   so the token was lost and the document 401'd. Header auth is not affected. */
export default function AuthDoc({ path, label }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!path) return;
    let objUrl;
    let cancelled = false;
    (async () => {
      // Public/legacy paths (not our auth route) are shown directly.
      if (!path.startsWith('/api/')) { setUrl(path.startsWith('/') ? API_ORIGIN + path : path); return; }
      try {
        const res = await fetch(`${API_ORIGIN}${path}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        if (!res.ok) throw new Error('load failed');
        const blob = await res.blob();
        if (cancelled) return;
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      } catch {
        if (!cancelled) setErr(true);
      }
    })();
    return () => { cancelled = true; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [path]);

  return (
    <a href={url || undefined} target="_blank" rel="noreferrer"
      className="group block rounded-xl overflow-hidden border border-[var(--border)] hover:border-primary-300 transition-colors">
      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
        {err
          ? <span className="text-[11px] text-red-500 px-2 text-center">Échec du chargement</span>
          : url
            ? <img src={url} alt={label} onError={() => setErr(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <span className="text-[11px] text-gray-400">Chargement…</span>}
      </div>
      <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300 px-2 py-1.5 truncate">{label}</p>
    </a>
  );
}
