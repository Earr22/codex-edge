#!/usr/bin/env node

import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  defaultBrowserManifestPath,
  defaultNativeHostManifestPath,
  latestManifestEntry,
  pathChecks,
  readBrowserManifest,
  redactPath,
  resolveOfficialRuntime,
} from "./runtime-locator.mjs";

const execFileAsync = promisify(execFile);

function usage() {
  return `Codex Edge diagnostics

Usage:
  node scripts/codex-edge.mjs doctor [--json] [--show-paths]
  node scripts/codex-edge.mjs repair [--json] [--show-paths]
  node scripts/codex-edge.mjs repair --apply --acknowledge-backup [--json]

The doctor and repair preview are read-only. The apply form creates a backup,
changes only the latest manifest entry's resourcesPath, and verifies the result.`;
}

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const flags = new Set(rest);
  const allowed = new Set(["--json", "--show-paths", "--apply", "--acknowledge-backup"]);
  for (const flag of flags) {
    if (!allowed.has(flag)) throw new Error(`Unknown option: ${flag}`);
  }
  return {
    command,
    json: flags.has("--json"),
    showPaths: flags.has("--show-paths"),
    apply: flags.has("--apply"),
    acknowledgeBackup: flags.has("--acknowledge-backup"),
  };
}

function publicPath(path, showPaths) {
  return showPaths ? path : redactPath(path);
}

async function findCurrentResourcesPath() {
  if (process.platform !== "win32") return null;
  const script = [
    "$ErrorActionPreference='Stop'",
    "$pkg=Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending | Select-Object -First 1",
    "if(-not $pkg){exit 4}",
    "$candidate=Join-Path $pkg.InstallLocation 'app\\resources'",
    "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)",
    "Write-Output $candidate",
  ].join("; ");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script,
  ], { windowsHide: true, encoding: "utf8" });
  const candidate = stdout.trim();
  if (!candidate || !(await pathChecks.isReadableDirectory(candidate))) return null;
  if (!(await pathChecks.isReadableDirectory(join(candidate, "plugins")))) return null;
  return resolve(candidate);
}

