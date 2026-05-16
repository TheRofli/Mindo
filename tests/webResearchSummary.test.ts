import assert from "node:assert/strict";

import {
  buildWebResearchSummaryPrompt,
  summarizeWebResearch
} from "../src/web/webResearchSummary";

const result = {
  title: "Fresh local LLM release",
  url: "https://example.com/release",
  snippet: "A local LLM release shipped today.",
  sourceType: "news" as const,
  qualityNotes: ["direct release"]
};

{
  const prompt = buildWebResearchSummaryPrompt({
    query: "latest local LLM news",
    searchQuery: "latest local LLM news May 2026",
    checkedDate: "2026-05-13",
    results: [result],
    formatWebSearchContext: (results) => `Formatted ${results.length} result`
  });

  assert.ok(prompt.includes("Date checked: 2026-05-13"));
  assert.ok(prompt.includes("Question:\nlatest local LLM news"));
  assert.ok(prompt.includes("Search query: latest local LLM news May 2026"));
  assert.ok(prompt.includes("Search results:\nFormatted 1 result"));
  assert.ok(prompt.includes("Do not include a Sources section"));
  assert.ok(prompt.includes("Do not invent facts"));
}

{
  const prompt = buildWebResearchSummaryPrompt({
    query: "same query",
    searchQuery: "same query",
    checkedDate: "2026-05-13",
    results: [result],
    formatWebSearchContext: () => "Formatted"
  });

  assert.ok(!prompt.includes("Search query: same query"));
}

{
  const calls: Array<{ settings: unknown; content: string; createdAt: number }> = [];

  const summary = await summarizeWebResearch({
    query: "latest local LLM news",
    searchQuery: "latest local LLM news May 2026",
    checkedDate: "2026-05-13",
    createdAt: 123,
    settings: {
      model: "test-model"
    },
    results: [result],
    formatWebSearchContext: () => "Formatted result",
    requestLlmChatCompletion: async (settings, messages) => {
      calls.push({
        settings,
        content: messages[0].content,
        createdAt: messages[0].createdAt
      });
      return "Summary";
    }
  });

  assert.equal(summary, "Summary");
  assert.deepEqual(calls, [
    {
      settings: {
        model: "test-model"
      },
      content: buildWebResearchSummaryPrompt({
        query: "latest local LLM news",
        searchQuery: "latest local LLM news May 2026",
        checkedDate: "2026-05-13",
        results: [result],
        formatWebSearchContext: () => "Formatted result"
      }),
      createdAt: 123
    }
  ]);
}

console.log("webResearchSummary tests passed");
