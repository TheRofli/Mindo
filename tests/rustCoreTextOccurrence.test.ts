import assert from "node:assert/strict";
import {
  encodeRustCoreTextOccurrenceWireRequest,
  parseRustCoreTextOccurrenceResponse
} from "../src/rustCore/textOccurrenceSearch";

const request = encodeRustCoreTextOccurrenceWireRequest(
  "Я гений\nOld local LLM note.",
  "Я-гении"
);

assert.ok(request.startsWith("CTXCORE_TEXT_OCCURRENCE_V1\n"));
assert.ok(request.includes("Я гений"));
assert.ok(request.includes("Я-гении"));

const parsed = parseRustCoreTextOccurrenceResponse({
  version: 1,
  match: {
    original: "Я гений",
    occurrenceIndex: 0,
    score: 0.875
  },
  error: null
});

assert.equal(parsed.error, null);
assert.equal(parsed.match?.original, "Я гений");
assert.equal(parsed.match?.occurrenceIndex, 0);
assert.ok((parsed.match?.score ?? 0) >= 0.8);

const failed = parseRustCoreTextOccurrenceResponse({
  version: 1,
  match: null,
  error: "Text was not found"
});

assert.equal(failed.match, null);
assert.match(failed.error ?? "", /not found/i);

console.log("rustCoreTextOccurrence tests passed");
