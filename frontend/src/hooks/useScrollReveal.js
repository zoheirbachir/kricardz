import { useCallback, useRef, useState } from 'react';

/**
 * Reveal-on-scroll hook returning a [ref, visible] pair.
 * Uses a CALLBACK ref so the observer attaches whenever the node mounts —
 * including conditionally-rendered sections that mount after data loads
 * (a plain useEffect+ref misses those because the ref is null on first run).
 */
export function useScrollReveal(threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const obsRef = useRef(null);

  const ref = useCallback((node) => {
    // Tear down any previous observer (node unmounting or changing).
    if (obsRef.current) {
      obsRef.current.disconnect();
      obsRef.current = null;
    }
    if (node) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        },
        { threshold }
      );
      obs.observe(node);
      obsRef.current = obs;
    }
  }, [threshold]);

  return [ref, visible];
}
