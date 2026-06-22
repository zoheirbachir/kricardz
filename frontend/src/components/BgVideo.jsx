import { useRef, useEffect } from 'react';

/* Autoplaying, muted, looping background video that only plays while on-screen
   (IntersectionObserver) — keeps many background videos light on CPU/GPU. */
export default function BgVideo({ src, poster, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.1 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className={className}
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      src={src}
    />
  );
}
