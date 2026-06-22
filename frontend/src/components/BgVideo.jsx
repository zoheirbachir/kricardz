import { useRef, useEffect } from 'react';

/* Lazy, autoplaying, muted, looping background video.
   The source is NOT attached until the element scrolls near the viewport, so
   off-screen videos download nothing — this keeps the page light and smooth even
   with many background videos. Plays while on-screen, pauses when it leaves.
   No poster image (posters were flashing/clashing with the video). */
export default function BgVideo({ src, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!v.src) v.src = src;          // attach source only when near viewport → download starts here
          v.play?.().catch(() => {});
        } else {
          v.pause?.();
        }
      },
      { threshold: 0.1, rootMargin: '300px' } // begin loading ~300px before it's visible
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      muted
      loop
      playsInline
      preload="none"
    />
  );
}
