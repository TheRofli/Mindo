import assert from "node:assert/strict";

import { SystemHealthController } from "../src/views/controllers/SystemHealthController";
import { DEFAULT_SETTINGS, type ChatMessage } from "../src/types";

function createDeps(
  overrides: Partial<ConstructorParameters<typeof SystemHealthController>[0]> = {}
) {
  const events: string[] = [];

  const deps: ConstructorParameters<typeof SystemHealthController>[0] = {
    settings: DEFAULT_SETTINGS,
    getLocalSttStatus: async () => ({
      autoStart: true,
      backend: "parakeet",
      endpoint: "http://127.0.0.1:9000/transcribe",
      isRunning: true,
      language: "auto",
      model: "parakeet-tdt-0.6b-v3"
    }),
    requestLlmChatCompletion: async (_settings, messages: ChatMessage[]) => {
      assert.equal(messages[0].content, "Reply with exactly: OK");
      return "OK";
    },
    getActiveNoteLabel: () => "Test/Test.md",
    getRustCoreRuntimeDiagnostics: () => ({
      mode: "native",
      executablePath: "contex-core.exe",
      documents: 2,
      chunks: 8
    }),
    buildContexDiagnosticsLines: (input) => [
      `Active note: ${input.activeNote ?? "none"}`,
      `Model: ${input.model}`,
      `Rust RAG: ${input.rust.mode}`
    ],
    setError: (message) => {
      events.push(`error:${message ?? "null"}`);
    },
    setStatus: (status) => {
      events.push(`status:${status}`);
    },
    notify: (message, timeout) => {
      events.push(`notice:${message.replace(/\n/g, "|")}:${timeout ?? "default"}`);
    },
    refreshSttStatus: async () => {
      events.push("refresh-stt");
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error),
    ...overrides
  };

  return { deps, events };
}

{
  const state = createDeps();
  const controller = new SystemHealthController(state.deps);

  await controller.check();

  assert.deepEqual(state.events, [
    "error:null",
    "status:Status: Checking Mindo",
    "notice:LLM: OK|STT: running (parakeet-tdt-0.6b-v3)|TTS: silero|Active note: Test/Test.md:default",
    "status:Status: Ready",
    "refresh-stt"
  ]);
}

{
  const state = createDeps({
    requestLlmChatCompletion: async () => {
      throw new Error("LLM offline");
    }
  });
  const controller = new SystemHealthController(state.deps);

  await controller.check();

  assert.deepEqual(state.events, [
    "error:null",
    "status:Status: Checking Mindo",
    "error:LLM offline",
    "status:Status: Health check failed"
  ]);
}

{
  const state = createDeps();
  const controller = new SystemHealthController(state.deps);

  controller.showDiagnostics();

  assert.deepEqual(state.events, [
    "notice:Active note: Test/Test.md|Model: gemma-4-e4b-it|Rust RAG: native:9000"
  ]);
}

console.log("systemHealthController tests passed");
