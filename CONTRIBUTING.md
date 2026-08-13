# Contributing

Thanks for improving Codex Edge. Keep the project a small compatibility layer.

## Non-negotiable boundaries

- Do not commit files copied from OpenAI's bundled plugins, browser client, documentation, or browser extension.
- Do not commit Microsoft Edge assets or trademarks.
- Do not add telemetry, analytics, affiliate links, credential collection, or hosted control services.
- Do not read cookies, passwords, tokens, browser history, local/session storage, or raw browser profiles.
- Do not bypass upstream confirmations or security controls.
- Do not add trust-all-code or sandbox-disabling workarounds.
- Any new repair must be separately consented, backed up, field-allowlisted, and verified.

## Local checks

```powershell
npm test
python <skill-creator-root>\scripts\quick_validate.py plugins\codex-edge\skills\control-edge
python <plugin-creator-root>\scripts\validate_plugin.py plugins\codex-edge
```

The absolute validator paths above are examples for a Codex development environment. Contributors may use the equivalent validators from their own Codex skill installation.

Also run the read-only live doctor on a test Windows machine:

```powershell
node plugins\codex-edge\scripts\codex-edge.mjs doctor
```

Never attach unredacted output to a public Issue.

## Pull requests

Explain the user-visible behavior, security impact, test coverage, and which upstream versions were tested. Keep changes focused and avoid drive-by reformatting.
