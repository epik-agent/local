import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders an SVG element", () => {
    render(<Logo />);
    const svg = screen.getByRole("img", { name: /epik logo/i });
    expect(svg).toBeInTheDocument();
  });

  it("renders with the default size of 32", () => {
    render(<Logo />);
    const svg = screen.getByRole("img", { name: /epik logo/i });
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
  });

  it("renders with a custom size", () => {
    render(<Logo size={64} />);
    const svg = screen.getByRole("img", { name: /epik logo/i });
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("height", "64");
  });

  it("renders the node graph constellation with four nodes", () => {
    const { container } = render(<Logo />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(4);
  });

  it("renders connecting edges", () => {
    const { container } = render(<Logo />);
    const lines = container.querySelectorAll("line");
    expect(lines).toHaveLength(4);
  });

  it("uses the mint accent colour (#00e599) on accent nodes", () => {
    const { container } = render(<Logo />);
    const circles = Array.from(container.querySelectorAll("circle"));
    const accentNodes = circles.filter((c) => c.getAttribute("fill") === "#00e599");
    expect(accentNodes.length).toBeGreaterThanOrEqual(1);
  });
});
