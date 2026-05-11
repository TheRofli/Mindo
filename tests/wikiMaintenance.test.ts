import assert from "node:assert/strict";
import {
  analyzeWikiMaintenance,
  buildWikiMaintenanceMarkdown
} from "../src/wiki/wikiMaintenance";
import type { ContexWikiNode } from "../src/wiki/wikiSchema";

function node(partial: Partial<ContexWikiNode> & Pick<ContexWikiNode, "id" | "title">): ContexWikiNode {
  return {
    id: partial.id,
    type: partial.type ?? "concept",
    title: partial.title,
    aliases: partial.aliases ?? [],
    summary: partial.summary ?? "Summary",
    path: partial.path ?? `Contex Wiki/Wiki/Concepts/${partial.title}.md`,
    confidence: partial.confidence ?? 0.8,
    freshness: partial.freshness ?? "current",
    sources: partial.sources ?? [],
    relations: partial.relations ?? [],
    createdAt: partial.createdAt ?? "2026-05-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-05-01T00:00:00.000Z"
  };
}

const report = analyzeWikiMaintenance({
  nodes: [
    node({
      id: "concept-local-llm",
      title: "Local LLM",
      aliases: ["local model"],
      sources: [
        {
          id: "source-missing",
          kind: "vault",
          title: "Missing note",
          locator: "Missing/Note.md",
          capturedAt: "2026-05-01T00:00:00.000Z"
        }
      ],
      relations: [{ type: "uses", targetId: "tool-ollama" }]
    }),
    node({
      id: "concept-private-ai",
      title: "Private AI",
      aliases: ["local model"],
      freshness: "stale"
    }),
    node({
      id: "tool-ollama",
      title: "Ollama",
      updatedAt: "2025-01-01T00:00:00.000Z"
    })
  ],
  aliases: {
    "local model": ["concept-local-llm", "concept-private-ai"]
  },
  existingLocators: new Set(["Contex Wiki/Wiki/Concepts/Local LLM.md"]),
  now: "2026-05-08T00:00:00.000Z",
  staleAfterDays: 120
});

assert.equal(report.summary.nodes, 3);
assert.equal(report.duplicateAliases.length, 1);
assert.equal(report.brokenSources.length, 1);
assert.equal(report.staleNodes.length, 2);
assert.deepEqual(
  report.orphanNodes.map((item) => item.nodeId),
  ["concept-private-ai"]
);

const markdown = buildWikiMaintenanceMarkdown(report);
assert.ok(markdown.includes("# Contex Wiki Maintenance"));
assert.ok(markdown.includes("Duplicate aliases"));
assert.ok(markdown.includes("Missing/Note.md"));
assert.ok(markdown.includes("concept-private-ai"));

console.log("wikiMaintenance tests passed");
