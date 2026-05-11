# Contex Core

Optional Rust core for accelerated Contex search/RAG primitives. It supports
both one-shot CLI search and a long-running `--serve` mode that keeps the vault
index in memory.

The Obsidian plugin must continue to work without this binary. TypeScript remains
the source of truth for UI and Obsidian API integration.

## Contract

The binary reads a dependency-free wire request from stdin and writes a JSON
response to stdout. The custom input format keeps the Rust core buildable without
crates.io access.

Wire request:

```text
CTXCORE_SEARCH_V1
<limit>
<query byte length>
<query utf8>
<document count>
<path byte length>
<path utf8>
<title byte length>
<title utf8>
<content byte length>
<content utf8>
```

Response:

```json
{
  "version": 1,
  "results": [
    {
      "path": "Obsidian/Voice Flow.md",
      "title": "Voice Flow",
      "score": 42.0,
      "snippet": "...",
      "heading": "Voice Flow"
    }
  ]
}
```

## Build

Install Rust first, then run:

```powershell
npm run core:test
npm run core:build
npm run core:install
```

The plugin checks these paths:

```text
bin/contex-core.exe
tools/contex_core/target/release/contex-core.exe
```

If no binary is present, or the process fails, Contex automatically falls back to
the TypeScript RAG implementation.

## Sidecar mode

The plugin prefers sidecar mode when the binary is available:

```powershell
bin/contex-core.exe --serve
```

Supported commands:

```text
CTXCORE_INDEX_V1
CTXCORE_UPSERT_V1
CTXCORE_REMOVE_V1
CTXCORE_SEARCH_INDEX_V1
CTXCORE_STATUS_V1
CTXCORE_EXIT_V1
```
