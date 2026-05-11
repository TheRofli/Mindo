import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import {
  normalizeGeneratedProjectMarkdown,
  syncProjectNoteWithPlan,
} from "../src/contexCode/projectNote";

const jsonWrapped = "```json\n{\"title\":\"Voice Flow\",\"path\":\"Obsidian/Voice Flow.md\",\"content\":\"# Voice Flow\\n\\n## Goal\\nBuild live dialogue.\"}\n```";
assert.equal(
  normalizeGeneratedProjectMarkdown(jsonWrapped, "Voice Flow").trim(),
  "## Goal\nBuild live dialogue.",
);

const duplicateHeading = "# Анекдоты\n\n# Анекдоты\n\nСодержание";
assert.equal(
  normalizeGeneratedProjectMarkdown(duplicateHeading, "Анекдоты").trim(),
  "Содержание",
);

const plan = makeContexCodePlan({ title: "Voice Flow" });
const synced = syncProjectNoteWithPlan("# Voice Flow\n\n## Goal\nBuild live dialogue.", plan);
assert.equal((synced.match(/\[!contex-code\]/g) ?? []).length, 1);
assert.doesNotMatch(synced, /```json/);

console.log("contexCodeProjectNote tests passed");
