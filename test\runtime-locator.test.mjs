import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  findBrowserClient,
  findNodeRepl,
  latestManifestEntry,
  redactPath,
  resolveOfficialRuntime,
  sha256File,
} from "../plugins/codex-edge/scripts/runtime-locator.mjs";

async function fixture() {
  const root = join(tmpdir(), `codex-edge-test-${process.pid}-${Date.now()}`);
  const profile = join(root, "profile");
  const localAppData = join(profile, "AppData", "Local");
  const codexHome = join(profile, ".codex");
  const pluginRoot = join(codexHome, "plugins", "cache", "openai-bundled", "chrome", "test-version");
  const clientPath = join(pluginRoot, "scripts", "browser-client.mjs");
  const nodeReplPath = join(localAppData, "OpenAI", "Codex", "runtimes", "cua_node", "test-runtime", "bin", "node_repl.exe");
  const manifestPath = join(root, "chrome-native-hosts-v2.json");

  await mkdir(join(pluginRoot, "scripts"), { recursive: true });
  await mkdir(join(pluginRoot, "docs"), { recursive: true });
  await mkdir(join(nodeReplPath, ".."), { recursive: true });
  await writeFile(clientPath, "export const testClient = true;\n", "utf8");
  await writeFile(join(pluginRoot, "docs", "api.json"), "{}\n", "utf8");
  await writeFile(join(pluginRoot, "docs", "documents.json"), "{}\n", "utf8");
  await writeFile(nodeReplPath, "fixture\n", "utf8");
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 2, entries: [] }), "utf8");

  return {
    root,
    clientPath,
    nodeReplPath,
    manifestPath,
    env: { LOCALAPPDATA: localAppData, USERPROFILE: profile, CODEX_HOME: codexHome },
  };
}

test("finds the official-style client and Node REPL without copying them", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));

  const browserClient = await findBrowserClient({ env: f.env, manifestPath: f.manifestPath });
  const nodeRepl = await findNodeRepl({ env: f.env, manifestPath: f.manifestPath });
  assert.equal(browserClient.path, f.clientPath);
  assert.equal(browserClient.source, "official-cache-chrome");
  assert.equal(nodeRepl.path, f.nodeReplPath);
  assert.equal(nodeRepl.source, "official-runtime");

  const combined = await resolveOfficialRuntime({ env: f.env, manifestPath: f.manifestPath });
  assert.equal(combined.browserClient.path, f.clientPath);
  assert.equal(combined.nodeRepl.path, f.nodeReplPath);
});

test("rejects a client that lacks packaged documentation", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await rm(join(f.clientPath, "..", "..", "docs", "api.json"));
  assert.equal(await findBrowserClient({ env: f.env, manifestPath: f.manifestPath }), null);
});

test("selects the latest manifest entry by updatedAt", () => {
  const result = latestManifestEntry({ entries: [
    { updatedAt: "2026-01-01T00:00:00Z" },
    { updatedAt: "2026-02-01T00:00:00Z" },
  ] });
  assert.equal(result.index, 1);
});

test("redacts user roots and unknown drive roots", () => {
  const env = {
    LOCALAPPDATA: "C:\\Users\\private\\AppData\\Local",
    USERPROFILE: "C:\\Users\\private",
    CODEX_HOME: "F:\\PrivateCodex",
  };
  assert.equal(
    redactPath("C:\\Users\\private\\AppData\\Local\\OpenAI\\Codex", env),
    "<LOCALAPPDATA>\\OpenAI\\Codex",
  );
  assert.equal(
    redactPath("D:\\SecretRoot\\a\\b\\c\\file.txt", env),
    "<ABSOLUTE_PATH>\\a\\b\\c\\file.txt",
  );
});

test("computes a stable SHA-256 for the selected local client", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  assert.match(await sha256File(f.clientPath), /^[a-f0-9]{64}$/);
  assert.equal(await sha256File(f.clientPath), await sha256File(f.clientPath));
});
