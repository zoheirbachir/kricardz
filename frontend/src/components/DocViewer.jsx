import { useEffect } from 'react';

/* Full-screen inline viewer for a document blob URL. Renders images directly and
   PDFs in an embedded frame, so admins can review without leaving the page. */
export default function DocViewer({ url, isPdf, label, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl flex items-center justify-between mb-2 text-white" onClick={e => e.stopPropagation()}>
        <span className="text-sm font-medium truncate">{label}</span>
        <div className="flex items-center gap-3">
          <a href={url} download className="text-xs underline underline-offset-2 opacity-90 hover:opacity-100">Télécharger</a>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div className="w-full max-w-4xl flex-1 min-h-0 bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {isPdf
          ? <object data={url} type="application/pdf" className="w-full h-[80vh]">
              <div className="p-6 text-center text-sm text-gray-600">
                Impossible d'afficher le PDF ici. <a href={url} target="_blank" rel="noreferrer" className="text-primary-600 underline">Ouvrir dans un nouvel onglet</a>.
              </div>
            </object>
          : <div className="w-full h-[80vh] flex items-center justify-center bg-gray-900">
              <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
            </div>}
      </div>
    </div>
  );
}
