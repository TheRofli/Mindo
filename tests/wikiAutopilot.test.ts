import assert from "node:assert/strict";
import {
  buildWikiAutopilotAction,
  decideWikiAutopilot,
  formatWikiAutopilotDecision
} from "../src/wiki/wikiAutopilot";
import { createWikiNodeId, type ContexWikiNode } from "../src/wiki/wikiSchema";
import type { ContexActionReceipt } from "../src/actions/actionTypes";

const now = "2026-05-08T00:00:00.000Z";
const voiceFlowNode: ContexWikiNode = {
  id: createWikiNodeId("workflow", "Voice Flow"),
  type: "workflow",
  title: "Voice Flow",
  aliases: ["Contex Voice Flow"],
  summary: "Voice mode pipeline.",
  path: "Contex Wiki/Wiki/Workflows/Voice Flow.md",
  confidence: 0.7,
  freshness: "current",
  sources: [],
  relations: [],
  createdAt: now,
  updatedAt: now
};

const researchReceipt: ContexActionReceipt = {
  actionId: "a1",
  kind: "research_note",
  status: "saved",
  label: "Created note",
  path: "Obsidian/Contex Voice Flow.md"
};

const createDecision = decideWikiAutopilot({
  userText:
    "Create a modern research note about local STT and TTS in 2026 using web sources.",
  receipts: [researchReceipt],
  sourcePaths: ["Obsidian/Contex Voice Flow.md"],
  webSources: [
    {
      title: "Local STT 2026",
      url: "https://example.com/local-stt-2026",
      date: "2026-05-06"
    }
  ],
  existingNodes: [],
  now
});

assert.equal(createDecision.kind, "propose_create");
assert.equal(createDecision.shouldWriteWiki, true);
assert.equal(createDecision.targetNodeType, "model");
assert.equal(createDecision.sources.length, 2);
assert.ok(createDecision.reason.includes("durable"));

const action = buildWikiAutopilotAction(createDecision, {
  sourceActionIds: ["a1"],
  userText: "Create a modern research note about local STT and TTS in 2026."
});

assert.ok(action);
assert.equal(action.kind, "update_wiki");
assert.equal(action.automatic, true);
assert.deepEqual(action.sourcePaths, ["Obsidian/Contex Voice Flow.md"]);

const mergeDecision = decideWikiAutopilot({
  userText: "Create a note about Contex Voice Flow and web research.",
  receipts: [researchReceipt],
  sourcePaths: ["Obsidian/Voice Flow.md"],
  existingNodes: [voiceFlowNode],
  now
});

assert.equal(mergeDecision.kind, "merge_existing");
assert.equal(mergeDecision.targetNodeId, voiceFlowNode.id);
assert.equal(mergeDecision.targetPath, voiceFlowNode.path);
assert.equal(mergeDecision.targetNodeType, "workflow");

const projectDecision = decideWikiAutopilot({
  userText: "Создай roadmap и план MVP для проекта LiveCollab.",
  receipts: [researchReceipt],
  sourcePaths: ["Test/LiveCollab.md"],
  existingNodes: [],
  now
});

assert.equal(projectDecision.kind, "propose_create");
assert.equal(projectDecision.targetNodeType, "project");

const problemDecision = decideWikiAutopilot({
  userText: "В live dialogue проблема: barge-in не работает и ассистента нельзя перебить.",
  assistantText: "Нужно исправить always-listening stream и VAD.",
  existingNodes: [],
  now
});

assert.equal(problemDecision.kind, "propose_create");
assert.equal(problemDecision.targetNodeType, "problem");

const ignored = decideWikiAutopilot({
  userText: "Thanks, sounds good.",
  receipts: [],
  existingNodes: [voiceFlowNode],
  now
});

assert.equal(ignored.kind, "ignore");
assert.equal(ignored.shouldWriteWiki, false);
assert.equal(buildWikiAutopilotAction(ignored, { userText: "Thanks" }), null);

const durableDiscussion = decideWikiAutopilot({
  userText:
    "Давай продумаем проект LiveCollab: нужен workflow, milestones, архитектура, риски, интеграция с Obsidian и план реализации для IDE.",
  assistantText:
    "Проект LiveCollab стоит разделить на design spec, code plan, realtime collaboration core, CRDT sync, inline comments, suggest-edit mode, voice notes and rollback. MVP should start with local-first document state, then add share sessions, conflict handling and a compact progress block in the Obsidian note.",
  receipts: [],
  sourcePaths: [],
  existingNodes: [],
  now
});

assert.equal(durableDiscussion.kind, "propose_create");
assert.equal(durableDiscussion.shouldWriteWiki, true);
assert.equal(durableDiscussion.targetNodeType, "project");

const card = formatWikiAutopilotDecision(mergeDecision);

assert.ok(card.includes("Wiki autopilot"));
assert.ok(card.includes("Voice Flow"));
assert.ok(card.includes("Obsidian/Voice Flow.md"));

console.log("wikiAutopilot tests passed");
