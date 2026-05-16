import assert from "node:assert/strict";

import { buildContexDiagnosticsLines } from "../src/views/contexDiagnostics";

{
  const lines = buildContexDiagnosticsLines({
    activeNote: "Obsidian/Test.md",
    model: "gemma-4-e4b-it",
    rust: {
      mode: "native",
      executablePath: "C:/contex/bin/contex-core.exe",
      documents: 42,
      chunks: 128,
      lastIndexMs: 17,
      lastQueryMs: 4,
      lastError: ""
    }
  });

  assert.deepEqual(lines, [
    "Active note: Obsidian/Test.md",
    "Model: gemma-4-e4b-it",
    "Rust RAG: native",
    "Core: C:/contex/bin/contex-core.exe",
    "Docs: 42",
    "Chunks: 128",
    "Index sync: 17ms",
    "Query: 4ms"
  ]);
}

{
  const lines = buildContexDiagnosticsLines({
    activeNote: null,
    model: "deepseek-v4-flash",
    rust: {
      mode: "fallback",
      lastError: "binary missing"
    }
  });

  assert.deepEqual(lines, [
    "Active note: none",
    "Model: deepseek-v4-flash",
    "Rust RAG: fallback",
    "Last error: binary missing"
  ]);
}

console.log("contexDiagnostics tests passed");
