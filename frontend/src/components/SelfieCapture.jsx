import { useRef, useState, useEffect } from 'react';

/**
 * Live selfie capture via getUserMedia. Calls onCapture(file|null).
 */
export default function SelfieCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (active && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [active]);

  useEffect(() => () => stopStream(), []); // cleanup on unmount

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);
    } catch {
      setError("Impossible d'accéder à la caméra. Autorisez l'accès, ou réessayez.");
    }
  };

  const stop = () => { stopStream(); setActive(false); };

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      setPreview(c.toDataURL('image/jpeg', 0.9));
      onCapture?.(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
      stop();
    }, 'image/jpeg', 0.9);
  };

  const retake = () => { setPreview(null); onCapture?.(null); start(); };

  return (
    <div>
      <div className="bg-pine-50 dark:bg-pine-500/10 border border-pine-100 dark:border-pine-500/20 rounded-lg p-2.5 mb-2">
        <p className="text-pine-700 dark:text-pine-300 text-xs flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Prenez un selfie en direct pour confirmer votre identité.
        </p>
      </div>

      {!active && !preview && (
        <button type="button" onClick={start}
          className="w-full border-2 border-dashed border-primary-300 rounded-xl p-5 text-center hover:bg-primary-50/60 dark:hover:bg-primary-500/10 transition-colors">
          <svg className="w-8 h-8 mx-auto mb-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ouvrir la caméra</p>
          <p className="text-xs text-gray-500 mt-0.5">Capture directe du selfie</p>
        </button>
      )}

      {active && (
        <div>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl shadow-lg bg-gray-900" />
          <div className="flex justify-center gap-2 mt-2">
            <button type="button" onClick={capture} className="btn-primary text-sm py-2 px-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Capturer
            </button>
            <button type="button" onClick={stop} className="btn-secondary text-sm py-2 px-4">Annuler</button>
          </div>
        </div>
      )}

      {preview && (
        <div className="border-2 border-pine-500 rounded-xl p-3">
          <img src={preview} alt="Selfie" className="max-h-40 mx-auto rounded-lg shadow object-cover" />
          <div className="flex justify-center items-center gap-3 mt-2">
            <span className="text-xs text-pine-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Photo capturée
            </span>
            <button type="button" onClick={retake} className="text-xs text-primary-600 hover:underline">Reprendre</button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
