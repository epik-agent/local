/**
 * Structural tests for GitHub Actions workflow YAML files.
 *
 * These tests parse each workflow file and assert that the expected triggers,
 * jobs, and steps are present. They serve as a fast, in-process regression
 * guard — no GitHub runner required.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYamlString } from "yaml";
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Types that mirror the GitHub Actions YAML schema (subset used by tests)
// ---------------------------------------------------------------------------

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
  shell?: string;
  "working-directory"?: string;
}

interface WorkflowJob {
  name?: string;
  "runs-on"?: string;
  needs?: string | string[];
  strategy?: {
    "fail-fast"?: boolean;
    matrix?: {
      include?: Array<Record<string, string>>;
      [key: string]: unknown;
    };
  };
  permissions?: Record<string, string>;
  steps?: WorkflowStep[];
}

interface WorkflowOn {
  push?: {
    branches?: string[];
    "branches-ignore"?: string[];
    tags?: string[];
  };
  pull_request?: Record<string, unknown>;
  workflow_dispatch?: {
    inputs?: Record<string, { description?: string; required?: boolean }>;
  };
}

interface Workflow {
  name?: string;
  on?: WorkflowOn;
  concurrency?: Record<string, unknown>;
  jobs?: Record<string, WorkflowJob>;
}

interface CompositeRuns {
  using: string;
  steps: WorkflowStep[];
}

interface ActionInputDefinition {
  description?: string;
  required?: boolean;
  default?: string;
}

interface CompositeAction {
  name?: string;
  description?: string;
  inputs?: Record<string, ActionInputDefinition>;
  runs?: CompositeRuns;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Root of the repository (two levels up from src/test/) */
const REPO_ROOT = resolve(import.meta.dirname, "../../");

function readFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

function loadWorkflow(name: string): Workflow {
  const content = readFile(resolve(REPO_ROOT, `.github/workflows/${name}`));
  return parseYamlString(content) as Workflow;
}

function loadAction(path: string): CompositeAction {
  const content = readFile(resolve(REPO_ROOT, `.github/actions/${path}`));
  return parseYamlString(content) as CompositeAction;
}

function jobNames(workflow: Workflow): string[] {
  return Object.keys(workflow.jobs ?? {});
}

function stepsOf(workflow: Workflow, jobId: string): WorkflowStep[] {
  return workflow.jobs?.[jobId]?.steps ?? [];
}

function stepUses(steps: WorkflowStep[]): string[] {
  return steps.flatMap((s) => (s.uses !== undefined ? [s.uses] : []));
}

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// ---------------------------------------------------------------------------
// ci.yml — existing workflow; ensure it hasn't been broken
// ---------------------------------------------------------------------------

