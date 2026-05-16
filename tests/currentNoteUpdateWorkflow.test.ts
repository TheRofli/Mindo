import assert from "node:assert/strict";

import {
  buildCurrentNoteUpdatePrompt,
  prepareCurrentNoteUpdatePreview
} from "../src/notes/currentNoteUpdateWorkflow";
import { DEFAULT_SETTINGS } from "../src/types";
import type { LlmFileAttachment, WebSearchResult } from "../src/types";

const note = {
  path: "Project/Plan.md",
  name: "Plan",
  content: "# Plan\n\nOld text"
};

const webResult: WebSearchResult = {
  title: "Fresh source",
  url: "https://example.com/fresh",
  snippet: "Current information."
};

const attachment: LlmFileAttachment = {
  name: "brief.txt",
  type: "text/plain",
  size: 12,
  text: "Attachment text"
};

{
  const prompt = buildCurrentNoteUpdatePrompt({
    note,
    userPrompt: "Refresh this note",
    autoWebContextText: "Web context block",
    projectMemoryText: "Project memory block"
  });

  assert.ok(prompt.includes("Rewrite the current Markdown note"));
  assert.ok(prompt.includes("User update request:\nRefresh this note"));
  assert.ok(prompt.includes("Web context block"));
  assert.ok(prompt.includes("Project memory block"));
  assert.ok(prompt.includes("Current note path:\nProject/Plan.md"));
  assert.ok(prompt.includes("Current note content:\n# Plan\n\nOld text"));
}

{
  const calls: Array<{ content: string; attachments: LlmFileAttachment[] | null }> = [];

  const result = await prepareCurrentNoteUpdatePreview({
    settings: DEFAULT_SETTINGS,
    note,
    userPrompt: "Refresh this note",
    attachedFiles: [attachment],
    messageIndex: 2,
    createdAt: 100,
    readProjectMemoryContext: async () => "Project memory",
    buildAutoWebContextForRequest: async () => ({
      reason: "freshness",
      query: "latest plan",
      searchQuery: "latest plan 2026",
      provider: "DuckDuckGo direct",
      fallbackReason: "fallback",
      results: [webResult]
    }),
    formatAutoWebContextForPrompt: () => "Formatted web context",
    formatProjectMemoryForPrompt: () => "Formatted project memory",
    cleanReplacement: (text) => text.trim(),
    stripSpeechHints: (text) => text.replace(/\[\[tts:[^\]]+\]\]/g, ""),
    requestLlmChatCompletion: async (_settings, messages, context) => {
      calls.push({
        content: messages[0].content,
        attachments: context?.attachments ?? null
      });
      return "[[tts:hidden]]\n# Plan\n\nNew text";
    }
  });

  assert.equal(result.userMessage.content, "Refresh this note");
  assert.deepEqual(result.userMessage.attachments, [attachment]);
  assert.equal(result.assistantMessage.content, "# Plan\n\nNew text");
  assert.equal(result.assistantMessage.diffPreview?.operationType, "update-note");
  assert.equal(result.assistantMessage.diffPreview?.sourcePath, "Project/Plan.md");
  assert.equal(result.assistantMessage.webResearchQuery, "latest plan");
  assert.deepEqual(result.assistantMessage.webSources, [webResult]);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].content.includes("Formatted web context"));
  assert.ok(calls[0].content.includes("Formatted project memory"));
  assert.deepEqual(calls[0].attachments, [attachment]);
}

console.log("currentNoteUpdateWorkflow tests passed");
