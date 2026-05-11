import assert from "node:assert/strict";
import {
  diffRustCoreDocumentSet,
  encodeRustCoreIndexSearchWireRequest,
  encodeRustCoreIndexWireRequest,
  encodeRustCoreRemoveWireRequest,
  encodeRustCoreStatusWireRequest,
  encodeRustCoreUpsertWireRequest
} from "../src/rustCore/indexProtocol";

const docs = [
  {
    path: "Obsidian/Voice Flow.md",
    title: "Voice Flow",
    content: "Voice STT TTS diff flow.",
    mtime: 1,
    size: 24
  }
];

assert.ok(encodeRustCoreIndexWireRequest(docs).startsWith("CTXCORE_INDEX_V1\n"));
assert.ok(
  encodeRustCoreUpsertWireRequest(docs).startsWith("CTXCORE_UPSERT_V1\n")
);
assert.ok(
  encodeRustCoreRemoveWireRequest(["Old.md"]).startsWith("CTXCORE_REMOVE_V1\n")
);
assert.ok(
  encodeRustCoreIndexSearchWireRequest("voice flow", 4).startsWith(
    "CTXCORE_SEARCH_INDEX_V1\n"
  )
);
assert.equal(encodeRustCoreStatusWireRequest(), "CTXCORE_STATUS_V1\n");

const previous = new Map<string, string>([
  ["A.md", "1:10"],
  ["B.md", "1:20"]
]);
const nextDocs = [
  {
    path: "A.md",
    title: "A",
    content: "same",
    mtime: 1,
    size: 10
  },
  {
    path: "C.md",
    title: "C",
    content: "new",
    mtime: 2,
    size: 30
  }
];
const diff = diffRustCoreDocumentSet(previous, nextDocs);

assert.deepEqual(diff.removedPaths, ["B.md"]);
assert.deepEqual(
  diff.upsertDocuments.map((document) => document.path),
  ["C.md"]
);
assert.deepEqual(
  Array.from(diff.nextSignatures.entries()),
  [
    ["A.md", "1:10"],
    ["C.md", "2:30"]
  ]
);

console.log("rustCoreIndexProtocol tests passed");
