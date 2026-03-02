/**
 * Browser-compatible shim for ``@tauri-apps/api/core``.
 *
 * When running in a real Tauri window ``window.__TAURI_INTERNALS__`` is
 * defined, so we delegate directly to the real package.  In a plain browser
 * (e.g. a Vercel preview deployment) we return sensible mock values so the
 * React UI can render without crashing.
 *
 * The real Tauri ``invoke`` is imported via a relative path to the installed
 * package so that Vite's alias (which maps ``@tauri-apps/api/core`` → this
 * file) does not create a self-referential loop.
 */

// Import the real invoke directly from the package file. A relative path is
// used so Vite's alias (which maps "@tauri-apps/api/core" → this shim) does
// not create a self-referential loop.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – relative node_modules path intentional; avoids alias loop
import { invoke as tauriInvoke } from "../../node_modules/@tauri-apps/api/core.js";

const isTauri = (): boolean =>
  "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>);

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
    return await (tauriInvoke as (cmd: string, args?: Record<string, unknown>) => Promise<T>)(
      cmd,
      _args,
    );
  }

  // Dynamic override — installed by Playwright addInitScript per test
  const dynFn = (window as unknown as Record<string, unknown>).__TAURI_INVOKE__ as
    | ((cmd: string, args: unknown) => Promise<T>)
    | undefined;
  if (dynFn !== undefined) return await dynFn(cmd, _args);

  if (Object.prototype.hasOwnProperty.call(MOCK_RESPONSES, cmd)) {
    return MOCK_RESPONSES[cmd] as T;
  }

  // Unknown command — shim returns undefined for unknown commands in non-Tauri environments
  void cmd;
  return undefined as T;
}
