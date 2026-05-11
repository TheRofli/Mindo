import assert from "node:assert/strict";
import { buildTextReplacementDiffPreview } from "../src/diff/diffService";

const preview = buildTextReplacementDiffPreview({
  title: "Voice replacement preview",
  sourcePath: "Test/Test.md",
  original: "I am old",
  suggested: "I am new"
});

assert.equal(preview.status, "pending");
assert.equal(preview.original, "I am old");
assert.equal(preview.suggested, "I am new");

console.log("diffService tests passed");
