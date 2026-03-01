import { useNetworkStatus } from "../hooks/useNetworkStatus";

/**
 * Sticky top banner displayed when the device has no network connection.
 *
 * Uses ``useNetworkStatus`` to monitor connectivity.  The banner is rendered
 * when offline and automatically hides once the connection is restored.
 * When online, the component renders nothing (returns null).
 */
export function NetworkBanner(): React.ReactElement | null {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium"
      style={{
        backgroundColor: "var(--color-warning)",
        color: "var(--text-inverse)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
      data-testid="network-banner"
      role="alert"
      aria-live="polite"
    >
      No internet connection — Epik is offline
    </div>
  );
}
