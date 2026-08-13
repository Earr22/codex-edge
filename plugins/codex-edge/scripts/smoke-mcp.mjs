#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const launcher = fileURLToPath(new URL("./start-node-repl.mjs", import.meta.url));
const child = spawn(process.execPath, [launcher], {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});

const timeout = setTimeout(() => finish(new Error("MCP smoke test timed out.")), 15_000);
timeout.unref?.();
let settled = false;
let stderr = "";

child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function finish(error, result) {
  if (settled) return;
  settled = true;
  clearTimeout(timeout);
  child.kill();
  if (error) {
    console.error(`Codex Edge MCP smoke test failed: ${error.message}`);
    if (stderr.trim()) console.error(stderr.trim().split(/\r?\n/).slice(-20).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

child.on("error", (error) => finish(error));
child.on("exit", (code) => {
  if (!settled && code !== 0) finish(new Error(`MCP launcher exited with code ${code}.`));
});

const lines = createInterface({ input: child.stdout });
lines.on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  if (message.id === 1 && message.result) {
    send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    return;
  }
  if (message.id === 2 && message.result) {
    const toolNames = (message.result.tools ?? []).map((tool) => tool.name).sort();
    const required = ["js", "js_add_node_module_dir", "js_reset"];
    const missing = required.filter((name) => !toolNames.includes(name));
    if (missing.length) {
      finish(new Error(`Missing MCP tools: ${missing.join(", ")}`));
      return;
    }
    finish(null, { ok: true, tools: toolNames });
  } else if (message.error) {
    finish(new Error(message.error.message ?? "MCP returned an error."));
  }
});

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "codex-edge-smoke", version: "0.1.0" },
  },
});
