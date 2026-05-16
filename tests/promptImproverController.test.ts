import assert from "node:assert/strict";

import { PromptImproverController } from "../src/views/controllers/PromptImproverController";
import { DEFAULT_SETTINGS, type ChatMessage } from "../src/types";

function createDeps(
  overrides: Partial<ConstructorParameters<typeof PromptImproverController>[0]> = {}
) {
  const events: string[] = [];
  let inputValue = "create note";
  let inputDisabled = false;
  let focused = false;

  const deps: ConstructorParameters<typeof PromptImproverController>[0] = {
    settings: DEFAULT_SETTINGS,
    getPrompt: () => inputValue,
    setPrompt: (value) => {
      inputValue = value;
    },
    setInputDisabled: (value) => {
      inputDisabled = value;
    },
    focusInput: () => {
      focused = true;
    },
    requestLlmChatCompletion: async (_settings, messages: ChatMessage[]) => {
      assert.ok(messages[0].content.includes("create note"));
      return "Create a concise project note.";
    },
    setError: (message) => {
      events.push(`error:${message ?? "null"}`);
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`);
    },
    setStatus: (status) => {
      events.push(`status:${status}`);
    },
    pushActionTimeline: (type, label, detail) => {
      events.push(`timeline:${type}:${label}${detail ? `:${detail}` : ""}`);
    },
    notify: (message) => {
      events.push(`notice:${message}`);
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error),
    ...overrides
  };

  return {
    deps,
    events,
    get inputValue() {
      return inputValue;
    },
    get inputDisabled() {
      return inputDisabled;
    },
    get focused() {
      return focused;
    }
  };
}

{
  const state = createDeps({
    getPrompt: () => ""
  });
  const controller = new PromptImproverController(state.deps);

  await controller.improve();

  assert.deepEqual(state.events, ["notice:Write a prompt first."]);
}

{
  const state = createDeps();
  const controller = new PromptImproverController(state.deps);

  await controller.improve();

  assert.equal(state.inputValue, "Create a concise project note.");
  assert.equal(state.inputDisabled, false);
  assert.equal(state.focused, true);
  assert.deepEqual(state.events, [
    "error:null",
    "status:Status: Improving prompt",
    "timeline:running:Improving prompt",
    "loading:true",
    "status:Status: Prompt improved",
    "timeline:done:Prompt improved",
    "loading:false"
  ]);
}

{
  const state = createDeps({
    requestLlmChatCompletion: async () => ""
  });
  const controller = new PromptImproverController(state.deps);

  await controller.improve();

  assert.equal(state.inputValue, "create note");
  assert.ok(state.events.includes("error:The model returned an empty improved prompt."));
  assert.ok(
    state.events.includes(
      "timeline:failed:Prompt improvement failed:The model returned an empty improved prompt."
    )
  );
  assert.equal(state.inputDisabled, false);
  assert.equal(state.focused, true);
}

console.log("promptImproverController tests passed");
