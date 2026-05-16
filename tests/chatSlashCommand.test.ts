import assert from "node:assert/strict";

import { parseChatSlashCommand } from "../src/chat/chatSlashCommand";

assert.deepEqual(parseChatSlashCommand("/search bitnet", false), {
  kind: "vault-search",
  query: "bitnet"
});

assert.deepEqual(parseChatSlashCommand("/web latest local llm news", false), {
  kind: "web-research",
  query: "latest local llm news"
});

assert.deepEqual(parseChatSlashCommand("/rag voice flow", false), {
  kind: "semantic-vault",
  query: "voice flow"
});

assert.equal(parseChatSlashCommand("/search bitnet", true), null);
assert.equal(parseChatSlashCommand("search bitnet", false), null);
assert.equal(parseChatSlashCommand("/web   ", false), null);

console.log("chatSlashCommand tests passed");
