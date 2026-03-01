import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SetupWizard } from "./SetupWizard";
import type { SetupStep, SetupStatus } from "../lib/setup";

const defaultStatus: SetupStatus = {
  ghInstalled: true,
  ghAuthenticated: true,
  githubAppInstalled: true,
  networkOnline: true,
};

function renderWizard(
  step: SetupStep,
  overrides?: {
    status?: Partial<SetupStatus>;
    onRetry?: () => void;
    onComplete?: () => void;
  },
): void {
  const status = { ...defaultStatus, ...overrides?.status };
  render(
    <SetupWizard
      step={step}
      status={status}
      onRetry={overrides?.onRetry ?? vi.fn()}
      onComplete={overrides?.onComplete ?? vi.fn()}
    />,
  );
}

describe("SetupWizard", () => {
  it("renders the checking step with a spinner", () => {
    renderWizard("checking");
    expect(screen.getByTestId("setup-wizard")).toBeInTheDocument();
    expect(screen.getByTestId("setup-step-checking")).toBeInTheDocument();
  });

  it("renders the gh_missing step with install instructions", () => {
    renderWizard("gh_missing", { status: { ghInstalled: false } });
    expect(screen.getByTestId("setup-step-gh-missing")).toBeInTheDocument();
    expect(screen.getByText(/install the gh cli/i)).toBeInTheDocument();
  });

  it("renders a link to the gh CLI download in gh_missing step", () => {
    renderWizard("gh_missing", { status: { ghInstalled: false } });
    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("cli.github.com"));
  });

  it("renders the gh_unauth step with auth instructions", () => {
    renderWizard("gh_unauth", { status: { ghInstalled: true, ghAuthenticated: false } });
    expect(screen.getByTestId("setup-step-gh-unauth")).toBeInTheDocument();
    expect(screen.getByText(/gh auth login/i)).toBeInTheDocument();
  });

  it("renders the app_not_installed step with installation link", () => {
    renderWizard("app_not_installed", { status: { githubAppInstalled: false } });
    expect(screen.getByTestId("setup-step-app-not-installed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /install/i })).toBeInTheDocument();
  });

  it("renders the project_select step with ProjectScopeSelector", () => {
    renderWizard("project_select");
    expect(screen.getByTestId("setup-step-project-select")).toBeInTheDocument();
    expect(screen.getByTestId("project-scope-selector")).toBeInTheDocument();
  });

  it("renders the ready step with an Enter button", () => {
    renderWizard("ready");
    expect(screen.getByTestId("setup-step-ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start chatting/i })).toBeInTheDocument();
  });

  it("calls onRetry when Retry button is clicked in gh_missing step", async () => {
    const onRetry = vi.fn();
    renderWizard("gh_missing", { status: { ghInstalled: false }, onRetry });
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("calls onRetry when Retry button is clicked in gh_unauth step", async () => {
    const onRetry = vi.fn();
    renderWizard("gh_unauth", { status: { ghAuthenticated: false }, onRetry });
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("calls onComplete when Start chatting is clicked in ready step", async () => {
    const onComplete = vi.fn();
    renderWizard("ready", { onComplete });
    await userEvent.click(screen.getByRole("button", { name: /start chatting/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("calls onComplete with org/repo when Continue is clicked in project_select step", async () => {
    const onComplete = vi.fn();
    renderWizard("project_select", { onComplete });

    await userEvent.type(screen.getByTestId("org-input"), "my-org");
    await userEvent.type(screen.getByTestId("repo-input"), "my-repo");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("disables Continue in project_select step until both org and repo are filled", async () => {
    renderWizard("project_select");
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    await userEvent.type(screen.getByTestId("org-input"), "my-org");
    expect(continueButton).toBeDisabled();

    await userEvent.type(screen.getByTestId("repo-input"), "my-repo");
    expect(continueButton).not.toBeDisabled();
  });
});
