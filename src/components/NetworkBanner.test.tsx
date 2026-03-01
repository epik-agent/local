import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NetworkBanner } from "./NetworkBanner";

describe("NetworkBanner", () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, "onLine");

  function stubOnline(value: boolean): void {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => value,
    });
  }

  afterEach(() => {
    if (originalOnLine !== undefined) {
      Object.defineProperty(window.navigator, "onLine", originalOnLine);
    }
  });

  beforeEach(() => {
    stubOnline(true);
  });

  it("does not render the banner when online", () => {
    stubOnline(true);
    render(<NetworkBanner />);
    expect(screen.queryByTestId("network-banner")).toBeNull();
  });

  it("renders the banner when offline", () => {
    stubOnline(false);
    render(<NetworkBanner />);
    expect(screen.getByTestId("network-banner")).toBeInTheDocument();
  });

  it("shows the offline message text", () => {
    stubOnline(false);
    render(<NetworkBanner />);
    expect(screen.getByText(/no internet connection/i)).toBeInTheDocument();
  });

  it("shows banner when offline event fires", () => {
    stubOnline(true);
    render(<NetworkBanner />);
    expect(screen.queryByTestId("network-banner")).toBeNull();

    act(() => {
      stubOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByTestId("network-banner")).toBeInTheDocument();
  });

  it("hides banner when online event fires after going offline", () => {
    stubOnline(false);
    render(<NetworkBanner />);
    expect(screen.getByTestId("network-banner")).toBeInTheDocument();

    act(() => {
      stubOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByTestId("network-banner")).toBeNull();
  });
});
