import assert from "node:assert/strict";
import {
  encodeRustCoreSearchWireRequest,
  getRustCoreExecutableName
} from "../src/rustCore/wireProtocol";

const encoded = encodeRustCoreSearchWireRequest({
  query: "voice flow",
  limit: 3,
  documents: [
    {
      path: "Obsidian/Voice Flow.md",
      title: "Voice Flow",
      content: "Voice command routing with STT and TTS."
    }
  ]
});

assert.ok(encoded.startsWith("CTXCORE_SEARCH_V1\n"));
assert.ok(encoded.includes("\n3\n"));
assert.ok(encoded.includes("voice flow"));
assert.ok(encoded.includes("Obsidian/Voice Flow.md"));
assert.ok(encoded.includes("Voice command routing with STT and TTS."));

assert.equal(getRustCoreExecutableName("win32"), "contex-core.exe");
assert.equal(getRustCoreExecutableName("linux"), "contex-core");

console.log("rustCoreWireProtocol tests passed");
