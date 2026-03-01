import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AuthErrorBanner } from "./AuthErrorBanner";

describe("AuthErrorBanner", () => {
  it("does not render when show is false", () => {
    render(<AuthErrorBanner show={false} onDismiss={vi.fn()} />);
    expect(screen.queryByTestId("auth-error-banner")).toBeNull();
  });

  it("renders the banner when show is true", () => {
    render(<AuthErrorBanner show={true} onDismiss={vi.fn()} />);
    expect(screen.getByTestId("auth-error-banner")).toBeInTheDocument();
  });

  it("shows auth expired message text", () => {
    render(<AuthErrorBanner show={true} onDismiss={vi.fn()} />);
    expect(screen.getByText(/gh auth login/i)).toBeInTheDocument();
  });

  it("renders a dismiss button", () => {
    render(<AuthErrorBanner show={true} onDismiss={vi.fn()} />);
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    render(<AuthErrorBanner show={true} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
