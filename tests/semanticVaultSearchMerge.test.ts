import assert from "node:assert/strict";
import { mergeVaultSearchResults } from "../src/search/semanticVaultSearch";

const merged = mergeVaultSearchResults([
  [
    {
      path: "A.md",
      title: "A",
      score: 10,
      snippet: "keyword",
      matches: ["content"]
    }
  ],
  [
    {
      path: "A.md",
      title: "A",
      score: 40,
      snippet: "vector",
      matches: ["vector"]
    },
    {
      path: "B.md",
      title: "B",
      score: 20,
      snippet: "other",
      matches: ["vector"]
    }
  ]
]);

assert.equal(merged.length, 2);
assert.equal(merged[0]?.path, "A.md");
assert.equal(merged[0]?.score, 43.5);
assert.deepEqual(merged[0]?.matches, ["content", "vector", "multi-evidence"]);
assert.equal(merged[1]?.path, "B.md");

const reranked = mergeVaultSearchResults([
  [
    {
      path: "A.md",
      title: "A",
      score: 40,
      snippet: "keyword",
      matches: ["content"]
    }
  ],
  [
    {
      path: "A.md",
      title: "A",
      score: 38,
      snippet: "vector",
      matches: ["vector"]
    },
    {
      path: "B.md",
      title: "B",
      score: 42,
      snippet: "single strong result",
      matches: ["vector"]
    }
  ]
]);

assert.equal(
  reranked[0]?.path,
  "A.md",
  "RAG merge boosts notes that are independently supported by keyword and vector evidence"
);
assert.ok(
  reranked[0]?.matches?.includes("multi-evidence"),
  "merged results expose multi-evidence matches"
);

console.log("semanticVaultSearchMerge tests passed");
