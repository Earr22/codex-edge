# Troubleshooting

## Start with the doctor

Run from the installed plugin directory:

```powershell
node scripts/codex-edge.mjs doctor
```

Keep path redaction enabled when sharing results.

## Plugin installed but tools are missing

Restart Codex Desktop and open a new task. Plugin skills and MCP tools are loaded at task creation time; an existing task may not see a newly installed or updated plugin.

## Official browser client or Node REPL is missing

Update Codex Desktop, restart it, and reinstall/enable the official Chrome browser plugin through the normal product UI. Codex Edge does not download or copy those proprietary runtime files.

## `stale-resources-path`

Run a repair preview:

```powershell
node scripts/codex-edge.mjs repair
```

If the proposed current path exists and the old path does not, review the change and backup behavior. Apply only after explicit confirmation:

```powershell
node scripts/codex-edge.mjs repair --apply --acknowledge-backup
```

Restart Codex Desktop and create a new task afterward.

## Extension says connected but Edge is unavailable

Confirm:

1. The official ChatGPT browser extension is enabled in the active Edge profile.
2. Codex Edge is enabled for the new task.
3. Codex Desktop and Edge were both restarted after installation or repair.
4. The doctor finds the official browser client and Node REPL.

If all checks pass but `agent.browsers.get("edge")` fails, an upstream compatibility change may have broken the unsupported Edge path. Do not switch to trust-all-code, disable sandboxing, open a debugging port, or copy runtime files into this repository.

## Reporting a problem

Include Codex Desktop version, Windows version, Edge version, extension version, Codex Edge version, and redacted doctor findings. Do not include a full manifest, username, raw local path, token, Cookie, tab list, private URL, or account screenshot.
