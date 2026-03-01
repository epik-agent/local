import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { SetupStatus, SetupStep } from "../lib/setup";

const SETUP_KEY = "epik.setup.complete";

const DEFAULT_STATUS: SetupStatus = {
  ghInstalled: false,
  ghAuthenticated: false,
  githubAppInstalled: false,
  networkOnline: false,
};

/**
 * Return type for the useSetup hook.
 */
export interface UseSetupResult {
  /** The current wizard step. ``"checking"`` while checks are in flight. */
  step: SetupStep;
  /** The result of each prerequisite check, updated after checks complete. */
  status: SetupStatus;
  /** Re-run all setup checks (e.g. after the user fixes a prerequisite). */
  retry: () => Promise<void>;
  /** Mark setup as complete, persist to localStorage, and move to ``"ready"``. */
  completeSetup: () => void;
}

/**
 * Hook that drives the first-run setup wizard.
 *
 * On mount, runs all prerequisite checks via Tauri IPC commands.  The
 * ``step`` value reflects the first unsatisfied requirement, or
 * ``"project_select"`` when all environment checks pass but the user has not
 * yet chosen a project.  Once the user finishes the wizard,
 * ``completeSetup()`` persists a flag to ``localStorage`` so subsequent
 * launches skip straight to ``"ready"``.
 */
export function useSetup(): UseSetupResult {
  const [step, setStep] = useState<SetupStep>("checking");
  const [status, setStatus] = useState<SetupStatus>(DEFAULT_STATUS);

  const runChecks = useCallback(async (): Promise<void> => {
    setStep("checking");

    const [ghInstalled, ghAuthenticated, networkOnline] = await Promise.all([
      invoke<boolean>("check_gh_installed").catch(() => false),
      invoke<boolean>("check_gh_auth").catch(() => false),
      invoke<boolean>("check_network").catch(() => false),
    ]);

    const newStatus: SetupStatus = {
      ghInstalled,
      ghAuthenticated,
      githubAppInstalled: true,
      networkOnline,
    };

    setStatus(newStatus);

    if (!ghInstalled) {
      setStep("gh_missing");
      return;
    }

    if (!ghAuthenticated) {
      setStep("gh_unauth");
      return;
    }

    const setupComplete = localStorage.getItem(SETUP_KEY) === "true";
    if (setupComplete) {
      setStep("ready");
      return;
    }

    setStep("project_select");
  }, []);

  useEffect((): void => {
    void runChecks();
  }, [runChecks]);

  const retry = useCallback(async (): Promise<void> => {
    await runChecks();
  }, [runChecks]);

  const completeSetup = useCallback((): void => {
    localStorage.setItem(SETUP_KEY, "true");
    setStep("ready");
  }, []);

  return { step, status, retry, completeSetup };
}
