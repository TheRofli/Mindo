import assert from "node:assert/strict";

import { runLlmAssistantResponse } from "../src/chat/llmResponseRunner";
import type { ChatMessage, ContexSettings } from "../src/types";

const settings = {
  baseUrl: "http://127.0.0.1:8085/v1",
  apiKey: "dummy",
  model: "test-model",
  temperature: 0.2
} as ContexSettings;

const createAssistant = (): ChatMessage => ({
  id: "assistant-1",
  role: "assistant",
  content: "",
  createdAt: 1
});

{
  const assistant = createAssistant();
  const pushedTokens: string[] = [];
  let renderCount = 0;

  await runLlmAssistantResponse({
    settings,
    requestMessages: [],
    requestContext: null,
    assistantMessage: assistant,
    abortSignal: new AbortController().signal,
    speechQueue: {
      pushToken: (token) => pushedTokens.push(token)
    },
    onToken: () => {
      renderCount += 1;
    },
    onStreamingFallback: () => {
      throw new Error("fallback should not run");
    },
    streamCompletion: async (_settings, _messages, _context, onToken) => {
      onToken("Hello ");
      onToken("world");
      return "Hello world";
    },
    requestCompletion: async () => {
      throw new Error("request completion should not run");
    }
  });

  assert.equal(assistant.content, "Hello world");
  assert.deepEqual(pushedTokens, ["Hello ", "world"]);
  assert.equal(renderCount, 2);
}

{
  const assistant = createAssistant();
  const pushedTokens: string[] = [];
  let fallbackCount = 0;

  await runLlmAssistantResponse({
    settings,
    requestMessages: [],
    requestContext: null,
    assistantMessage: assistant,
    abortSignal: new AbortController().signal,
    speechQueue: {
      pushToken: (token) => pushedTokens.push(token)
    },
    onToken: () => {
      throw new Error("stream token should not arrive");
    },
    onStreamingFallback: () => {
      fallbackCount += 1;
    },
    streamCompletion: async () => {
      throw new Error("streaming unavailable");
    },
    requestCompletion: async () => "Fallback answer"
  });

  assert.equal(assistant.content, "Fallback answer");
  assert.deepEqual(pushedTokens, ["Fallback answer"]);
  assert.equal(fallbackCount, 1);
}

{
  const assistant = createAssistant();
  const controller = new AbortController();

  await assert.rejects(
    runLlmAssistantResponse({
      settings,
      requestMessages: [],
      requestContext: null,
      assistantMessage: assistant,
      abortSignal: controller.signal,
      speechQueue: null,
      onToken: () => {
        controller.abort();
      },
      onStreamingFallback: () => {
        throw new Error("fallback should not run after abort");
      },
      streamCompletion: async (_settings, _messages, _context, onToken) => {
        onToken("partial");
        return "partial";
      },
      requestCompletion: async () => "Fallback answer"
    }),
    /Mindo generation canceled/
  );
}

console.log("llmResponseRunner tests passed");
