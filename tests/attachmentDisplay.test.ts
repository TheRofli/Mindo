import assert from "node:assert/strict";
import {
  formatAttachmentLabel,
  isPreviewableImageAttachment
} from "../src/attachments/attachmentDisplay";

const imageAttachment = {
  name: "screenshot.png",
  type: "image/png",
  size: 2048,
  dataUrl: "data:image/png;base64,abc"
};

assert.equal(
  formatAttachmentLabel(imageAttachment),
  "screenshot.png | image/png | 2.0 KB"
);
assert.equal(isPreviewableImageAttachment(imageAttachment), true);

const pdfAttachment = {
  name: "notes.pdf",
  type: "application/pdf",
  size: 1024 * 1024,
  text: "Extracted text"
};

assert.equal(
  formatAttachmentLabel(pdfAttachment),
  "notes.pdf | application/pdf | 1.0 MB"
);
assert.equal(isPreviewableImageAttachment(pdfAttachment), false);

console.log("attachmentDisplay tests passed");
