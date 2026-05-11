import assert from "node:assert/strict";
import {
  classifyAttachment,
  extractPdfTextFallback
} from "../src/attachments/attachmentPipeline";

assert.equal(classifyAttachment("image/png", "screen.png"), "image");
assert.equal(classifyAttachment("application/pdf", "paper.pdf"), "pdf");
assert.equal(classifyAttachment("text/markdown", "note.md"), "text");
assert.equal(classifyAttachment("", "unknown.bin"), "binary");

const pdfText = extractPdfTextFallback("(Hello) Tj (World) Tj");
assert.ok(pdfText.includes("Hello"));
assert.ok(pdfText.includes("World"));

const pdfArrayText = extractPdfTextFallback("[(Hel) 120 (lo) <20576f726c64>] TJ");
assert.ok(pdfArrayText.includes("Hel"));
assert.ok(pdfArrayText.includes("lo"));
assert.ok(pdfArrayText.includes("World"));

const pdfHexText = extractPdfTextFallback("<feff005200750062007200690063> Tj");
assert.ok(pdfHexText.includes("Rubric"));

console.log("attachmentPipeline tests passed");
