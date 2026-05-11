import assert from "node:assert/strict";
import { appendSourceReferenceSection } from "../src/sources/sourceReferences";

const content = appendSourceReferenceSection("Body cites Source 1.", {
  vaultSources: [
    {
      path: "Obisidian/Voice Flow.md",
      title: "Voice Flow",
      score: 42,
      snippet: "Voice flow note"
    }
  ],
  webSources: [
    {
      title: "Local STT 2026",
      url: "https://example.com/stt",
      snippet: "Modern STT",
      source: "DuckDuckGo"
    }
  ]
});

assert.ok(content.includes("## Sources"));
assert.ok(content.includes("kind: vault"));
assert.ok(content.includes("kind: web"));
assert.ok(!content.includes("- Source 1"));
assert.ok(content.includes("[[Obisidian/Voice Flow|Voice Flow]]"));
assert.ok(content.includes("[Local STT 2026](https://example.com/stt)"));

const withSourcesHeading = appendSourceReferenceSection("## Sources\n\nBare list.", {
  webSources: [
    {
      title: "Still linked",
      url: "https://example.com/linked",
      snippet: "Source"
    }
  ]
});

assert.ok(withSourcesHeading.includes("## Sources"));
assert.ok(withSourcesHeading.includes("[Still linked](https://example.com/linked)"));

console.log("sourceReferences tests passed");
