import { useEffect, useRef } from 'react';

/**
 * Mantiene la pantalla encendida durante las partidas activas mediante Screen Wake Lock API,
 * re-adquiriendo el bloqueo automáticamente si el usuario cambia de pestaña y vuelve.
 */
export function useWakeLock(enabled: boolean): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let isCancelled = false;

    const requestWakeLock = async () => {
      try {
        if (document.visibilityState === 'visible' && !wakeLockRef.current) {
          const sentinel = await navigator.wakeLock.request('screen');
          if (isCancelled) {
            await sentinel.release();
            return;
          }
          wakeLockRef.current = sentinel;
          sentinel.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {
        // Silencioso en dispositivos con ahorro de batería extremo o sin soporte
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        void wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}