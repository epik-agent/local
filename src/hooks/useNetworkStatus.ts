import { useEffect, useState } from "react";

/**
 * Return type for the useNetworkStatus hook.
 */
export interface UseNetworkStatusResult {
  /** Whether the browser currently has a network connection. */
  isOnline: boolean;
}

/**
 * Hook that tracks whether the browser has a working network connection.
 *
 * Reads the initial value from ``window.navigator.onLine`` and then listens
 * for the ``online`` and ``offline`` window events, updating state whenever
 * connectivity changes.  Event listeners are removed on unmount.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(window.navigator.onLine);

  useEffect((): (() => void) => {
    const handleOnline = (): void => {
      setIsOnline(true);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return (): void => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
