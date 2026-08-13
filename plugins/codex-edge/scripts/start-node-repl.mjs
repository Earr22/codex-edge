import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolveOfficialRuntime, sha256File } from "./runtime-locator.mjs";

const runtime = await resolveOfficialRuntime();
const browserClientHash = await sha256File(runtime.browserClient.path);
const inheritedHashes = (process.env.NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const trustedHashes = [...new Set([...inheritedHashes, browserClientHash])];

const childEnv = { ...process.env };
delete childEnv.NODE_REPL_TRUST_ALL_CODE;
childEnv.NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S = trustedHashes.join(",");
childEnv.CODEX_EDGE_BROWSER_CLIENT_URL = pathToFileURL(runtime.browserClient.path).href;

const child = spawn(runtime.nodeRepl.path, [], {
  env: childEnv,
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(`Codex Edge failed to start the official Node REPL: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Codex Edge Node REPL exited after signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
