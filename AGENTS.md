# Repository guidance

Codex Edge is an unofficial, personal open-source Windows compatibility plugin.

- Keep the repository free of copied OpenAI browser clients, packaged docs, extension files, and Microsoft assets.
- Preserve the default read-only and path-redacted doctor behavior.
- Require explicit consent plus a successful backup before every repair.
- Limit the v0.1 repair allowlist to the newest manifest entry's `paths.resourcesPath`.
- Do not read credentials, cookies, tokens, history, local/session storage, browser profiles, or unrelated tabs.
- Do not bypass upstream website confirmations, sandboxes, or trust controls.
- Use `apply_patch` for edits. Run `npm test`, Skill validation, and plugin validation before proposing release.
- Never commit real diagnostic manifests, local paths, usernames other than the public GitHub identity, or private screenshots.
