import assert from "node:assert/strict";
import {
  buildWikiGraphIndex,
  buildWikiSchemaFiles,
  findWikiNodeIdsByAlias,
  getWikiNeighborhood
} from "../src/wiki/wikiGraphIndex";
import { createWikiNodeId, parseWikiJsonl, type ContexWikiNode } from "../src/wiki/wikiSchema";

const now = "2026-05-08T00:00:00.000Z";
const whisperId = createWikiNodeId("tool", "Whisper");
const voiceFlowId = createWikiNodeId("workflow", "Voice Flow");
const nodes: ContexWikiNode[] = [
  {
    id: voiceFlowId,
    type: "workflow",
    title: "Voice Flow",
    aliases: ["voice mode", "голосовой режим"],
    summary: "Voice workflow.",
    path: "Contex Wiki/Wiki/Workflows/Voice Flow.md",
    confidence: 0.9,
    freshness: "current",
    sources: [
      {
        id: "source-voice-flow",
        kind: "vault",
        title: "Spec",
        locator: "Obsidian/Voice Flow.md",
        capturedAt: now
      }
    ],
    relations: [{ type: "uses", targetId: whisperId }],
    createdAt: now,
    updatedAt: now
  },
  {
    id: whisperId,
    type: "tool",
    title: "Whisper",
    aliases: ["OpenAI Whisper"],
    summary: "Speech-to-text model.",
    path: "Contex Wiki/Wiki/Tools/Whisper.md",
    confidence: 0.8,
    freshness: "current",
    sources: [],
    relations: [],
    createdAt: now,
    updatedAt: now
  }
];

const index = buildWikiGraphIndex(nodes);

assert.equal(index.nodesById.get(voiceFlowId)?.title, "Voice Flow");
assert.deepEqual(findWikiNodeIdsByAlias(index, "Голосовой   режим"), [voiceFlowId]);
assert.deepEqual(findWikiNodeIdsByAlias(index, "voice flow"), [voiceFlowId]);
assert.equal(index.sourcesById.get("source-voice-flow")?.locator, "Obsidian/Voice Flow.md");

const neighborhood = getWikiNeighborhood(index, voiceFlowId, 1);

assert.deepEqual(
  neighborhood.map((node) => node.id),
  [voiceFlowId, whisperId]
);

const files = buildWikiSchemaFiles(nodes);
const parsedEdges = parseWikiJsonl<{ sourceId: string; targetId: string }>(
  files.edgesJsonl
);

assert.equal(parsedEdges.records[0]?.sourceId, voiceFlowId);
assert.equal(parsedEdges.records[0]?.targetId, whisperId);
assert.ok(JSON.parse(files.aliasesJson)["voice mode"].includes(voiceFlowId));

console.log("wikiGraphIndex tests passed");
