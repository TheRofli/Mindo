import assert from "node:assert/strict";
import {
  decideWikiAutopilot,
  formatWikiAutopilotDecision
} from "../src/wiki/wikiAutopilot";
import type { ContexActionReceipt } from "../src/actions/actionTypes";

const now = "2026-05-13T00:00:00.000Z";

const savedCreateReceipt: ContexActionReceipt = {
  actionId: "create-1",
  kind: "create_note",
  status: "saved",
  label: "Created note",
  path: "Obsidian/Voice Plan.md"
};

const durable = decideWikiAutopilot({
  userText: "Create a roadmap note for the local voice workflow with web research.",
  assistantText:
    "The note describes milestones, architecture decisions, risks, and implementation tasks for live voice mode.",
  receipts: [savedCreateReceipt],
  sourcePaths: ["Obsidian/Voice Plan.md"],
  webSources: [
    {
      title: "Voice AI 2026",
      url: "https://example.com/voice-ai-2026",
      date: "2026-05-13"
    }
  ],
  now
});

assert.equal(durable.shouldWriteWiki, true);
assert.ok(
  durable.signals.some((signal) => signal.includes("action receipt")),
  "durable Wiki decision should explain the action receipt signal"
);
assert.ok(
  durable.signals.some((signal) => signal.includes("web source")),
  "durable Wiki decision should explain the web source signal"
);
assert.ok(
  durable.signals.some((signal) => signal.includes("vault source")),
  "durable Wiki decision should explain the vault source signal"
);

const durableCard = formatWikiAutopilotDecision(durable);

assert.ok(durableCard.includes("Signals:"));
assert.ok(durableCard.includes("action receipt"));

const ignored = decideWikiAutopilot({
  userText: "Thanks, okay.",
  assistantText: "No problem.",
  now
});

assert.equal(ignored.shouldWriteWiki, false);
assert.ok(ignored.misses.length > 0);
assert.ok(
  ignored.misses.some((miss) => miss.includes("No saved/applied action receipts")),
  "ignored Wiki decision should explain missing action receipts"
);

const ignoredCard = formatWikiAutopilotDecision(ignored);

assert.ok(ignoredCard.includes("Not saved because:"));
assert.ok(ignoredCard.includes("No saved/applied action receipts"));

console.log("wikiObservability tests passed");
