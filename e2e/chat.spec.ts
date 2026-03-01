import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function installMocks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("epik.setup.complete", "true");

    const listeners: Record<string, Array<(e: { payload: unknown }) => void>> = {};

    (window as unknown as Record<string, unknown>).__TAURI_LISTEN__ = (
      event: string,
      handler: (e: { payload: unknown }) => void,
    ): Promise<() => void> => {
      (listeners[event] ??= []).push(handler);
      return Promise.resolve(() => undefined);
    };

    (window as unknown as Record<string, unknown>).__TAURI_INVOKE__ = async (
      cmd: string,
      args: Record<string, unknown>,
    ): Promise<unknown> => {
      if (cmd === "check_gh_installed") return true;
      if (cmd === "check_gh_auth") return true;
      if (cmd === "check_network") return true;
      if (cmd === "sidecar_start") {
        // Immediately emit a "ready" status event so ChatView enables sending
        setTimeout(() => {
          for (const h of listeners["sidecar://status"] ?? []) {
            h({ payload: { status: "ready" } });
          }
        }, 10);
        return undefined;
      }
      if (cmd === "sidecar_send_message") {
        const requestId = args["requestId"] as string;
        setTimeout(() => {
          for (const h of listeners["sidecar://token"] ?? []) {
            h({ payload: { requestId, token: "Hello" } });
          }
          for (const h of listeners["sidecar://token"] ?? []) {
            h({ payload: { requestId, token: " world!" } });
          }
          for (const h of listeners["sidecar://complete"] ?? []) {
            h({ payload: { requestId, fullText: "Hello world!" } });
          }
        }, 50);
      }
      return undefined;
    };
  });
}

test("chat responds to a user message", async ({ page }) => {
  await installMocks(page);
  await page.goto("/");

  await expect(page.getByTestId("chat-view")).toBeVisible();
  await page.getByTestId("new-conversation-button").click();
  await page.getByTestId("message-input").fill("I want to fix all the bugs");
  await page.getByTestId("send-button").click();

  await expect(page.getByTestId("message-list").getByText("I want to fix all the bugs")).toBeVisible();
  await expect(page.getByTestId("message-list").getByText("Hello world!")).toBeVisible({ timeout: 5_000 });
});
