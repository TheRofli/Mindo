import assert from "node:assert/strict";
import {
  buildWikiConfidenceLabel,
  rankWikiMaintenanceTargets,
  scoreWikiNodeConfidence
} from "../src/wiki/wikiConfidence";
import type { ContexWikiNode } from "../src/wiki/wikiSchema";

function node(partial: Partial<ContexWikiNode> & Pick<ContexWikiNode, "id" | "title">): ContexWikiNode {
  return {
    id: partial.id,
    type: partial.type ?? "concept",
    title: partial.title,
    aliases: partial.aliases ?? [],
    summary: partial.summary ?? "Summary",
    path: partial.path ?? `Contex Wiki/Wiki/Concepts/${partial.title}.md`,
    confidence: partial.confidence ?? 0.5,
    freshness: partial.freshness ?? "current",
    sources: partial.sources ?? [],
    relations: partial.relations ?? [],
    createdAt: partial.createdAt ?? "2026-05-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-05-01T00:00:00.000Z"
  };
}

const strong = node({
  id: "workflow-voice-flow",
  title: "Voice Flow",
  confidence: 0.8,
  sources: [
    {
      id: "vault-spec",
      kind: "vault",
      title: "Spec",
      locator: "Obsidian/Spec.md",
      capturedAt: "2026-05-08T00:00:00.000Z"
    },
    {
      id: "web-stt",
      kind: "web",
      title: "STT 2026",
      locator: "https://example.com/stt",
      capturedAt: "2026-05-08T00:00:00.000Z"
    }
  ],
  relations: [{ type: "uses", targetId: "tool-whisper" }]
});

const weak = node({
  id: "concept-old",
  title: "Old Idea",
  confidence: 0.3,
  freshness: "stale",
  sources: [],
  updatedAt: "2025-01-01T00:00:00.000Z"
});

const strongScore = scoreWikiNodeConfidence(strong, {
  now: "2026-05-08T00:00:00.000Z"
});

assert.equal(strongScore.level, "high");
assert.ok(strongScore.score >= 0.8);
assert.equal(strongScore.needsRefresh, false);
assert.ok(buildWikiConfidenceLabel(strongScore).includes("High"));

const weakScore = scoreWikiNodeConfidence(weak, {
  now: "2026-05-08T00:00:00.000Z"
});

assert.equal(weakScore.level, "stale");
assert.equal(weakScore.needsRefresh, true);
assert.ok(weakScore.reasons.includes("No sources"));

const targets = rankWikiMaintenanceTargets([strong, weak], {
  now: "2026-05-08T00:00:00.000Z"
});

assert.equal(targets[0].node.id, "concept-old");
assert.equal(targets[0].assessment.needsRefresh, true);

console.log("wikiConfidence tests passed");
