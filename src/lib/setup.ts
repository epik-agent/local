/**
 * Types for the first-run setup wizard and graceful degradation system.
 *
 * ``SetupStatus`` captures the result of each environment check.
 * ``SetupStep`` represents the current state of the setup wizard flow.
 */

/**
 * The result of running all environment prerequisite checks.
 *
 * Each field corresponds to one check performed on startup.
 */
export interface SetupStatus {
  /** Whether the ``gh`` CLI is installed and on the PATH. */
  ghInstalled: boolean;
  /** Whether ``gh auth status`` exits cleanly (user is authenticated). */
  ghAuthenticated: boolean;
  /** Whether the Epik GitHub App is installed on at least one org or repo. */
  githubAppInstalled: boolean;
  /** Whether the machine currently has a working internet connection. */
  networkOnline: boolean;
}

/**
 * The current step of the first-run setup wizard.
 *
 * Steps are evaluated in order:
 * 1. ``checking``          — checks are in flight
 * 2. ``gh_missing``        — gh CLI is not installed
 * 3. ``gh_unauth``         — gh CLI installed but not authenticated
 * 4. ``app_not_installed`` — GitHub App not yet installed on any org/repo
 * 5. ``project_select``    — App installed; user must choose a project
 * 6. ``ready``             — all checks passed, wizard complete
 */
export type SetupStep =
  | "checking"
  | "gh_missing"
  | "gh_unauth"
  | "app_not_installed"
  | "project_select"
  | "ready";
