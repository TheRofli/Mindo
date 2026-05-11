import assert from "node:assert/strict";
import {
  buildRustCoreSearchRequest,
  parseRustCoreSearchResponse
} from "../src/rustCore/protocol";

const request = buildRustCoreSearchRequest("voice flow", [
  {
    path: "Obsidian/Voice Flow.md",
    title: "Voice Flow",
    content: "Voice command routing with STT and TTS."
  }
]);

assert.equal(request.version, 1);
assert.equal(request.query, "voice flow");
assert.equal(request.documents[0]?.path, "Obsidian/Voice Flow.md");

const parsed = parseRustCoreSearchResponse({
  version: 1,
  results: [
    {
      path: "Obsidian/Voice Flow.md",
      title: "Voice Flow",
      score: 0.82,
      snippet: "Voice command routing with STT and TTS.",
      heading: "Voice Flow"
    },
    {
      path: "",
      title: "Broken",
      score: "bad",
      snippet: ""
    }
  ]
});

assert.equal(parsed.length, 1);
assert.equal(parsed[0]?.path, "Obsidian/Voice Flow.md");
assert.equal(parsed[0]?.matches?.[0], "rust-core");

console.log("rustCoreProtocol tests passed");
