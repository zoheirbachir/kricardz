import { useEffect, useRef } from 'react';
import QR from 'qrcode';

/* Renders `value` as a QR code on a canvas, locally (no network). */
export default function QRCode({ value, size = 96, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    QR.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1f2937', light: '#ffffff' },
    }).catch(() => {});
  }, [value, size]);

  return <canvas ref={ref} width={size} height={size} className={className} />;
}
