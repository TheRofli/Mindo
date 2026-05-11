import assert from "node:assert/strict";
import { parseCreateNoteProposalText } from "../src/views/createNoteProposal";

const loose = parseCreateNoteProposalText(`\`\`\`json
{
  "title": "Plan Voice Flow",
  "path": "Obisidian/Plan Voice Flow.md",
  "content": "# Plan Voice Flow

Short voice plan.
Second line."
}
\`\`\``);

assert.equal(loose.title, "Plan Voice Flow");
assert.equal(loose.path, "Obisidian/Plan Voice Flow.md");
assert.equal(loose.content, "# Plan Voice Flow\n\nShort voice plan.\nSecond line.");

const invalidJsonFence = parseCreateNoteProposalText(`\`\`\`json
{ "title": "Broken"
\`\`\``);

assert.notEqual(invalidJsonFence.title, "json");
assert.equal(invalidJsonFence.content, "");

const jsonWithRawMarkdownNewlines = parseCreateNoteProposalText(`\`\`\`json
{
  "title": "Voice Flow",
  "path": "Obisidian/Voice Flow.md",
  "content": "# Voice Flow

Short plan:
- Capture voice
- Transcribe
- Execute action"
}
\`\`\``);

assert.equal(jsonWithRawMarkdownNewlines.title, "Voice Flow");
assert.equal(jsonWithRawMarkdownNewlines.path, "Obisidian/Voice Flow.md");
assert.equal(
  jsonWithRawMarkdownNewlines.content,
  "# Voice Flow\n\nShort plan:\n- Capture voice\n- Transcribe\n- Execute action"
);

const rawJsonObjectFallback = parseCreateNoteProposalText(`{
  "title": "Modern local LLM features",
  "content": "# Modern local LLM features

Use RAG and tool routing."
}`);

assert.equal(rawJsonObjectFallback.title, "Modern local LLM features");
assert.equal(
  rawJsonObjectFallback.content,
  "# Modern local LLM features\n\nUse RAG and tool routing."
);

console.log("createNoteProposal tests passed");
