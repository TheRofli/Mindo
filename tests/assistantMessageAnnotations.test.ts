import assert from "node:assert/strict";

import { annotateAssistantMessageFromContext } from "../src/chat/assistantMessageAnnotations";
import type { ChatMessage, LlmRequestContext } from "../src/types";

const createAssistant = (): ChatMessage => ({
  id: "assistant-1",
  role: "assistant",
  content: "Answer",
  createdAt: 1
});

{
  const assistant = createAssistant();
  const context: LlmRequestContext = {
    vaultResults: [
      {
        path: "Notes/A.md",
        title: "A",
        snippet: "Alpha",
        score: 10
      }
    ]
  };

  const result = annotateAssistantMessageFromContext(
    assistant,
    context,
    "where is alpha"
  );

  assert.equal(assistant.sources?.[0]?.path, "Notes/A.md");
  assert.deepEqual(result.rememberVaultSearch, {
    query: "where is alpha",
    results: context.vaultResults
  });
}

{
  const assistant = createAssistant();
  const context: LlmRequestContext = {
    vaultResults: [
      {
        path: "Notes/Local.md",
        title: "Local",
        snippet: "Local snippet",
        score: 120
      }
    ],
    webResults: []
  };

  annotateAssistantMessageFromContext(assistant, context, "explain local");
  assert.equal(assistant.sources?.length, 1);
  assert.equal(assistant.webSources, undefined);
  assert.equal(assistant.webResearchResults, undefined);
}

{
  const assistant = createAssistant();
  const context: LlmRequestContext = {
    vaultResults: [
      {
        path: "Notes/Local.md",
        title: "Local",
        snippet: "Local snippet",
        score: 120
      }
    ],
    webResults: [
      {
        title: "Web",
        url: "https://example.com/web",
        snippet: "Web snippet",
        provider: "DuckDuckGo"
      }
    ],
    webResearchReason: "explicit web request"
  };

  annotateAssistantMessageFromContext(assistant, context, "compare with web");
  assert.equal(assistant.sources?.length, 1);
  assert.equal(assistant.webSources?.length, 1);
  assert.equal(assistant.webResearchQuery, "compare with web");
}

{
  const assistant = createAssistant();
  const context: LlmRequestContext = {
    webResearchQuery: "local llm",
    webSearchQuery: "latest local llm",
    webResearchProvider: "DuckDuckGo",
    webResearchFallbackReason: "fallback",
    webResults: [
      {
        title: "Local LLM News",
        url: "https://example.com",
        snippet: "news",
        provider: "DuckDuckGo"
      }
    ]
  };

  const result = annotateAssistantMessageFromContext(assistant, context, "q");

  assert.equal(result.rememberVaultSearch, null);
  assert.equal(assistant.webResearchQuery, "local llm");
  assert.equal(assistant.webSearchQuery, "latest local llm");
  assert.equal(assistant.webResearchProvider, "DuckDuckGo");
  assert.equal(assistant.webResearchFallbackReason, "fallback");
  assert.equal(assistant.webSources?.[0]?.url, "https://example.com");
}

{
  const assistant = createAssistant();
  const context: LlmRequestContext = {
    webResults: [
      {
        title: "Result",
        url: "https://example.com",
        snippet: "snippet",
        provider: "DuckDuckGo"
      }
    ]
  };

  annotateAssistantMessageFromContext(assistant, context, "fallback query");
  assert.equal(assistant.webResearchQuery, "fallback query");
  assert.equal(assistant.webSearchQuery, "fallback query");
}

console.log("assistantMessageAnnotations tests passed");
