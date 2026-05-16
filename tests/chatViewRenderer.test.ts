import assert from "node:assert/strict";
import {
  formatCollapsedSourceLabel,
  formatChatMessageRoleLabel,
  formatVaultSearchResultScoreText,
  formatVaultSearchTitle,
  formatWebResearchProviderText,
  formatWebResultsTitle,
  getWebResultMetaText,
  getChatMessageClassNames,
  getChatMessageRenderKind,
  getVisibleSources,
  resolveChatScrollAfterRender
} from "../src/views/chatViewRenderer";
import type { ChatMessage, VaultSearchResult, WebSearchResult } from "../src/types";

const pendingAssistant: ChatMessage = {
  id: "assistant-stream",
  role: "assistant",
  content: "",
  createdAt: 1
};

assert.equal(
  getChatMessageRenderKind(pendingAssistant, {
    isLoading: true,
    streamingMessageId: "assistant-stream"
  }),
  "typing"
);

const receiptMessage: ChatMessage = {
  id: "assistant-receipt",
  role: "assistant",
  content: "",
  createdAt: 2,
  actionReceipt: {
    status: "opened",
    label: "Opened note",
    path: "Test/Test.md"
  }
};

assert.deepEqual(getChatMessageClassNames(receiptMessage), [
  "contex-agent__message",
  "contex-agent__message--assistant",
  "contex-agent__message--receipt"
]);
assert.equal(getChatMessageRenderKind(receiptMessage, {}), "action-receipt");
assert.equal(formatChatMessageRoleLabel("assistant"), "Mindo");
assert.equal(formatChatMessageRoleLabel("user"), "You");

const sources: VaultSearchResult[] = [
  { path: "A.md", score: 3, snippet: "A" },
  { path: "B.md", score: 2, snippet: "B" },
  { path: "C.md", score: 1, snippet: "C" }
];

assert.deepEqual(
  getVisibleSources(sources).map((source) => source.path),
  ["A.md", "B.md"]
);
assert.equal(formatCollapsedSourceLabel(3, "en"), "3 sources");
assert.equal(
  formatCollapsedSourceLabel(2, "ru"),
  "2 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430"
);
assert.equal(
  formatCollapsedSourceLabel(1, "ru", "web"),
  "1 web-\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a"
);

assert.equal(
  formatVaultSearchTitle("BitNet", 2),
  'Search results for "BitNet"'
);
assert.equal(formatVaultSearchTitle("BitNet", 0), 'No results for "BitNet"');
assert.equal(
  formatVaultSearchResultScoreText({
    path: "A.md",
    title: "A",
    score: 5,
    snippet: "A",
    matches: ["bitnet", "local"]
  }),
  "Score: 5 | Matches: bitnet, local"
);

const webResult: WebSearchResult = {
  title: "Local LLM News",
  url: "https://example.com",
  snippet: "News",
  source: "DuckDuckGo",
  sourceType: "blog",
  publishedDate: "2026-05-01",
  freshnessHint: "2026"
};

assert.equal(
  formatWebResearchProviderText({
    provider: "DuckDuckGo",
    query: "latest local LLM news",
    searchQuery: "local LLM news 2026",
    fallbackUsed: true
  }),
  "Provider: DuckDuckGo | Search: local LLM news 2026 | Fallback used"
);
assert.equal(
  formatWebResultsTitle("latest local LLM news", 1),
  'Web sources for "latest local LLM news"'
);
assert.equal(
  getWebResultMetaText(webResult),
  "DuckDuckGo | Type: blog | 2026-05-01 | Date: 2026"
);

assert.deepEqual(
  resolveChatScrollAfterRender({
    shouldStickToBottom: true,
    previousScrollTop: 42,
    scrollHeight: 120
  }),
  {
    nextScrollTop: 120,
    shouldAutoScrollChat: true
  }
);

assert.deepEqual(
  resolveChatScrollAfterRender({
    shouldStickToBottom: false,
    previousScrollTop: 42,
    scrollHeight: 120
  }),
  {
    nextScrollTop: 42,
    shouldAutoScrollChat: false
  }
);

console.log("chatViewRenderer tests passed");
