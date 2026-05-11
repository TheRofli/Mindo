import assert from "node:assert/strict";
import { parseRustCoreResolveResponse } from "../src/rustCore/resolverSearch";

const parsed = parseRustCoreResolveResponse({
  version: 1,
  results: [
    {
      path: "Test/Test.md",
      score: 42
    }
  ]
});

assert.equal(parsed[0].path, "Test/Test.md");
assert.equal(parsed[0].score, 42);

console.log("rustCoreResolverSearch tests passed");
