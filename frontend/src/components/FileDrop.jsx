import { useRef, useState } from 'react';

/**
 * Reusable document upload box with drag-drop + image/PDF preview.
 * Props: label, required, accept, hint, onFile(file|null)
 */
export default function FileDrop({ label, required = false, accept = 'image/*', hint, onFile }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    onFile?.(file);
    if (file.type === 'application/pdf') {
      setIsPdf(true);
      setPreview(file.name);
    } else {
      setIsPdf(false);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const reset = (e) => {
    e.stopPropagation();
    setPreview(null);
    setIsPdf(false);
    if (inputRef.current) inputRef.current.value = '';
    onFile?.(null);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          drag ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        {!preview ? (
          <div className="py-3">
            <svg className="w-7 h-7 mx-auto mb-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12" /></svg>
            <p className="text-xs text-gray-500">{hint || 'Glissez-déposez ou cliquez pour téléverser'}</p>
          </div>
        ) : isPdf ? (
          <div className="flex items-center justify-center gap-2 text-pine-600 text-sm py-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="truncate max-w-[180px]">{preview}</span>
          </div>
        ) : (
          <img src={preview} alt="" className="max-h-28 mx-auto rounded-lg shadow-sm" />
        )}
        {preview && (
          <button type="button" onClick={reset} aria-label="Retirer"
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800 text-gray-500 hover:text-red-500 shadow flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
