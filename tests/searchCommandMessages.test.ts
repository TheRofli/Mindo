import assert from "node:assert/strict";

import {
  createSemanticVaultAssistantMessage,
  createSlashCommandUserMessage,
  createVaultSearchAssistantMessage,
  createWebResearchAssistantMessage
} from "../src/chat/searchCommandMessages";
import type { VaultSearchResult, WebSearchResult } from "../src/types";

const vaultResult: VaultSearchResult = {
  path: "Notes/Voice Flow.md",
  title: "Voice Flow",
  score: 42,
  snippet: "Voice architecture notes"
};

const webResult: WebSearchResult = {
  title: "Local LLM release",
  url: "https://example.com/release",
  snippet: "A fresh local LLM release.",
  source: "Example"
};

{
  const message = createSlashCommandUserMessage({
    command: "web",
    query: "latest local LLM news",
    messageIndex: 3,
    createdAt: 100
  });

  assert.deepEqual(message, {
    id: "100-3",
    role: "user",
    content: "/web latest local LLM news",
    createdAt: 100
  });
}

{
  const message = createVaultSearchAssistantMessage({
    content: "Found notes",
    query: "voice",
    results: [vaultResult],
    messageIndex: 4,
    createdAt: 101
  });

  assert.equal(message.vaultSearchQuery, "voice");
  assert.deepEqual(message.vaultSearchResults, [vaultResult]);
  assert.equal(message.content, "Found notes");
}

{
  const message = createWebResearchAssistantMessage({
    content: "Fresh summary",
    query: "latest local LLM news",
    searchQuery: "local LLM release May 2026",
    results: [webResult],
    provider: "DuckDuckGo direct",
    fallbackReason: "fallback used",
    messageIndex: 5,
    createdAt: 102
  });

  assert.equal(message.webResearchQuery, "latest local LLM news");
  assert.equal(message.webSearchQuery, "local LLM release May 2026");
  assert.deepEqual(message.webResearchResults, [webResult]);
  assert.deepEqual(message.webSources, [webResult]);
  assert.equal(message.webResearchProvider, "DuckDuckGo direct");
  assert.equal(message.webResearchFallbackReason, "fallback used");
}

{
  const message = createSemanticVaultAssistantMessage({
    content: "Answer from vault",
    query: "voice flow",
    results: [vaultResult],
    sections: [
      {
        path: "Notes/Voice Flow.md",
        title: "Voice Flow",
        heading: "Architecture",
        excerpt: "Voice architecture notes",
        score: 47
      }
    ],
    messageIndex: 6,
    createdAt: 103
  });

  assert.equal(message.semanticVaultQuery, "voice flow");
  assert.deepEqual(message.sources, [vaultResult]);
  assert.equal(message.semanticVaultSections?.[0]?.heading, "Architecture");
}

console.log("searchCommandMessages tests passed");
