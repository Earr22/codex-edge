# Privacy

Codex Edge is local software with no project-operated server, analytics, telemetry, advertising, or account database.

## Local data used

The launcher reads only the minimum local metadata needed to find the official Codex browser client and Node REPL. The doctor checks whether specific Codex manifest and runtime paths exist. Path output is redacted by default.

The optional repair reads one Codex manifest, backs it up locally, and may replace the latest entry's `paths.resourcesPath` after explicit confirmation.

## Browser data

Codex Edge's instructions prohibit reading cookies, passwords, tokens, browser history, local/session storage, and raw browser profiles. It also tells the Agent not to enumerate unrelated tabs.

The official browser runtime can still return page content, screenshots, and action results to the active Codex task when required by the user's request. That data is governed by the policies and settings of Codex, ChatGPT, Edge, the extension, and the visited website—not by a Codex Edge server, because no such server exists.

## Network access

The plugin itself does not call a project-owned network endpoint. Installation downloads this public GitHub repository through Codex's Marketplace mechanism. Browser tasks access only sites requested or approved by the user through the official runtime.

## Logs and diagnostics

Codex Edge does not create its own persistent log file. A repair backup remains under the local Codex manifest directory so the user can recover the previous state. Do not publish raw diagnostic output produced with `--show-paths`.
