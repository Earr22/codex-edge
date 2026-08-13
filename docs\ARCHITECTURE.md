# Architecture

Codex Edge is deliberately small:

```text
Marketplace manifest
  -> Codex plugin manifest
  -> control-edge Skill
  -> local MCP launcher
  -> official Node REPL already installed by Codex
  -> official browser client already installed by Codex
  -> official ChatGPT extension installed in Edge
```

## Runtime discovery

The launcher first checks the official Codex browser native-host manifest, then known OpenAI-bundled plugin cache locations under the current user's Codex home. A browser client is accepted only when its packaged `docs/api.json` and `docs/documents.json` exist beside it.

The Node REPL is resolved from the official manifest or Codex's local `runtimes/cua_node` directories. No executable is downloaded by this repository.

## Trust boundary

Before starting the Node REPL, the launcher hashes the selected official browser client and adds exactly that hash to `NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S`. Any inherited `NODE_REPL_TRUST_ALL_CODE` value is removed.

The selected browser-client file URL is passed to the Skill through `CODEX_EDGE_BROWSER_CLIENT_URL`. The Skill imports that exact file and asks the official runtime for browser family `edge`.

## Repair boundary

The repair command can modify one value only:

```text
latest manifest entry -> paths -> resourcesPath
```

The new value comes from the installed `OpenAI.Codex` Windows AppX package. The target must contain an `app/resources/plugins` directory. The command previews by default, requires two apply flags, saves the original manifest, performs a single textual JSON-string replacement to preserve formatting, parses the result, and deep-compares every other field.
