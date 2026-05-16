import assert from "node:assert/strict";
import { isDiffPreviewActionDisabled } from "../src/views/diffPreviewRenderer";

assert.equal(isDiffPreviewActionDisabled("accept", "pending", false), false);
assert.equal(isDiffPreviewActionDisabled("change", "pending", false), false);
assert.equal(isDiffPreviewActionDisabled("reject", "pending", false), false);
assert.equal(isDiffPreviewActionDisabled("undo", "applied", false), false);

assert.equal(isDiffPreviewActionDisabled("accept", "applied", false), true);
assert.equal(isDiffPreviewActionDisabled("change", "rejected", false), true);
assert.equal(isDiffPreviewActionDisabled("reject", "reverted", false), true);
assert.equal(isDiffPreviewActionDisabled("undo", "pending", false), true);

assert.equal(isDiffPreviewActionDisabled("accept", "pending", true), true);
assert.equal(isDiffPreviewActionDisabled("undo", "applied", true), true);

console.log("diffPreviewRenderer tests passed");
