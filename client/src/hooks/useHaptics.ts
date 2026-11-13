import { useCallback } from 'react';

export function useHaptics() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignorar en navegadores sin permiso o iOS Safari
      }
    }
  }, []);

  const tapLight = useCallback(() => vibrate(25), [vibrate]);
  const tapMedium = useCallback(() => vibrate(55), [vibrate]);
  const revealSuccess = useCallback(() => vibrate(80), [vibrate]);
  const revealFail = useCallback(() => vibrate([150, 50, 250]), [vibrate]);
  const phaseAlert = useCallback(() => vibrate([60, 40, 60]), [vibrate]);

  return {
    vibrate,
    tapLight,
    tapMedium,
    revealSuccess,
    revealFail,
    phaseAlert,
  };
}