describe("ci.yml", () => {
  it("triggers on push to main and pull_request", () => {
    const wf = loadWorkflow("ci.yml");
    expect(wf.on?.push).toBeDefined();
    expect(wf.on?.pull_request).toBeDefined();
    expect(wf.on?.push?.branches).toContain("main");
  });

  it("has parallel frontend jobs and rust job", () => {
    const wf = loadWorkflow("ci.yml");
    const names = jobNames(wf);
    expect(names).toContain("frontend-format");
    expect(names).toContain("frontend-lint");
    expect(names).toContain("frontend-typecheck");
    expect(names).toContain("frontend-test");
    expect(names).toContain("frontend-build");
    expect(names).toContain("rust");
  });

  it("frontend-format job uses setup-node composite action", () => {
    const wf = loadWorkflow("ci.yml");
    const uses = stepUses(stepsOf(wf, "frontend-format"));
    expect(uses.some((u) => u.includes("setup-node"))).toBe(true);
  });

  it("rust job uses setup-rust composite action", () => {
    const wf = loadWorkflow("ci.yml");
    const uses = stepUses(stepsOf(wf, "rust"));
    expect(uses.some((u) => u.includes("setup-rust"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// release.yml
// ---------------------------------------------------------------------------

describe("release.yml", () => {
  it("triggers only on workflow_dispatch", () => {
    const wf = loadWorkflow("release.yml");
    expect(wf.on?.workflow_dispatch).toBeDefined();
    expect(wf.on?.push).toBeUndefined();
    expect(wf.on?.pull_request).toBeUndefined();
  });

  it("workflow_dispatch requires a tag input", () => {
    const wf = loadWorkflow("release.yml");
    expect(wf.on?.workflow_dispatch?.inputs).toHaveProperty("tag");
    expect(wf.on?.workflow_dispatch?.inputs?.["tag"]?.required).toBe(true);
  });

  it("has a build job", () => {
    const wf = loadWorkflow("release.yml");
    expect(jobNames(wf)).toContain("build");
  });

  it("has a publish job", () => {
    const wf = loadWorkflow("release.yml");
    expect(jobNames(wf)).toContain("publish");
  });

  it("has no frontend checks job (ci.yml handles that)", () => {
    const wf = loadWorkflow("release.yml");
    expect(jobNames(wf)).not.toContain("frontend");
  });

  it("build job covers linux, macos, and windows platforms", () => {
    const wf = loadWorkflow("release.yml");
    const includes = wf.jobs?.["build"]?.strategy?.matrix?.include ?? [];
    const platforms = includes.map((i) => i["platform"]);
    expect(platforms).toContain("linux");
    expect(platforms).toContain("macos");
    expect(platforms).toContain("windows");
  });

  it("build job uses build-tauri composite action", () => {
    const wf = loadWorkflow("release.yml");
    const uses = stepUses(stepsOf(wf, "build"));
    expect(uses.some((u) => u.includes("build-tauri"))).toBe(true);
  });

  it("publish job depends on build job", () => {
    const wf = loadWorkflow("release.yml");
    const needs = toArray(wf.jobs?.["publish"]?.needs);
    expect(needs).toContain("build");
  });

  it("publish job uses softprops/action-gh-release", () => {
    const wf = loadWorkflow("release.yml");
    const uses = stepUses(stepsOf(wf, "publish"));
    expect(uses.some((u) => u.includes("action-gh-release"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// build-tauri composite action
// ---------------------------------------------------------------------------

describe("build-tauri composite action", () => {
  it("is a composite action", () => {
    const action = loadAction("build-tauri/action.yml");
    expect(action.runs?.using).toBe("composite");
  });

  it("installs Linux system dependencies on Linux runners", () => {
    const action = loadAction("build-tauri/action.yml");
    const steps = action.runs?.steps ?? [];
    const linuxStep = steps.find((s) => s.if !== undefined && s.if.includes("Linux"));
    expect(linuxStep).toBeDefined();
    expect(linuxStep?.with?.packages).toContain("libwebkit2gtk");
  });

  it("uses setup-node composite action", () => {
    const action = loadAction("build-tauri/action.yml");
    const uses = stepUses(action.runs?.steps ?? []);
    expect(uses.some((u) => u.includes("setup-node"))).toBe(true);
  });

  it("uses setup-rust composite action", () => {
    const action = loadAction("build-tauri/action.yml");
    const uses = stepUses(action.runs?.steps ?? []);
    expect(uses.some((u) => u.includes("setup-rust"))).toBe(true);
  });

  it("uses tauri-apps/tauri-action", () => {
    const action = loadAction("build-tauri/action.yml");
    const uses = stepUses(action.runs?.steps ?? []);
    expect(uses.some((u) => u.includes("tauri-action"))).toBe(true);
  });

  it("exposes upload-artifacts input", () => {
    const action = loadAction("build-tauri/action.yml");
    expect(action.inputs).toHaveProperty("upload-artifacts");
  });

  it("exposes artifact-name input", () => {
    const action = loadAction("build-tauri/action.yml");
    expect(action.inputs).toHaveProperty("artifact-name");
  });
});
