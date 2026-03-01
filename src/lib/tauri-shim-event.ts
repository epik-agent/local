/**
 * Browser-compatible shim for ``@tauri-apps/api/event``.
 *
 * In a real Tauri window we delegate to the real package.  In a plain browser
 * ``listen`` returns a no-op unsubscribe function so hooks that call ``listen``
 * on mount don't crash.
 *
 * The real Tauri ``listen`` is imported via a relative path to the installed
 * package so that Vite's alias (which maps ``@tauri-apps/api/event`` → this
 * file) does not create a self-referential loop.
 */

// Import the real listen directly from the package file. A relative path is
// used so Vite's alias (which maps "@tauri-apps/api/event" → this shim) does
// not create a self-referential loop.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – relative node_modules path intentional; avoids alias loop
import { listen as tauriListen } from "../../node_modules/@tauri-apps/api/event.js";

const isTauri = (): boolean =>
  "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>);

type EventCallback<T> = (event: { payload: T }) => void;
type UnlistenFn = () => void;

export async function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (isTauri()) {
    return await (tauriListen as (event: string, handler: EventCallback<T>) => Promise<UnlistenFn>)(
      event,
      handler,
    );
  }

  // Dynamic override — installed by Playwright addInitScript per test
  const dynFn = (window as unknown as Record<string, unknown>).__TAURI_LISTEN__ as
    | ((event: string, handler: EventCallback<T>) => Promise<UnlistenFn>)
    | undefined;
  if (dynFn !== undefined) return await dynFn(event, handler);

  // Browser: no-op — events never fire, nothing to clean up.
  return (): void => {};
}
