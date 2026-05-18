import assert from "node:assert/strict";
import { resolveOpenFileTarget } from "../src/resolver/openFileResolution";

const paths = [
  "Proton/Qore Systems Cases.md",
  "Proton/Qore Systems Strategy.md",
  "Proton/Quark One.md",
  "Archive/Core System Notes.md"
];

const preservesRankedTopCandidate = resolveOpenFileTarget({
  paths,
  query: "core system strategy"
});

assert.equal(preservesRankedTopCandidate.kind, "direct");
assert.equal(
  preservesRankedTopCandidate.kind === "direct"
    ? preservesRankedTopCandidate.candidate.path
    : undefined,
  "Archive/Core System Notes.md"
);

const ambiguous = resolveOpenFileTarget({
  paths,
  query: "qore systems",
  ambiguityGap: 9999
});

assert.equal(ambiguous.kind, "clarify");
assert.deepEqual(
  ambiguous.kind === "clarify"
    ? ambiguous.candidates.slice(0, 2).map((candidate) => candidate.path)
    : [],
  ["Proton/Qore Systems Cases.md", "Proton/Qore Systems Strategy.md"]
);

const quark = resolveOpenFileTarget({
  paths,
  query: "quark one"
});

assert.equal(quark.kind, "direct");
assert.equal(
  quark.kind === "direct" ? quark.candidate.path : undefined,
  "Proton/Quark One.md"
);

const missing = resolveOpenFileTarget({
  paths,
  query: "file that does not exist"
});

assert.equal(missing.kind, "none");
assert.match(missing.reason, /No Markdown note matched/);

const belowThreshold = resolveOpenFileTarget({
  paths,
  query: "core system strategy",
  minDirectScore: 500
});

assert.equal(belowThreshold.kind, "none");

const currentOnly = resolveOpenFileTarget({
  paths: ["Current/Open.md"],
  query: "missing strategy",
  currentPath: "Current/Open.md"
});

assert.equal(currentOnly.kind, "none");

console.log("openFileResolution tests passed");
