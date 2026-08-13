import { createHash } from "node:crypto";
import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const MANIFEST_NAME = "chrome-native-hosts-v2.json";

async function isReadableFile(path) {
  if (!path) return false;
  try {
    await access(path, constants.R_OK);
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function isReadableDirectory(path) {
  if (!path) return false;
  try {
    await access(path, constants.R_OK);
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export function defaultBrowserManifestPath(env = process.env) {
  return env.LOCALAPPDATA
    ? join(env.LOCALAPPDATA, "OpenAI", "Codex", MANIFEST_NAME)
    : null;
}

export function defaultNativeHostManifestPath(env = process.env) {
  return env.LOCALAPPDATA
    ? join(env.LOCALAPPDATA, "OpenAI", "extension", "com.openai.codexextension.json")
    : null;
}

export async function readBrowserManifest(manifestPath = defaultBrowserManifestPath()) {
  if (!(await isReadableFile(manifestPath))) return null;
  const parsed = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!parsed || !Array.isArray(parsed.entries)) return null;
  return parsed;
}

export function latestManifestEntry(manifest) {
  if (!manifest?.entries?.length) return null;
  return manifest.entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const left = Date.parse(a.entry?.updatedAt ?? "") || 0;
      const right = Date.parse(b.entry?.updatedAt ?? "") || 0;
      return right - left;
    })[0];
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (!value) return false;
    const key = resolve(value).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function validateBrowserClient(path, source) {
  if (!(await isReadableFile(path))) return null;
  const pluginRoot = resolve(dirname(path), "..");
  const requiredDocs = [
    join(pluginRoot, "docs", "api.json"),
    join(pluginRoot, "docs", "documents.json"),
  ];
  if (!(await Promise.all(requiredDocs.map(isReadableFile))).every(Boolean)) return null;

  const info = await stat(path);
  return {
    path: await realpath(path),
    pluginRoot: await realpath(pluginRoot),
    source,
    modifiedAt: info.mtimeMs,
  };
}

async function cacheCandidates(codexHome) {
  const output = [];
  for (const family of ["browser", "chrome"]) {
    const familyRoot = join(codexHome, "plugins", "cache", "openai-bundled", family);
    if (!(await isReadableDirectory(familyRoot))) continue;
    for (const entry of await readdir(familyRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      output.push({
        path: join(familyRoot, entry.name, "scripts", "browser-client.mjs"),
        source: `official-cache-${family}`,
      });
    }
  }
  return output;
}

export async function findBrowserClient({ env = process.env, manifestPath } = {}) {
  const manifest = await readBrowserManifest(manifestPath ?? defaultBrowserManifestPath(env));
  const candidates = [];
  for (const entry of manifest?.entries ?? []) {
    if (entry?.paths?.browserClientPath) {
      candidates.push({ path: entry.paths.browserClientPath, source: "official-manifest" });
    }
  }

  const homes = unique([
    env.CODEX_HOME,
    env.USERPROFILE ? join(env.USERPROFILE, ".codex") : null,
    env.USERPROFILE ? null : join(homedir(), ".codex"),
  ]);
  for (const codexHome of homes) candidates.push(...(await cacheCandidates(codexHome)));

  const validated = [];
  const realSeen = new Set();
  for (const candidate of candidates) {
    const item = await validateBrowserClient(candidate.path, candidate.source);
    if (!item) continue;
    const key = item.path.toLowerCase();
    if (realSeen.has(key)) continue;
    realSeen.add(key);
    validated.push(item);
  }

  validated.sort((a, b) => {
    const priority = { "official-manifest": 3, "official-cache-browser": 2, "official-cache-chrome": 1 };
    return (priority[b.source] - priority[a.source]) || (b.modifiedAt - a.modifiedAt);
  });
  return validated[0] ?? null;
}

async function validateNodeRepl(path, source) {
  if (!(await isReadableFile(path))) return null;
  const info = await stat(path);
  return { path: await realpath(path), source, modifiedAt: info.mtimeMs };
}

export async function findNodeRepl({ env = process.env, manifestPath } = {}) {
  const manifest = await readBrowserManifest(manifestPath ?? defaultBrowserManifestPath(env));
  const candidates = [];
  for (const entry of manifest?.entries ?? []) {
    if (entry?.paths?.nodeReplPath) {
      candidates.push({ path: entry.paths.nodeReplPath, source: "official-manifest" });
    }
  }

  const runtimeRoot = env.LOCALAPPDATA
    ? join(env.LOCALAPPDATA, "OpenAI", "Codex", "runtimes", "cua_node")
    : null;
  if (await isReadableDirectory(runtimeRoot)) {
    for (const entry of await readdir(runtimeRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      candidates.push({
        path: join(runtimeRoot, entry.name, "bin", "node_repl.exe"),
        source: "official-runtime",
      });
    }
  }

  const validated = [];
  const realSeen = new Set();
  for (const candidate of candidates) {
    const item = await validateNodeRepl(candidate.path, candidate.source);
    if (!item) continue;
    const key = item.path.toLowerCase();
    if (realSeen.has(key)) continue;
    realSeen.add(key);
    validated.push(item);
  }
  validated.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return validated[0] ?? null;
}

export async function resolveOfficialRuntime(options = {}) {
  const [browserClient, nodeRepl] = await Promise.all([
    findBrowserClient(options),
    findNodeRepl(options),
  ]);
  if (!browserClient) {
    throw new Error("No official Codex browser client with packaged documentation was found.");
  }
  if (!nodeRepl) {
    throw new Error("No official Codex Node REPL runtime was found.");
  }
  return { browserClient, nodeRepl };
}

export async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export function redactPath(value, env = process.env) {
  if (typeof value !== "string" || !value) return value;
  const replacements = unique([
    env.LOCALAPPDATA,
    env.USERPROFILE,
    env.CODEX_HOME,
    env.USERPROFILE ? null : homedir(),
  ]).sort((a, b) => b.length - a.length);
  let result = value;
  for (const prefix of replacements) {
    const label = prefix === env.LOCALAPPDATA
      ? "<LOCALAPPDATA>"
      : prefix === env.CODEX_HOME
        ? "<CODEX_HOME>"
        : prefix === env.USERPROFILE
          ? "<USERPROFILE>"
          : "<HOME>";
    if (result.toLowerCase().startsWith(prefix.toLowerCase())) {
      result = label + result.slice(prefix.length);
      break;
    }
  }
  if (/^[A-Za-z]:[\\/]/.test(result)) {
    const segments = result.split(/[\\/]+/).filter(Boolean);
    result = `<ABSOLUTE_PATH>\\${segments.slice(-4).join("\\")}`;
  }
  return result;
}

export const pathChecks = { isReadableDirectory, isReadableFile };
