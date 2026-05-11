import assert from "node:assert/strict";
import {
  buildAttachmentContextItems,
  buildAttachmentSourceRefs,
  summarizeAttachmentContext
} from "../src/attachments/attachmentContext";
import type { LlmFileAttachment } from "../src/types";

const attachments: LlmFileAttachment[] = [
  {
    name: "diagram.png",
    type: "image/png",
    size: 4096,
    dataUrl: "data:image/png;base64,abc"
  },
  {
    name: "spec.pdf",
    type: "application/pdf",
    size: 2048,
    text: "Page one explains local STT and TTS architecture."
  },
  {
    name: "notes.md",
    type: "text/markdown",
    size: 512,
    text: "# Notes\n\nContex stores durable memory in Wiki nodes."
  }
];

const items = buildAttachmentContextItems(attachments, {
  maxTextChars: 24
});

assert.equal(items[0]!.kind, "image");
assert.equal(items[0]!.canUseForVision, true);
assert.equal(items[0]!.thumbnailDataUrl, "data:image/png;base64,abc");
assert.equal(items[1]!.kind, "pdf");
assert.equal(items[1]!.canUseForWiki, true);
assert.ok(items[1]!.contextText.startsWith("Page one explains"));
assert.ok(items[1]!.contextText.endsWith("..."));
assert.equal(items[2]!.kind, "text");

const summary = summarizeAttachmentContext(items);
assert.ok(summary.includes("diagram.png"));
assert.ok(summary.includes("vision"));
assert.ok(summary.includes("text extracted"));

const sources = buildAttachmentSourceRefs(attachments, {
  now: "2026-05-08T00:00:00.000Z"
});

assert.equal(sources.length, 3);
assert.equal(sources[0]!.kind, "attachment");
assert.equal(sources[0]!.locator, "attachment://diagram.png");

console.log("attachmentContext tests passed");
