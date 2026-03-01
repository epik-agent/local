/**
 * Bundle the sidecar TypeScript source into a self-contained Node.js
 * executable and copy it into the Tauri binaries directory with the
 * platform-specific suffix that Tauri expects.
 *
 * Usage:
 *   node scripts/bundle.mjs
 *
 * Output:
 *   ../src-tauri/binaries/epik-sidecar-<target-triple>
 *
 * This script requires:
 *   - esbuild (bundler)
 *   - @yao-pkg/pkg or similar tool for producing a native binary
 *
 * For local development the script can also produce a shell-script wrapper
 * that invokes the bundled JS via `node`.  Set EPIK_SIDECAR_DEV=1 to use
 * this lighter-weight mode.
 */

import { execSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { platform, arch } from "node:os";

const ROOT = resolve(import.meta.dirname, "..");
const SIDECAR_DIR = ROOT;
const TAURI_BINARIES = resolve(ROOT, "../src-tauri/binaries");
const BUNDLE_FILE = join(SIDECAR_DIR, "dist-bundle", "epik-sidecar.mjs");

/** Map Node.js platform/arch to Rust target triple used by Tauri. */
function targetTriple() {
  const os = platform();
  const cpu = arch();

  /** @type {Record<string, string>} */
  const OS_MAP = { darwin: "apple-darwin", linux: "unknown-linux-gnu", win32: "pc-windows-msvc" };
  /** @type {Record<string, string>} */
  const ARCH_MAP = { x64: "x86_64", arm64: "aarch64" };

  const osStr = OS_MAP[os] ?? os;
  const archStr = ARCH_MAP[cpu] ?? cpu;

  return `${archStr}-${osStr}`;
}

const triple = targetTriple();
const binaryName = `epik-sidecar-${triple}${platform() === "win32" ? ".exe" : ""}`;
const outPath = join(TAURI_BINARIES, binaryName);

mkdirSync(TAURI_BINARIES, { recursive: true });
mkdirSync(join(SIDECAR_DIR, "dist-bundle"), { recursive: true });

// Step 1: Bundle with esbuild
console.log("Bundling with esbuild...");
execSync(
  `npx esbuild src/index.ts --bundle --platform=node --target=node22 --format=esm --outfile=${BUNDLE_FILE} --external:@anthropic-ai/claude-code`,
  { cwd: SIDECAR_DIR, stdio: "inherit" },
);

if (process.env["EPIK_SIDECAR_DEV"] === "1") {
  // Dev mode: write a shell script wrapper instead of compiling a binary.
  // This avoids the need for pkg/SEA tooling in CI.
  console.log("Dev mode: writing shell-script wrapper...");
  const wrapper = `#!/usr/bin/env sh\nexec node "${BUNDLE_FILE}" "$@"\n`;
  writeFileSync(outPath, wrapper);
  chmodSync(outPath, 0o755);
  console.log(`Wrote wrapper: ${outPath}`);
} else {
  // Production: use Node SEA (Node.js ≥ 21) to compile a real binary.
  // See: https://nodejs.org/api/single-executable-applications.html
  const seaConfig = join(SIDECAR_DIR, "dist-bundle", "sea-config.json");
  const seaBlob = join(SIDECAR_DIR, "dist-bundle", "sea-prep.blob");
  const nodeBin = process.execPath;

  writeFileSync(
    seaConfig,
    JSON.stringify({
      main: BUNDLE_FILE,
      output: seaBlob,
      disableExperimentalSEAWarning: true,
    }),
  );

  console.log("Generating SEA blob...");
  execSync(`node --experimental-sea-config ${seaConfig}`, { stdio: "inherit" });

  console.log(`Copying node binary to ${outPath}...`);
  copyFileSync(nodeBin, outPath);

  console.log("Injecting SEA blob...");
  execSync(
    `npx postject ${outPath} NODE_SEA_BLOB ${seaBlob} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
    { cwd: SIDECAR_DIR, stdio: "inherit" },
  );
  console.log(`Binary: ${outPath}`);
}
