/**
 * Browser-compatible shim for ``@tauri-apps/api/event``.
 *
 * In a real Tauri window we delegate to the real package.  In a plain browser
 * ``listen`` returns a no-op unsubscribe function so hooks that call ``listen``
 * on mount don't crash.
 */

const isTauri = (): boolean =>
  "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>);

type EventCallback<T> = (event: { payload: T }) => void;
type UnlistenFn = () => void;

export async function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (isTauri()) {
    const { listen: tauriListen } = await import("@tauri-apps/api/event");
    return tauriListen<T>(event, handler);
  }

  // Dynamic override — installed by Playwright addInitScript per test
  const dynFn = (window as unknown as Record<string, unknown>).__TAURI_LISTEN__ as
    | ((event: string, handler: EventCallback<T>) => Promise<UnlistenFn>)
    | undefined;
  if (dynFn !== undefined) return dynFn(event, handler);

  // Browser: no-op — events never fire, nothing to clean up.
  return (): void => {};
}
