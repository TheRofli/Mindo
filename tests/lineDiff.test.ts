import assert from "node:assert/strict";
import {
  buildLineDiff,
  getCompactDiffStatusText,
  getDiffPrefix
} from "../src/diff/lineDiff";

assert.deepEqual(buildLineDiff("a\nb\nc", "a\nx\nc"), [
  { type: "same", text: "a" },
  { type: "added", text: "x" },
  { type: "removed", text: "b" },
  { type: "same", text: "c" }
]);

assert.equal(getDiffPrefix("added"), "+");
assert.equal(getDiffPrefix("removed"), "-");
assert.equal(getDiffPrefix("same"), " ");

assert.equal(
  getCompactDiffStatusText("applied"),
  "Applied to the source note. You can undo this change."
);
assert.equal(getCompactDiffStatusText("pending"), "Pending review.");

console.log("lineDiff tests passed");
