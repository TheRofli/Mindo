import assert from "node:assert/strict";
import { encodeRustCoreDiffWireRequest } from "../src/rustCore/indexProtocol";
import { parseRustCoreDiffResponse } from "../src/rustCore/diffSearch";

const request = encodeRustCoreDiffWireRequest("old", "new");

assert.ok(request.startsWith("CTXCORE_DIFF_V1\n"));
assert.ok(request.includes("old"));
assert.ok(request.includes("new"));

const parsed = parseRustCoreDiffResponse({
  version: 1,
  lines: [
    {
      kind: "remove",
      text: "old"
    },
    {
      kind: "add",
      text: "new"
    }
  ]
});

assert.equal(parsed[0].kind, "remove");
assert.equal(parsed[1].text, "new");

console.log("rustCoreDiffProtocol tests passed");
