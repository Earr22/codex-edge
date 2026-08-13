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
    "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($f…6951 tokens truncated…s to the active Codex task when required by the user's request. That data is governed by the policies and settings of Codex, ChatGPT, Edge, the extension, and the visited website—not by a Codex Edge server, because no such server exists.

## Network access

The plugin itself does not call a project-owned network endpoint. Installation downloads this public GitHub repository through Codex's Marketplace mechanism. Browser tasks access only sites requested or approved by the user through the official runtime.

## Logs and diagnostics

Codex Edge does not create its own persistent log file. A repair backup remains under the local Codex manifest directory so the user can recover the previous state. Do not publish raw diagnostic output produced with `--show-paths`.
