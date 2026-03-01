import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProjectScopeSelector } from "./ProjectScopeSelector";

describe("ProjectScopeSelector", () => {
  it("renders the org input", () => {
    render(
      <ProjectScopeSelector org={null} repo={null} onOrgChange={vi.fn()} onRepoChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText(/org/i)).toBeInTheDocument();
  });

  it("renders the repo input", () => {
    render(
      <ProjectScopeSelector org={null} repo={null} onOrgChange={vi.fn()} onRepoChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText(/repo/i)).toBeInTheDocument();
  });

  it("displays the current org value in the org input", () => {
    render(
      <ProjectScopeSelector
        org="epik-agent"
        repo={null}
        onOrgChange={vi.fn()}
        onRepoChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText<HTMLInputElement>(/org/i).value).toBe("epik-agent");
  });

  it("displays the current repo value in the repo input", () => {
    render(
      <ProjectScopeSelector org={null} repo="local" onOrgChange={vi.fn()} onRepoChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText<HTMLInputElement>(/repo/i).value).toBe("local");
  });

  it("calls onOrgChange when org input value changes", () => {
    const onOrgChange = vi.fn();

    render(
      <ProjectScopeSelector org="" repo={null} onOrgChange={onOrgChange} onRepoChange={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText(/org/i);
    fireEvent.change(input, { target: { value: "my-org" } });

    expect(onOrgChange).toHaveBeenCalledWith("my-org");
  });

  it("calls onRepoChange when repo input value changes", () => {
    const onRepoChange = vi.fn();

    render(
      <ProjectScopeSelector org={null} repo="" onOrgChange={vi.fn()} onRepoChange={onRepoChange} />,
    );

    const input = screen.getByPlaceholderText(/repo/i);
    fireEvent.change(input, { target: { value: "my-repo" } });

    expect(onRepoChange).toHaveBeenCalledWith("my-repo");
  });

  it("renders a scope label when both org and repo are set", () => {
    render(
      <ProjectScopeSelector
        org="epik-agent"
        repo="local"
        onOrgChange={vi.fn()}
        onRepoChange={vi.fn()}
      />,
    );
    expect(screen.getByText("epik-agent/local")).toBeInTheDocument();
  });

  it("does not render a scope label when org is missing", () => {
    render(
      <ProjectScopeSelector org={null} repo="local" onOrgChange={vi.fn()} onRepoChange={vi.fn()} />,
    );
    expect(screen.queryByText(/\/local/)).not.toBeInTheDocument();
  });
});
