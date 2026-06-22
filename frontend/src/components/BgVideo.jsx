import { useRef, useEffect } from 'react';

/* Autoplaying, muted, looping background video that only plays while on-screen
   (IntersectionObserver) — keeps many background videos light on CPU/GPU.
   No poster image: posters were flashing/clashing with the video, so we show
   the video only (sections sit on dark overlays, so the brief pre-play frame is black). */
export default function BgVideo({ src, className = '' }) {
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
      src={src}
    />
  );
}
