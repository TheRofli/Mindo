import assert from "node:assert/strict";
import {
  buildWikiNodeMarkdown,
  formatWikiSourceLink,
  getWikiNodeMarkdownPath
} from "../src/wiki/wikiWriter";
import { createWikiNodeId, type ContexWikiNode } from "../src/wiki/wikiSchema";

const now = "2026-05-08T00:00:00.000Z";
const node: ContexWikiNode = {
  id: createWikiNodeId("workflow", "Voice Flow"),
  type: "workflow",
  title: "Voice Flow",
  aliases: ["voice mode"],
  summary: "Voice input flows through STT, tools, LLM, and TTS.",
  path: "",
  confidence: 0.9,
  freshness: "current",
  sources: [
    {
      id: "vault-voice-flow",
      kind: "vault",
      title: "Voice Flow spec",
      locator: "Obsidian/Voice Flow.md",
      capturedAt: now
    },
    {
      id: "raw-web-stt",
      kind: "raw",
      title: "Raw STT research",
      locator: "Contex Wiki/Raw/Web/raw-web-stt.md",
      capturedAt: now
    },
    {
      id: "web-stt",
      kind: "web",
      title: "STT benchmark",
      locator: "https://example.com/stt",
      capturedAt: now
    }
  ],
  relations: [
    {
      type: "uses",
      targetId: createWikiNodeId("tool", "Whisper")
    }
  ],
  createdAt: now,
  updatedAt: now
};

assert.equal(
  getWikiNodeMarkdownPath("Contex Wiki", node),
  "Contex Wiki/Wiki/Workflows/Voice Flow.md"
);
assert.equal(
  formatWikiSourceLink(node.sources[0]!),
  "[[Obsidian/Voice Flow.md|Voice Flow spec]]"
);
assert.equal(
  formatWikiSourceLink(node.sources[1]!),
  "[[Contex Wiki/Raw/Web/raw-web-stt.md|Raw STT research]]"
);
assert.equal(
  formatWikiSourceLink(node.sources[2]!),
  "[STT benchmark](https://example.com/stt)"
);

const markdown = buildWikiNodeMarkdown("Contex Wiki", node);

assert.ok(markdown.includes("# Voice Flow"));
assert.ok(markdown.includes("Voice input flows through STT"));
assert.ok(markdown.includes("## Confidence"));
assert.ok(markdown.includes("[[Obsidian/Voice Flow.md|Voice Flow spec]]"));
assert.ok(markdown.includes("uses ->"));
assert.ok(markdown.includes(node.relations[0]!.targetId));

console.log("wikiWriter tests passed");
