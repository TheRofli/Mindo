import assert from "node:assert/strict";
import {
  buildRawIngestionMarkdown,
  createRawIngestionRecord,
  getRawIngestionPath
} from "../src/wiki/wikiRawIngestion";

const webRecord = createRawIngestionRecord({
  kind: "web",
  title: "Local LLM News / May 2026",
  locator: "https://example.com/local-llm",
  content: "Local LLMs are increasingly private and practical.",
  capturedAt: "2026-05-08T00:00:00.000Z",
  metadata: {
    provider: "DuckDuckGo"
  }
});

assert.match(webRecord.id, /^raw-web-local-llm-news-may-2026-[a-z0-9]{8}$/);
assert.equal(
  getRawIngestionPath("Contex Wiki", webRecord),
  `Contex Wiki/Raw/Web/${webRecord.id}.md`
);

const markdown = buildRawIngestionMarkdown(webRecord);

assert.ok(markdown.includes("contex_raw: true"));
assert.ok(markdown.includes(`raw_id: ${webRecord.id}`));
assert.ok(markdown.includes("raw_kind: web"));
assert.ok(markdown.includes('provider: "DuckDuckGo"'));
assert.ok(markdown.includes("Local LLMs are increasingly private and practical."));

const vaultRecord = createRawIngestionRecord({
  kind: "vault",
  title: "Obsidian/Voice Flow.md#Voice Flow",
  locator: "Obsidian/Voice Flow.md",
  content: "Voice flow evidence",
  capturedAt: "2026-05-08T00:00:00.000Z"
});

assert.equal(
  getRawIngestionPath("Contex Wiki", vaultRecord),
  `Contex Wiki/Raw/Vault/${vaultRecord.id}.md`
);

console.log("wikiRawIngestion tests passed");
