import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import {
  extractPdfTextFallback,
  extractPdfTextFromArrayBuffer,
  formatBytes,
  inferMimeType,
  mimeTypeToExtension
} from "../src/attachments/fileAttachmentUtils";

assert.equal(mimeTypeToExtension("image/png"), "png");
assert.equal(mimeTypeToExtension("application/pdf"), "pdf");
assert.equal(mimeTypeToExtension("application/octet-stream"), null);

assert.equal(inferMimeType("note.md"), "text/markdown");
assert.equal(inferMimeType("scan.pdf"), "application/pdf");
assert.equal(inferMimeType("archive.bin"), "application/octet-stream");

assert.equal(formatBytes(512), "512 B");
assert.equal(formatBytes(1536), "1.5 KB");
assert.equal(formatBytes(2 * 1024 * 1024), "2 MB");

assert.equal(
  extractPdfTextFallback("(Hello\\nworld) Tj (Second\\040line) Tj"),
  "Hello world Second line"
);
assert.equal(
  extractPdfTextFallback("<feff005200750062007200690063> Tj"),
  "Rubric"
);

const compressedPdfStream = deflateSync(
  Buffer.from("BT /F1 12 Tf (Rubric text inside compressed stream) Tj ET", "latin1")
);
const compressedPdf = Buffer.concat([
  Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Length " +
      compressedPdfStream.length +
      " /Filter /FlateDecode >>\nstream\n",
    "latin1"
  ),
  compressedPdfStream,
  Buffer.from("\nendstream\nendobj\n%%EOF", "latin1")
]);
const compressedText = await extractPdfTextFromArrayBuffer(
  compressedPdf.buffer.slice(
    compressedPdf.byteOffset,
    compressedPdf.byteOffset + compressedPdf.byteLength
  )
);
assert.ok(compressedText.includes("Rubric text inside compressed stream"));

console.log("fileAttachmentUtils tests passed");
