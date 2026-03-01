/**
 * Browser-compatible shim for ``@tauri-apps/api/core``.
 *
 * When running in a real Tauri window ``window.__TAURI_INTERNALS__`` is
 * defined, so we delegate directly to the real package.  In a plain browser
 * (e.g. a Vercel preview deployment) we return sensible mock values so the
 * React UI can render without crashing.
 */

const isTauri = (): boolean =>
  "__TAURI_INTERNALS__" in (window as Record<string, unknown>);

type InvokeResponse = boolean | string | null | undefined | Record<string, unknown> | unknown[];

const MOCK_RESPONSES: Record<string, InvokeResponse> = {
  check_gh_installed: true,
  check_gh_auth: true,
  check_network: true,
  greet: "Hello from the Epik web preview!",
  sidecar_start: null,
  sidecar_stop: null,
  sidecar_restart: null,
  sidecar_send_message: null,
  sidecar_cancel: null,
  sidecar_start_build: null,
  sidecar_stop_build: null,
};

export async function invoke<T>(cmd: string, _args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(cmd, _args);
  }

  if (Object.prototype.hasOwnProperty.call(MOCK_RESPONSES, cmd)) {
    return MOCK_RESPONSES[cmd] as T;
  }

  console.warn(`[tauri-shim] Unknown command "${cmd}" — returning undefined`);
  return undefined as T;
}
