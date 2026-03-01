import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useProjectScope } from "./useProjectScope";

describe("useProjectScope", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initialises with null org and repo", () => {
    const { result } = renderHook(() => useProjectScope());
    expect(result.current.org).toBeNull();
    expect(result.current.repo).toBeNull();
  });

  it("restores org and repo from localStorage on mount", () => {
    localStorage.setItem("epik.projectScope.org", "my-org");
    localStorage.setItem("epik.projectScope.repo", "my-repo");

    const { result } = renderHook(() => useProjectScope());

    expect(result.current.org).toBe("my-org");
    expect(result.current.repo).toBe("my-repo");
  });

  it("persists org to localStorage when setOrg is called", () => {
    const { result } = renderHook(() => useProjectScope());

    act(() => {
      result.current.setOrg("acme-corp");
    });

    expect(localStorage.getItem("epik.projectScope.org")).toBe("acme-corp");
    expect(result.current.org).toBe("acme-corp");
  });

  it("persists repo to localStorage when setRepo is called", () => {
    const { result } = renderHook(() => useProjectScope());

    act(() => {
      result.current.setRepo("api-server");
    });

    expect(localStorage.getItem("epik.projectScope.repo")).toBe("api-server");
    expect(result.current.repo).toBe("api-server");
  });

  it("clears org from localStorage when setOrg is called with null", () => {
    localStorage.setItem("epik.projectScope.org", "old-org");
    const { result } = renderHook(() => useProjectScope());

    act(() => {
      result.current.setOrg(null);
    });

    expect(localStorage.getItem("epik.projectScope.org")).toBeNull();
    expect(result.current.org).toBeNull();
  });

  it("clears repo from localStorage when setRepo is called with null", () => {
    localStorage.setItem("epik.projectScope.repo", "old-repo");
    const { result } = renderHook(() => useProjectScope());

    act(() => {
      result.current.setRepo(null);
    });

    expect(localStorage.getItem("epik.projectScope.repo")).toBeNull();
    expect(result.current.repo).toBeNull();
  });

  it("returns a scopeLabel combining org and repo", () => {
    const { result } = renderHook(() => useProjectScope());

    act(() => {
      result.current.setOrg("epik-agent");
      result.current.setRepo("local");
    });

    expect(result.current.scopeLabel).toBe("epik-agent/local");
  });

  it("returns null scopeLabel when org is missing", () => {
    const { result } = renderHook(() => useProjectScope());

    act(() => {
      result.current.setRepo("local");
    });

    expect(result.current.scopeLabel).toBeNull();
  });

  it("returns null scopeLabel when repo is missing", () => {
    const { result } = renderHook(() => useProjectScope());

    act(() => {
      result.current.setOrg("epik-agent");
    });

    expect(result.current.scopeLabel).toBeNull();
  });
});
