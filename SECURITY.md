# Security Policy

## Supported version

Only the latest release on the default branch is supported.

## Trust model

Codex Edge is a thin local compatibility layer. It does not provide a security boundary around Microsoft Edge, Codex, the AI model, the official ChatGPT browser extension, or the websites you visit.

When enabled, a browser task may read visible page content and perform actions that you approve. Page content can contain prompt injection or misleading instructions. Use a dedicated Edge profile for untrusted browsing and stay present for sensitive workflows.

## Guardrails in this repository

- No OpenAI browser client, official browser documentation, extension binary, or Microsoft Edge binary is redistributed.
- The runtime locator accepts only a local official client accompanied by its packaged API documentation.
- The launcher trusts only the exact SHA-256 of the locally selected official browser client.
- `NODE_REPL_TRUST_ALL_CODE` is removed from the child environment.
- The doctor is read-only and redacts paths by default.
- Repair supports one field only: the latest manifest entry's `paths.resourcesPath`.
- Repair requires `--apply --acknowledge-backup`, creates a timestamped backup, and verifies that no other JSON field changed.

## Not collected

Codex Edge has no analytics, telemetry, hosted service, account system, or update beacon. It does not intentionally read cookies, passwords, tokens, browser history, local/session storage, or raw browser profiles.

Page content returned by the official browser runtime may still become part of your Codex task and be processed according to your OpenAI account and product settings.

## Reporting a vulnerability

Open a GitHub security advisory if available. Otherwise open an Issue containing only a minimal reproduction and redacted diagnostics.

Do not attach:

- credentials, tokens, cookies, or authorization headers;
- unredacted local paths or usernames;
- private page text, screenshots, tab lists, or browsing history;
- full native-host manifests from a personal machine.

If a report requires sensitive evidence, state that privately shareable evidence exists and wait for a maintainer-approved channel.

## Out of scope

- vulnerabilities in Codex, ChatGPT, Microsoft Edge, or the official browser extension;
- website-specific prompt injection that does not exploit Codex Edge code;
- failures caused solely by unsupported upstream changes;
- social engineering that requires a user to ignore an explicit safety warning.
