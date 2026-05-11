import assert from "node:assert/strict";
import { buildWikiLiveBrief } from "../src/wiki/wikiLiveBrief";
import type { VaultSearchResult } from "../src/types";

const results: VaultSearchResult[] = [
  {
    path: "Contex Wiki/Wiki/Concepts/Local LLM.md",
    title: "Local LLM",
    score: 244,
    snippet:
      "A local language model runs privately on user hardware and is useful when privacy, latency, and offline work matter.",
    matches: ["wiki", "wiki-alias"]
  },
  {
    path: "Proton/LLM Engineering.md",
    title: "LLM Engineering",
    score: 52,
    snippet:
      "Roadmap for creating, fine-tuning, quantizing, turbocharging, and evaluating local large language models.",
    matches: ["semantic"]
  }
];

const brief = buildWikiLiveBrief(results);

assert.ok(brief.includes("Contex Wiki live memory"));
assert.ok(brief.includes("Local LLM"));
assert.ok(brief.includes("Contex Wiki/Wiki/Concepts/Local LLM.md"));
assert.ok(brief.includes("Speak from this memory"));
assert.ok(!brief.includes("Proton/LLM Engineering.md"));
assert.ok(brief.length < 900);

const fallbackBrief = buildWikiLiveBrief([results[1]]);
assert.ok(fallbackBrief.includes("Relevant live context"));
assert.ok(fallbackBrief.includes("Proton/LLM Engineering.md"));

console.log("wikiLiveBrief tests passed");
