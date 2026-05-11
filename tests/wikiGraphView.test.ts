import assert from "node:assert/strict";
import { buildWikiGraphViewModel } from "../src/wiki/wikiGraphView";
import type { ContexWikiNode } from "../src/wiki/wikiSchema";

const now = "2026-05-08T00:00:00.000Z";
const nodes: ContexWikiNode[] = [
  {
    id: "workflow-voice",
    type: "workflow",
    title: "Voice Flow",
    aliases: [],
    summary: "Voice workflow with STT and TTS.",
    path: "Contex Wiki/Wiki/Workflows/Voice Flow.md",
    confidence: 0.85,
    freshness: "current",
    sources: [
      {
        id: "source-voice",
        kind: "vault",
        title: "Voice Flow",
        locator: "Obsidian/Voice Flow.md",
        capturedAt: now
      }
    ],
    relations: [{ type: "uses", targetId: "tool-whisper" }],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "tool-whisper",
    type: "tool",
    title: "Whisper",
    aliases: [],
    summary: "Speech recognition.",
    path: "Contex Wiki/Wiki/Tools/Whisper.md",
    confidence: 0.7,
    freshness: "stale",
    sources: [],
    relations: [],
    createdAt: now,
    updatedAt: "2025-01-01T00:00:00.000Z"
  }
];

const model = buildWikiGraphViewModel(nodes, {
  focusNodeId: "workflow-voice",
  now
});

assert.equal(model.nodes.length, 2);
assert.equal(model.edges.length, 1);
assert.equal(model.nodes[0]!.isFocus, true);
assert.equal(model.nodes[1]!.needsRefresh, true);
assert.equal(model.summary.staleNodes, 1);
assert.equal(model.quickActions[0]!.kind, "open");
assert.ok(model.quickActions.some((action) => action.kind === "refresh_stale"));

console.log("wikiGraphView tests passed");
