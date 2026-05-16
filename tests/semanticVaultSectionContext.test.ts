import assert from "node:assert/strict";

import {
  buildSemanticVaultSectionContext
} from "../src/search/semanticVaultSectionContext";
import type { VaultSearchResult } from "../src/types";

const result = (
  path: string,
  overrides: Partial<VaultSearchResult> = {}
): VaultSearchResult => ({
  path,
  title: path.replace(/\.md$/i, ""),
  score: 42,
  snippet: `Snippet for ${path}`,
  ...overrides
});

{
  const files = new Map<string, { path: string }>([
    ["Notes/Architecture.md", { path: "Notes/Architecture.md" }]
  ]);

  const bundle = await buildSemanticVaultSectionContext({
    query: "voice architecture",
    results: [
      result("Notes/Architecture.md", {
        title: "Architecture",
        heading: "Voice Flow"
      }),
      result("Missing.md")
    ],
    getFileByPath: (path) => files.get(path) ?? null,
    readFile: async (file) => `Content for ${file.path}`,
    extractRelevantMarkdownSections: (content, query, item) => [
      {
        heading: "Voice Flow",
        excerpt: `${content} matched ${query}`,
        score: item.score + 5
      }
    ],
    formatSemanticVaultContext: (items) =>
      `Fallback source: ${items.map((item) => item.path).join(", ")}`
  });

  assert.ok(bundle.context.includes("Source 1"));
  assert.ok(bundle.context.includes("Path: Notes/Architecture.md"));
  assert.ok(bundle.context.includes("Matched heading: Voice Flow"));
  assert.ok(bundle.context.includes("Section 1"));
  assert.ok(bundle.context.includes("Fallback source: Missing.md"));
  assert.deepEqual(bundle.sections, [
    {
      path: "Notes/Architecture.md",
      title: "Architecture",
      heading: "Voice Flow",
      excerpt: "Content for Notes/Architecture.md matched voice architecture",
      score: 47
    }
  ]);
}

{
  const bundle = await buildSemanticVaultSectionContext({
    query: "empty sections",
    results: [result("Notes/Empty.md")],
    getFileByPath: () => ({ path: "Notes/Empty.md" }),
    readFile: async () => "# Empty",
    extractRelevantMarkdownSections: () => [],
    formatSemanticVaultContext: () => "unused fallback"
  });

  assert.ok(bundle.context.includes("Snippet: Snippet for Notes/Empty.md"));
  assert.deepEqual(bundle.sections, []);
}

console.log("semanticVaultSectionContext tests passed");
