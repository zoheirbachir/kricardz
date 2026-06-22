import { useEffect, useRef } from 'react';

/**
 * Lightbox props:
 *  - images        : string[]          array of image URLs
 *  - index         : number            currently visible index
 *  - onClose       : () => void
 *  - onIndexChange : (newIndex) => void   called for prev / next / thumbnail click
 */
export default function Lightbox({ images, index, onClose, onIndexChange }) {
  // Keep the latest callbacks in refs so the keydown handler never needs
  // to be re-registered when parent re-renders with new function references.
  const onCloseRef        = useRef(onClose);
  const onIndexChangeRef  = useRef(onIndexChange);
  const imagesLengthRef   = useRef(images.length);
  onCloseRef.current       = onClose;
  onIndexChangeRef.current = onIndexChange;
  imagesLengthRef.current  = images.length;

  useEffect(() => {
    const handleKey = (e) => {
      const len = imagesLengthRef.current;
      if (e.key === 'Escape')      onCloseRef.current();
      if (e.key === 'ArrowLeft')   onIndexChangeRef.current(i => (i - 1 + len) % len);
      if (e.key === 'ArrowRight')  onIndexChangeRef.current(i => (i + 1) % len);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, []); // empty — register once on mount, clean up on unmount

  if (!images?.length) return null;

  const prev = (index - 1 + images.length) % images.length;
  const next = (index + 1) % images.length;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      {/* Close */}
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-colors z-10"
        onClick={onClose}
      >×</button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
        {index + 1} / {images.length}
      </div>

      {/* Prev */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-colors z-10"
        onClick={(e) => { e.stopPropagation(); onIndexChange(prev); }}
      >‹</button>

      {/* Image */}
      <img
        src={images[index]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-colors z-10"
        onClick={(e) => { e.stopPropagation(); onIndexChange(next); }}
      >›</button>

      {/* Thumbnails — clicking jumps directly to that image */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === index
                  ? 'border-white scale-110'
                  : 'border-white/30 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
