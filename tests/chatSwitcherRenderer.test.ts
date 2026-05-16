import assert from "node:assert/strict";
import { getActiveChatMenuLabel } from "../src/views/chatSwitcherRenderer";
import type { ChatSession } from "../src/types";

const sessions: ChatSession[] = [
  { id: "a", title: "First chat", messages: [], updatedAt: 1 },
  { id: "b", title: "Second chat", messages: [], updatedAt: 2 }
];

assert.equal(getActiveChatMenuLabel(sessions, "b", "New chat"), "Second chat");
assert.equal(getActiveChatMenuLabel(sessions, "missing", "New chat"), "New chat");
assert.equal(getActiveChatMenuLabel([], null, "New chat"), "New chat");

console.log("chatSwitcherRenderer tests passed");
