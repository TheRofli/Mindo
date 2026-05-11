import assert from "node:assert/strict";
import {
  buildWikiNodeExtractionPrompt,
  mergeWikiNodeUpdate,
  normalizeWikiNodeProposal,
  type WikiNodeProposal
} from "../src/wiki/wikiNodeProposal";
import { createWikiNodeId, type ContexWikiNode } from "../src/wiki/wikiSchema";

const now = "2026-05-08T00:00:00.000Z";
const existing: ContexWikiNode = {
  id: createWikiNodeId("concept", "Local LLM"),
  type: "concept",
  title: "Local LLM",
  aliases: ["local model"],
  summary: "Runs locally.",
  path: "Contex Wiki/Wiki/Concepts/Local LLM.md",
  confidence: 0.5,
  freshness: "unknown",
  sources: [],
  relations: [],
  createdAt: now,
  updatedAt: now
};

const rawProposal = {
  action: "update",
  reason: "New source adds deployment details.",
  node: {
    ...existing,
    aliases: ["local model", "локальная модель", "Local Model"],
    confidence: 2,
    freshness: "fresh",
    sources: [
      {
        id: "raw-web-local-llm-12345678",
        kind: "web",
        title: "Local LLM news",
        locator: "Contex Wiki/Raw/Web/raw-web-local-llm-12345678.md",
        capturedAt: now
      }
    ],
    relations: [
      {
        type: "uses",
        targetId: createWikiNodeId("tool", "Ollama")
      }
    ]
  }
};

const normalized = normalizeWikiNodeProposal(rawProposal, now);

assert.ok(normalized);
assert.equal(normalized.action, "update");
assert.equal(normalized.node.confidence, 1);
assert.deepEqual(normalized.node.aliases, [
  "local model",
  "локальная модель"
]);

const merged = mergeWikiNodeUpdate(existing, normalized as WikiNodeProposal);

assert.equal(merged.node.id, existing.id);
assert.equal(merged.node.confidence, 1);
assert.equal(merged.node.freshness, "fresh");
assert.deepEqual(merged.changedFields.sort(), [
  "aliases",
  "confidence",
  "freshness",
  "relations",
  "sources"
]);

const prompt = buildWikiNodeExtractionPrompt({
  rawExcerpt: "Contex uses local STT, TTS, and an Obsidian vault.",
  existingNodes: [existing]
});

assert.ok(prompt.includes("Return strict JSON"));
assert.ok(prompt.includes(existing.id));
assert.ok(prompt.includes("Contex uses local STT"));

console.log("wikiNodeProposal tests passed");
