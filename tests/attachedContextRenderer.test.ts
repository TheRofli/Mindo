import assert from "node:assert/strict";
import {
  getAttachedContextPaths,
  getAttachedContextTitle,
  getPreviewableAttachedImages
} from "../src/views/attachedContextRenderer";
import type { LlmFileAttachment, VaultSearchResult } from "../src/types";

const results: VaultSearchResult[] = [
  {
    path: "Notes/Architecture.md",
    title: "Architecture",
    score: 42,
    snippet: "Contex architecture"
  }
];

const files: LlmFileAttachment[] = [
  {
    name: "screenshot.png",
    type: "image/png",
    size: 2048,
    dataUrl: "data:image/png;base64,abc"
  },
  {
    name: "brief.pdf",
    type: "application/pdf",
    size: 1024 * 1024
  }
];

assert.equal(getAttachedContextTitle(1, 2), "1 search result + 2 files");
assert.equal(getAttachedContextTitle(0, 1), "1 file");
assert.equal(getAttachedContextTitle(2, 0), "2 search results");

assert.equal(
  getAttachedContextPaths(results, files),
  "Notes/Architecture.md\nscreenshot.png (image/png, 2 KB)\nbrief.pdf (application/pdf, 1 MB)"
);

assert.deepEqual(getPreviewableAttachedImages(files), [files[0]]);

console.log("attachedContextRenderer tests passed");
