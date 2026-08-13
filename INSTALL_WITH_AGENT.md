# Install Codex Edge with an Agent

Paste the prompt below into a new Codex task. The prompt authorizes installation, but not an automatic system repair.

```text
Install the unofficial Codex Edge plugin from https://github.com/Earr22/codex-edge for this Windows user.

Goal:
- Install codex-edge as a Codex plugin Marketplace source.
- Run a read-only diagnostic.
- Leave the system in a state where a new Codex Desktop task can explicitly use Microsoft Edge.

Required workflow:
1. Confirm the OS is Windows. Confirm Codex Desktop, Microsoft Edge, Node.js 18+, and the official ChatGPT browser extension are present. Do not inspect browser profile contents.
2. Read README.md, SECURITY.md, PRIVACY.md, THIRD_PARTY.md, and this file from the repository.
3. Locate a runnable official Codex CLI. Prefer the latest native-host manifest's `paths.codexCliPath`; otherwise try the current user's `.codex/plugins/.plugin-appserver/codex.exe`, then the `codex` command. Do not print the raw path.
4. Check whether the repository is already configured as a Marketplace. Use supported Codex plugin commands; do not hand-edit config.toml or another Marketplace entry.
5. Run with the resolved Codex CLI:
   codex plugin marketplace add Earr22/codex-edge
   codex plugin add codex-edge@codex-edge
6. Locate the installed plugin through Codex's plugin listing or cache metadata; do not guess a versioned path.
7. Run `node scripts/codex-edge.mjs doctor` from the installed plugin. Keep path redaction enabled.
8. If the doctor is healthy, stop changing files. Ask the user to restart Codex Desktop and open a new task with Codex Edge enabled.
9. If the doctor reports a stale resourcesPath, run `node scripts/codex-edge.mjs repair` only as a preview. Show the field, redacted before/after values, backup location policy, and why the change is needed.
10. Ask for explicit confirmation before repair. Only after confirmation run:
   node scripts/codex-edge.mjs repair --apply --acknowledge-backup
11. Re-run the doctor, then ask the user to restart Codex Desktop and create a new task.
12. Verify with a public, non-authenticated page such as https://example.com. Do not list pre-existing tabs and do not use an account page.

Hard safety limits:
- Never request or reveal passwords, tokens, cookies, session data, browser history, local/session storage, or raw browser profiles.
- Never output raw user paths unless the user explicitly requests them for troubleshooting.
- Never set NODE_REPL_TRUST_ALL_CODE=1, disable sandboxing, open a remote-debugging port, or substitute Chrome/in-app Browser.
- Never modify the official browser client, extension files, WindowsApps files, registry, global Git configuration, or unrelated Codex settings.
- Never apply a repair without the separate confirmation in step 10.

Final report:
- Installed or already installed
- Doctor status
- Repair previewed/applied/not needed
- Backup created, if any, using a redacted path
- Restart and new-task instructions
```

## Expected healthy result

- Both the official browser client and official Node REPL are found locally.
- The native-host manifests exist.
- The latest Codex resources path exists.
- Findings are `none`.

Installation success does not prove that Edge is connected. The final browser check must happen in a fresh Codex Desktop task with Codex Edge enabled.
