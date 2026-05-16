import assert from "node:assert/strict";

import {
  buildWebResearchNoteContent,
  buildWebResearchSourceContext
} from "../src/web/webResearchNote";

const result = {
  title: "Local LLM News [May]",
  url: "https://example.com/llm",
  snippet: "Fresh local LLM release notes.",
  source: "Example",
  sourceType: "news" as const,
  publishedDate: "2026-05-13",
  freshnessHint: "published today",
  qualityNotes: ["primary source", "recent"]
};

{
  const content = buildWebResearchNoteContent({
    query: "latest local LLM news",
    searchQuery: "latest local LLM news May 2026",
    summary: "Local LLMs are moving quickly.",
    checkedDate: "2026-05-13",
    results: [result]
  });

  assert.ok(content.startsWith("# Research: latest local LLM news"));
  assert.ok(content.includes("Checked: 2026-05-13"));
  assert.ok(content.includes("Search query: latest local LLM news May 2026"));
  assert.ok(content.includes("## Summary"));
  assert.ok(content.includes("Local LLMs are moving quickly."));
  assert.ok(content.includes("1. [Local LLM News \\[May\\]](https://example.com/llm)"));
  assert.ok(content.includes("- Source: Example"));
  assert.ok(content.includes("- Type: news"));
  assert.ok(content.includes("- Published: 2026-05-13"));
  assert.ok(content.includes("- Quality: primary source; recent"));
}

{
  const content = buildWebResearchNoteContent({
    query: "same query",
    searchQuery: "same query",
    summary: "Summary only.",
    checkedDate: "2026-05-13",
    results: []
  });

  assert.ok(!content.includes("Search query:"));
}

{
  const sourceContext = buildWebResearchSourceContext({
    query: "latest local LLM news",
    contentLength: 1234,
    results: [result],
    formatWebSearchContext: (results) => `Formatted ${results.length} result`
  });

  assert.equal(sourceContext.path, "Web Research");
  assert.equal(sourceContext.name, "latest local LLM news");
  assert.equal(sourceContext.text, "Formatted 1 result");
  assert.equal(sourceContext.originalLength, 1234);
  assert.equal(sourceContext.includedLength, 1234);
}

console.log("webResearchNote tests passed");
