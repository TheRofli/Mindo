import assert from "node:assert/strict";

import { ChatSessionViewController } from "../src/views/controllers/ChatSessionViewController";
import type { ChatMessage, ChatSession, ChatState } from "../src/types";

const userMessage: ChatMessage = {
  id: "m1",
  role: "user",
  content: "Open project plan",
  createdAt: 1000
};

function session(id: string, title = id, messages: ChatMessage[] = []): ChatSession {
  return {
    id,
    title,
    messages,
    createdAt: 1,
    updatedAt: 2
  };
}

function createHarness() {
  let hasLoadedChatState = false;
  let sessions: ChatSession[] = [];
  let activeChatId: string | null = null;
  let messages: ChatMessage[] = [];
  let persistedState: ChatState = {
    sessions: [session("persisted", "Persisted", [userMessage])],
    activeChatId: "persisted"
  };
  let persistTimer: number | null = null;
  let nextTimerId = 40;
  const calls: string[] = [];
  const clearedTimers: number[] = [];
  const timerCallbacks: Array<() => void> = [];
  const savedStates: ChatState[] = [];

  const controller = new ChatSessionViewController({
    getHasLoadedChatState: () => hasLoadedChatState,
    setHasLoadedChatState: (value) => {
      hasLoadedChatState = value;
    },
    getPersistedChatState: () => persistedState,
    getSessionState: () => ({ sessions, activeChatId, messages }),
    setSessionState: (state) => {
      sessions = state.sessions;
      activeChatId = state.activeChatId;
      messages = state.messages;
    },
    onStartNewChat: () => calls.push("start"),
    onSwitchChat: () => calls.push("switch"),
    onDeleteChat: () => calls.push("delete"),
    refreshChatSelect: () => calls.push("refresh"),
    renderSuggestions: () => calls.push("suggestions"),
    renderMessages: () => calls.push("messages"),
    focusInput: () => calls.push("focus"),
    getPersistTimer: () => persistTimer,
    setPersistTimer: (timer) => {
      persistTimer = timer;
    },
    setTimeout: (callback) => {
      timerCallbacks.push(callback);
      return ++nextTimerId;
    },
    clearTimeout: (timer) => {
      clearedTimers.push(timer);
    },
    saveChatState: async (state) => {
      savedStates.push(state);
    }
  });

  return {
    controller,
    calls,
    clearedTimers,
    timerCallbacks,
    savedStates,
    get hasLoadedChatState() {
      return hasLoadedChatState;
    },
    get sessions() {
      return sessions;
    },
    get activeChatId() {
      return activeChatId;
    },
    get messages() {
      return messages;
    },
    get persistTimer() {
      return persistTimer;
    },
    set persistedState(value: ChatState) {
      persistedState = value;
    },
    set persistTimer(value: number | null) {
      persistTimer = value;
    }
  };
}

{
  const state = createHarness();

  state.controller.ensureChatSession();

  assert.equal(state.hasLoadedChatState, true);
  assert.equal(state.activeChatId, "persisted");
  assert.deepEqual(state.messages, [userMessage]);
}

{
  const state = createHarness();

  state.controller.ensureChatSession();
  state.controller.startNewChat();

  assert.equal(state.sessions.length, 2);
  assert.equal(state.messages.length, 0);
  assert.deepEqual(state.calls, [
    "start",
    "refresh",
    "suggestions",
    "messages",
    "focus"
  ]);
}

{
  const state = createHarness();

  state.controller.ensureChatSession();
  state.controller.switchChat("missing");

  assert.deepEqual(state.calls, []);

  state.controller.startNewChat();
  state.controller.switchChat("persisted");

  assert.equal(state.activeChatId, "persisted");
  assert.deepEqual(state.messages, [userMessage]);
  assert.ok(state.calls.includes("switch"));
}

{
  const state = createHarness();

  state.controller.ensureChatSession();
  state.persistTimer = 10;
  state.controller.queuePersistChatState();

  assert.deepEqual(state.clearedTimers, [10]);
  assert.equal(state.persistTimer, 41);
  assert.equal(state.timerCallbacks.length, 1);

  state.timerCallbacks[0]();
  await state.controller.persistChatState();

  assert.equal(state.persistTimer, null);
  assert.deepEqual(state.savedStates[0], {
    sessions: state.sessions,
    activeChatId: state.activeChatId
  });
}

console.log("chatSessionViewController tests passed");
