import assert from "node:assert/strict";
import {
  buildRealSourceRegistry,
  formatInlineCitation,
  formatSourceRegistryMarkdown
} from "../src/sources/sourceReferences";

const registry = buildRealSourceRegistry({
  vaultSources: [
    {
      path: "Obsidian/Voice Flow.md",
      title: "Voice Flow",
      score: 120,
      snippet: "Voice architecture"
    }
  ],
  webSources: [
    {
      title: "Local STT 2026",
      url: "https://example.com/stt",
      snippet: "Modern STT",
      source: "DuckDuckGo",
      publishedDate: "2026-05-06"
    }
  ],
  rawSources: [
    {
      path: "Contex Wiki/Raw/Web/local-stt.md",
      title: "Raw Local STT",
      capturedAt: "2026-05-08T00:00:00.000Z"
    }
  ]
});

assert.equal(registry.sources.length, 3);
assert.equal(registry.sources[0].kind, "vault");
assert.equal(registry.sources[1].kind, "web");
assert.equal(registry.sources[2].kind, "raw");
assert.equal(registry.sources[0].clickTarget, "Obsidian/Voice Flow.md");
assert.equal(registry.sources[1].clickTarget, "https://example.com/stt");
assert.equal(registry.sources[2].clickTarget, "Contex Wiki/Raw/Web/local-stt.md");

assert.equal(
  formatInlineCitation(registry.sources[0]),
  "[[Obsidian/Voice Flow|Voice Flow]]"
);
assert.equal(
  formatInlineCitation(registry.sources[1]),
  "[Local STT 2026](https://example.com/stt)"
);

const markdown = formatSourceRegistryMarkdown(registry);

assert.ok(markdown.includes("## Sources"));
assert.ok(markdown.includes("confidence:"));
assert.ok(markdown.includes("2026-05-06"));
assert.ok(!markdown.includes("Source 1"));

console.log("realSourceSystem tests passed");
