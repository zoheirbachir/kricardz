import { useState, useEffect } from 'react';

export function useNetwork() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const tryCapacitor = async () => {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setOnline(status.connected);
        Network.addListener('networkStatusChange', s => setOnline(s.connected));
      } catch {
        // web fallback
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
      }
    };
    tryCapacitor();
  }, []);

  return online;
}
