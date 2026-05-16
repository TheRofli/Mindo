import assert from "node:assert/strict";

import {
  attachAutoWebContextToRequest,
  attachProjectMemoryToRequest
} from "../src/chat/chatRequestContext";
import type { AutoWebContext } from "../src/views/sidebarTypes";

const webContext: AutoWebContext = {
  query: "latest local LLM news",
  searchQuery: "latest local LLM news May 2026",
  reason: "freshness",
  provider: "duckduckgo",
  fallbackReason: "direct",
  results: [
    {
      title: "Local LLM News",
      url: "https://example.com/local-llm",
      snippet: "Fresh local LLM updates."
    }
  ]
};

{
  const result = attachAutoWebContextToRequest(null, webContext);

  assert.equal(result?.webResearchQuery, "latest local LLM news");
  assert.equal(result?.webSearchQuery, "latest local LLM news May 2026");
  assert.equal(result?.webResearchProvider, "duckduckgo");
  assert.equal(result?.webResearchFallbackReason, "direct");
  assert.equal(result?.webResearchReason, "freshness");
  assert.equal(result?.webResults?.length, 1);
}

{
  const result = attachAutoWebContextToRequest(
    {
      liveDialogue: true,
      projectMemory: "Existing memory"
    },
    webContext
  );

  assert.equal(result?.liveDialogue, true);
  assert.equal(result?.projectMemory, "Existing memory");
  assert.equal(result?.webResults?.[0]?.title, "Local LLM News");
}

{
  const original = { projectMemory: "Already present" };
  const result = attachProjectMemoryToRequest(original, "New memory");

  assert.equal(result, original);
}

{
  const result = attachProjectMemoryToRequest({ liveDialogue: true }, "Project memory");

  assert.equal(result?.liveDialogue, true);
  assert.equal(result?.projectMemory, "Project memory");
}

console.log("chatRequestContext tests passed");