async function doctor({ showPaths = false } = {}) {
  const browserManifestPath = defaultBrowserManifestPath();
  const nativeHostManifestPath = defaultNativeHostManifestPath();
  const report = {
    ok: true,
    supportedPlatform: process.platform === "win32",
    node: { version: process.versions.node, supported: Number(process.versions.node.split(".")[0]) >= 18 },
    files: {},
    runtime: {},
    resources: {},
    findings: [],
  };

  if (!report.supportedPlatform) report.findings.push("unsupported-platform");
  if (!report.node.supported) report.findings.push("unsupported-node-version");

  report.files.browserManifest = {
    path: publicPath(browserManifestPath, showPaths),
    exists: await pathChecks.isReadableFile(browserManifestPath),
  };
  report.files.nativeHostManifest = {
    path: publicPath(nativeHostManifestPath, showPaths),
    exists: await pathChecks.isReadableFile(nativeHostManifestPath),
  };
  if (!report.files.browserManifest.exists) report.findings.push("browser-manifest-missing");
  if (!report.files.nativeHostManifest.exists) report.findings.push("native-host-manifest-missing");

  try {
    const runtime = await resolveOfficialRuntime();
    report.runtime.browserClient = {
      found: true,
      source: runtime.browserClient.source,
      path: publicPath(runtime.browserClient.path, showPaths),
    };
    report.runtime.nodeRepl = {
      found: true,
      source: runtime.nodeRepl.source,
      path: publicPath(runtime.nodeRepl.path, showPaths),
    };
  } catch (error) {
    report.runtime.found = false;
    report.runtime.error = error.message;
    report.findings.push("official-runtime-missing");
  }

  const manifest = await readBrowserManifest(browserManifestPath);
  const latest = latestManifestEntry(manifest);
  const recorded = latest?.entry?.paths?.resourcesPath ?? null;
  let current = null;
  try {
    current = await findCurrentResourcesPath();
  } catch (error) {
    report.resources.discoveryError = error.message;
  }

  report.resources = {
    ...report.resources,
    latestEntryFound: Boolean(latest),
    latestEntryIndex: latest?.index ?? null,
    recordedPath: publicPath(recorded, showPaths),
    recordedPathExists: await pathChecks.isReadableDirectory(recorded),
    currentPath: publicPath(current, showPaths),
    currentPathExists: await pathChecks.isReadableDirectory(current),
    stale: Boolean(recorded && current && resolve(recorded).toLowerCase() !== current.toLowerCase()),
  };

  if (!latest) report.findings.push("manifest-has-no-entries");
  if (recorded && !report.resources.recordedPathExists && current) {
    report.findings.push("stale-resources-path");
  } else if (report.resources.stale) {
    report.findings.push("resources-path-version-mismatch");
  }

  report.ok = report.findings.length === 0;
  return report;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertOnlyResourcesPathChanged(before, after, entryIndex, expectedPath) {
  const normalized = cloneJson(after);
  normalized.entries[entryIndex].paths.resourcesPath = before.entries[entryIndex].paths.resourcesPath;
  if (JSON.stringify(normalized) !== JSON.stringify(before)) {
    throw new Error("Safety check failed: the proposed edit changes fields other than resourcesPath.");
  }
  if (after.entries[entryIndex].paths.resourcesPath !== expectedPath) {
    throw new Error("Safety check failed: resourcesPath does not match the discovered Codex package.");
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function repair(options) {
  const preview = await doctor(options);
  const manifestPath = defaultBrowserManifestPath();
  const manifest = await readBrowserManifest(manifestPath);
  const latest = latestManifestEntry(manifest);
  const currentPath = await findCurrentResourcesPath();
  if (!manifest || !latest || !currentPath) {
    throw new Error("Repair is unavailable because the manifest or current Codex resources path could not be verified.");
  }

  const oldPath = latest.entry?.paths?.resourcesPath;
  const needsChange = typeof oldPath === "string" && resolve(oldPath).toLowerCase() !== currentPath.toLowerCase();
  const result = {
    mode: options.apply ? "apply" : "preview",
    needsChange,
    field: `entries[${latest.index}].paths.resourcesPath`,
    from: publicPath(oldPath, options.showPaths),
    to: publicPath(currentPath, options.showPaths),
    backupRequired: true,
    applied: false,
    backupPath: null,
    doctor: preview,
  };

  if (!needsChange) return result;
  if (!options.apply) return result;
  if (!options.acknowledgeBackup) {
    throw new Error("Refusing to write: --acknowledge-backup is required with --apply.");
  }

  const before = cloneJson(manifest);
  const after = cloneJson(manifest);
  after.entries[latest.index].paths.resourcesPath = currentPath;
  assertOnlyResourcesPathChanged(before, after, latest.index, currentPath);

  const raw = await readFile(manifestPath, "utf8");
  const encodedOldPath = JSON.stringify(oldPath);
  const encodedNewPath = JSON.stringify(currentPath);
  const occurrences = raw.split(encodedOldPath).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Refusing to write: expected the old resourcesPath once, found ${occurrences}.`);
  }
  const updatedRaw = raw.replace(encodedOldPath, encodedNewPath);
  const parsedUpdated = JSON.parse(updatedRaw);
  assertOnlyResourcesPathChanged(before, parsedUpdated, latest.index, currentPath);

  const backupDir = join(dirname(manifestPath), "codex-edge-backups");
  await mkdir(backupDir, { recursive: true });
  const backupPath = join(backupDir, `${timestamp()}-${MANIFEST_BACKUP_NAME}`);
  await copyFile(manifestPath, backupPath);

  const tempPath = `${manifestPath}.codex-edge.tmp`;
  await writeFile(tempPath, updatedRaw, { encoding: "utf8", flag: "wx" });
  await rename(tempPath, manifestPath);

  const verified = await readBrowserManifest(manifestPath);
  assertOnlyResourcesPathChanged(before, verified, latest.index, currentPath);
  if (!(await pathChecks.isReadableDirectory(verified.entries[latest.index].paths.resourcesPath))) {
    throw new Error("Post-write verification failed: repaired resourcesPath is not readable.");
  }

  result.applied = true;
  result.backupPath = publicPath(backupPath, options.showPaths);
  result.doctor = await doctor(options);
  return result;
}

const MANIFEST_BACKUP_NAME = "chrome-native-hosts-v2.json.bak";

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (report.mode) {
    console.log(`Codex Edge repair: ${report.mode}`);
    console.log(`Change needed: ${report.needsChange}`);
    console.log(`Target: ${report.field}`);
    console.log(`From: ${report.from}`);
    console.log(`To:   ${report.to}`);
    console.log(`Applied: ${report.applied}`);
    if (report.backupPath) console.log(`Backup: ${report.backupPath}`);
    return;
  }
  console.log(`Codex Edge doctor: ${report.ok ? "healthy" : "attention needed"}`);
  console.log(`Platform: ${report.supportedPlatform ? "Windows" : "unsupported"}`);
  console.log(`Official browser client: ${report.runtime.browserClient?.found ? "found" : "missing"}`);
  console.log(`Official Node REPL: ${report.runtime.nodeRepl?.found ? "found" : "missing"}`);
  console.log(`Recorded resources path exists: ${report.resources.recordedPathExists}`);
  console.log(`Current resources path exists: ${report.resources.currentPathExists}`);
  console.log(`Findings: ${report.findings.length ? report.findings.join(", ") : "none"}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.command === "help" || options.command === "--help" || options.command === "-h") {
    console.log(usage());
  } else if (options.command === "doctor") {
    if (options.apply || options.acknowledgeBackup) throw new Error("Write flags are only valid with repair.");
    printReport(await doctor(options), options.json);
  } else if (options.command === "repair") {
    printReport(await repair(options), options.json);
  } else {
    throw new Error(`Unknown command: ${options.command}\n\n${usage()}`);
  }
} catch (error) {
  console.error(`Codex Edge: ${error.message}`);
  process.exitCode = 1;
}
