import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const num = parseInt(String(target).replace(/\D/g, '')) || 0;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * num));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, start]);

  // Format: preserve suffix like "+" or "k+"
  const suffix = String(target).replace(/[\d,]/g, '');
  return count.toLocaleString() + suffix;
}
