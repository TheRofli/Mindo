import assert from "node:assert/strict";
import { SpeechMessageController } from "../src/views/controllers/SpeechMessageController";

function createHarness(options: {
  provider?: string;
  speechText?: string;
  speakingMessageIdAfterStart?: string | null;
  remoteFails?: boolean;
} = {}) {
  const calls: string[] = [];
  let speakingMessageId: string | null = null;

  const controller = new SpeechMessageController({
    getTtsProvider: () => options.provider ?? "browser",
    getTtsReadMode: () => "full",
    getSpeakingMessageId: () =>
      options.speakingMessageIdAfterStart === undefined
        ? speakingMessageId
        : options.speakingMessageIdAfterStart,
    setSpeakingMessageId: (messageId) => {
      calls.push(`speaking:${messageId ?? "none"}`);
      speakingMessageId = messageId;
    },
    prepareSpeechText: () => options.speechText ?? "Readable answer",
    speakWithBrowser: (text, messageId) =>
      calls.push(`browser:${messageId}:${text}`),
    speakWithRemoteProvider: async (text, messageId) => {
      calls.push(`remote:${messageId}:${text}`);
      if (options.remoteFails) {
        throw new Error("remote failed");
      }
    },
    waitForCompletion: async (messageId) => {
      calls.push(`wait:${messageId}`);
      return true;
    },
    stopSpeaking: () => calls.push("stop"),
    notify: (message) => calls.push(`notice:${message}`),
    setStatus: (message) => calls.push(`status:${message}`),
    setError: (message) => calls.push(`error:${message ?? "none"}`),
    renderMessages: () => calls.push("render"),
    syncLiveBargeInMonitor: () => calls.push("sync-barge-in"),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error)
  });

  return { calls, controller };
}

async function run() {
  {
    const { calls, controller } = createHarness({ provider: "disabled" });

    assert.equal(
      await controller.speakMessage({
        id: "message-1",
        content: "hello"
      }),
      false
    );
    assert.deepEqual(calls, [
      "notice:TTS provider is disabled.",
      "error:TTS provider is disabled.",
      "status:Status: TTS disabled"
    ]);
  }

  {
    const { calls, controller } = createHarness({ speechText: "" });

    assert.equal(
      await controller.speakMessage({
        id: "message-2",
        content: "hello"
      }),
      false
    );
    assert.deepEqual(calls, [
      "notice:There is no readable assistant text.",
      "error:There is no readable assistant text.",
      "status:Status: Nothing to read"
    ]);
  }

  {
    const { calls, controller } = createHarness({ provider: "browser" });

    assert.equal(
      await controller.speakMessage({
        id: "message-3",
        content: "hello"
      }),
      true
    );
    assert.deepEqual(calls, [
      "stop",
      "speaking:message-3",
      "status:Status: Reading answer",
      "sync-barge-in",
      "render",
      "browser:message-3:Readable answer"
    ]);
  }

  {
    const { calls, controller } = createHarness({ provider: "silero" });

    assert.equal(
      await controller.speakMessageAndWait({
        id: "message-4",
        content: "hello"
      }),
      true
    );
    assert.ok(calls.includes("remote:message-4:Readable answer"));
    assert.ok(calls.includes("wait:message-4"));
  }

  {
    const { calls, controller } = createHarness({
      provider: "kokoro",
      remoteFails: true
    });

    assert.equal(
      await controller.speakMessage({
        id: "message-5",
        content: "hello"
      }),
      false
    );
    assert.ok(calls.includes("stop"));
    assert.ok(calls.includes("error:remote failed"));
    assert.ok(calls.includes("status:Status: TTS failed"));
  }
}

void run()
  .then(() => {
    console.log("speechMessageController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
