import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Shell } from "./Shell";

describe("Shell", () => {
  it("renders the application shell", () => {
    render(<Shell />);
    expect(screen.getByTestId("shell")).toBeInTheDocument();
  });

  it("renders the app header", () => {
    render(<Shell />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("renders the main content area", () => {
    render(<Shell />);
    expect(screen.getByTestId("main-content")).toBeInTheDocument();
  });

  it("renders the brand heading with Epik title", () => {
    render(<Shell />);
    const heading = screen.getByTestId("brand-heading");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Epik");
  });

  it("renders the brand tagline", () => {
    render(<Shell />);
    const tagline = screen.getByTestId("brand-tagline");
    expect(tagline).toBeInTheDocument();
    expect(tagline).toHaveTextContent("You say it. We make it.");
  });

  it("applies the mint accent colour to the brand heading", () => {
    render(<Shell />);
    const heading = screen.getByTestId("brand-heading");
    expect(heading).toHaveStyle({ color: "var(--accent)" });
  });

  it("applies brand background colour to the shell", () => {
    render(<Shell />);
    const shell = screen.getByTestId("shell");
    expect(shell).toHaveStyle({ backgroundColor: "var(--bg)" });
  });
});
