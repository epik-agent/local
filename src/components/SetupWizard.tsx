import { useState } from "react";
import type { SetupStatus, SetupStep } from "../lib/setup";
import { ProjectScopeSelector } from "./ProjectScopeSelector";

/**
 * Props for the SetupWizard component.
 */
export interface SetupWizardProps {
  /** The current wizard step, driving which screen is rendered. */
  step: SetupStep;
  /** The result of the most recent set of prerequisite checks. */
  status: SetupStatus;
  /** Called to re-run setup checks (e.g. after the user fixes a prerequisite). */
  onRetry: () => void;
  /**
   * Called when the wizard is complete.  In the ``project_select`` step this
   * fires after org/repo have been entered.  In the ``ready`` step it fires
   * when the user clicks "Start chatting".
   */
  onComplete: () => void;
}

/**
 * Wrapper providing consistent layout for each wizard step.
 */
function StepCard({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center p-8">
      <div
        className="flex w-full max-w-md flex-col gap-6 rounded-2xl p-8 shadow-lg"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Retry button used in multiple steps.
 */
function RetryButton({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <button
      onClick={onRetry}
      className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      style={{
        backgroundColor: "var(--bg-raised)",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
      }}
      aria-label="Retry setup checks"
    >
      Retry
    </button>
  );
}

/**
 * Checking step — displayed while prerequisite checks are running.
 */
function CheckingStep(): React.ReactElement {
  return (
    <StepCard>
      <div className="flex flex-col items-center gap-4" data-testid="setup-step-checking">
        {/* Spinner */}
        <div
          className="h-8 w-8 animate-spin rounded-full border-4"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--accent)",
          }}
          aria-label="Checking dependencies"
        />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Checking dependencies…
        </p>
      </div>
    </StepCard>
  );
}

/**
 * gh CLI missing step — displayed when gh is not on the PATH.
 */
function GhMissingStep({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <StepCard>
      <div className="flex flex-col gap-4" data-testid="setup-step-gh-missing">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Install the gh CLI
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Epik requires the GitHub CLI to interact with your repositories. Please install it and
          then click Retry.
        </p>
        <a
          href="https://cli.github.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium underline"
          style={{ color: "var(--accent)" }}
        >
          Download the gh CLI
        </a>
        <RetryButton onRetry={onRetry} />
      </div>
    </StepCard>
  );
}

/**
 * gh not authenticated step — displayed when gh is installed but not signed in.
 */
function GhUnauthStep({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <StepCard>
      <div className="flex flex-col gap-4" data-testid="setup-step-gh-unauth">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Authenticate with GitHub
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          The gh CLI is installed but not authenticated. Run the following command in your terminal:
        </p>
        <code
          className="rounded-lg px-4 py-3 font-mono text-sm"
          style={{
            backgroundColor: "var(--bg-raised)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          gh auth login
        </code>
        <RetryButton onRetry={onRetry} />
      </div>
    </StepCard>
  );
}

/**
 * GitHub App not installed step — displayed when the Epik app is not yet installed.
 */
function AppNotInstalledStep({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <StepCard>
      <div className="flex flex-col gap-4" data-testid="setup-step-app-not-installed">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Install the Epik GitHub App
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Epik needs to be installed on your GitHub organisation or repository to manage issues and
          pull requests.
        </p>
        <a
          href="https://github.com/apps/epik-agent"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium underline"
          style={{ color: "var(--accent)" }}
        >
          Install the Epik GitHub App
        </a>
        <RetryButton onRetry={onRetry} />
      </div>
    </StepCard>
  );
}

/**
 * Project selection step — lets the user enter the org and repo they want to work with.
 */
function ProjectSelectStep({ onComplete }: { onComplete: () => void }): React.ReactElement {
  const [org, setOrg] = useState<string | null>(null);
  const [repo, setRepo] = useState<string | null>(null);

  const canContinue = org !== null && org.trim() !== "" && repo !== null && repo.trim() !== "";

  return (
    <StepCard>
      <div className="flex flex-col gap-4" data-testid="setup-step-project-select">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Select a project
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Choose the GitHub repository you want Epik to work with.
        </p>
        <ProjectScopeSelector
          org={org}
          repo={repo}
          onOrgChange={(value): void => {
            setOrg(value);
          }}
          onRepoChange={(value): void => {
            setRepo(value);
          }}
        />
        <button
          onClick={onComplete}
          disabled={!canContinue}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{
            backgroundColor: canContinue ? "var(--accent)" : "var(--bg-raised)",
            color: canContinue ? "var(--accent-on-accent)" : "var(--text-muted)",
          }}
          aria-label="Continue to Epik"
        >
          Continue
        </button>
      </div>
    </StepCard>
  );
}

/**
 * Ready step — all checks passed and project selected; user can start chatting.
 */
function ReadyStep({ onComplete }: { onComplete: () => void }): React.ReactElement {
  return (
    <StepCard>
      <div className="flex flex-col items-center gap-4" data-testid="setup-step-ready">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          You are all set!
        </h2>
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Epik is ready to help you build. Click below to open the chat.
        </p>
        <button
          onClick={onComplete}
          className="rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-on-accent)",
          }}
          aria-label="Start chatting with Epik"
        >
          Start chatting
        </button>
      </div>
    </StepCard>
  );
}

/**
 * Multi-step first-run wizard.
 *
 * Renders the appropriate screen based on the current ``step`` prop:
 * - ``checking``          — animated spinner
 * - ``gh_missing``        — link to install gh CLI + Retry
 * - ``gh_unauth``         — ``gh auth login`` command + Retry
 * - ``app_not_installed`` — link to GitHub App installation + Retry
 * - ``project_select``    — org/repo form using ProjectScopeSelector + Continue
 * - ``ready``             — confirmation screen + Start chatting button
 */
export function SetupWizard({ step, onRetry, onComplete }: SetupWizardProps): React.ReactElement {
  return (
    <div
      className="flex h-full min-h-screen flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      data-testid="setup-wizard"
    >
      {step === "checking" && <CheckingStep />}
      {step === "gh_missing" && <GhMissingStep onRetry={onRetry} />}
      {step === "gh_unauth" && <GhUnauthStep onRetry={onRetry} />}
      {step === "app_not_installed" && <AppNotInstalledStep onRetry={onRetry} />}
      {step === "project_select" && <ProjectSelectStep onComplete={onComplete} />}
      {step === "ready" && <ReadyStep onComplete={onComplete} />}
    </div>
  );
}
