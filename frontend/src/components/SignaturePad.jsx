import { useRef, useState, useEffect } from 'react';

/* A finger/mouse signature pad. Works on touch (phone) and desktop.
   Calls onSave(pngDataUrl) when the user validates a non-empty signature. */
export default function SignaturePad({ onSave, onCancel, saving }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1E1A13';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const pos = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setEmpty(false);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  };

  const save = () => {
    if (empty) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-1">Votre signature</h3>
        <p className="text-sm text-gray-500 mb-3">Signez avec votre doigt (téléphone) ou la souris.</p>
        <canvas
          ref={canvasRef}
          width={560}
          height={220}
          className="w-full rounded-xl border-2 border-gray-200 bg-white touch-none cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        <div className="flex items-center justify-between mt-4">
          <button type="button" onClick={clear} className="text-sm text-gray-500 hover:text-gray-700">Effacer</button>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="btn-secondary text-sm">Annuler</button>
            <button type="button" onClick={save} disabled={empty || saving} className="btn-primary text-sm">
              {saving ? 'Enregistrement…' : 'Valider ma signature'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
