import assert from "node:assert/strict";
import {
  createChatSession,
  deleteCurrentChatSession,
  ensureChatSessionState,
  startNewChatSession,
  switchChatSession,
  updateActiveChatTitleFromMessages
} from "../src/chat/chatSessionController";
import type { ChatMessage, ChatSession, ChatState } from "../src/types";

const now = 1000;
let idCounter = 0;
const createId = () => `chat-${++idCounter}`;
const createTime = () => now + idCounter;

const firstMessage: ChatMessage = {
  id: "m1",
  role: "user",
  content: "Open the project architecture note",
  createdAt: now
};

const persistedSession: ChatSession = {
  id: "persisted",
  title: "Persisted",
  messages: [firstMessage],
  createdAt: 1,
  updatedAt: 2
};

assert.deepEqual(createChatSession("New chat", { createId, createTime }), {
  id: "chat-1",
  title: "New chat",
  messages: [],
  createdAt: 1000,
  updatedAt: 1000
});

const persistedState: ChatState = {
  sessions: [persistedSession],
  activeChatId: "missing"
};
const ensuredPersisted = ensureChatSessionState(persistedState, {
  createId,
  createTime
});
assert.equal(ensuredPersisted.activeChatId, "persisted");
assert.equal(ensuredPersisted.messages, persistedSession.messages);

const ensuredEmpty = ensureChatSessionState(null, { createId, createTime });
assert.equal(ensuredEmpty.sessions.length, 1);
assert.equal(ensuredEmpty.activeChatId, "chat-2");
assert.equal(ensuredEmpty.messages, ensuredEmpty.sessions[0].messages);

const started = startNewChatSession(ensuredPersisted.sessions, {
  createId,
  createTime
});
assert.equal(started.sessions[0].id, "chat-3");
assert.equal(started.activeChatId, "chat-3");
assert.equal(started.messages, started.sessions[0].messages);

const switched = switchChatSession(started.sessions, "persisted");
assert.equal(switched?.activeChatId, "persisted");
assert.equal(switched?.messages, persistedSession.messages);

const deleted = deleteCurrentChatSession(started.sessions, "chat-3");
assert.equal(deleted.sessions.length, 1);
assert.equal(deleted.activeChatId, "persisted");

const resetOnly = deleteCurrentChatSession([persistedSession], "persisted");
assert.equal(resetOnly.sessions.length, 1);
assert.equal(resetOnly.sessions[0].title, "New chat");
assert.deepEqual(resetOnly.messages, []);

const renamed = updateActiveChatTitleFromMessages(
  {
    sessions: [persistedSession],
    activeChatId: "persisted"
  },
  [firstMessage],
  { createTime: () => 777 }
);
assert.equal(renamed.sessions[0].title, "Open the project architecture note");
assert.equal(renamed.sessions[0].updatedAt, 777);

console.log("chatSessionController tests passed");
