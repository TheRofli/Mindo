import assert from "node:assert/strict";
import { SpeechAudioPlaybackController } from "../src/views/controllers/SpeechAudioPlaybackController";

interface FakeAudio {
  url: string;
  paused: boolean;
  played: boolean;
  listeners: Record<string, Array<() => void>>;
  addEventListener: (event: string, callback: () => void) => void;
  pause: () => void;
  play: () => Promise<void>;
  emit: (event: string) => void;
}

function createFakeAudio(url: string): FakeAudio {
  const audio: FakeAudio = {
    url,
    paused: false,
    played: false,
    listeners: {},
    addEventListener(event, callback) {
      audio.listeners[event] = audio.listeners[event] ?? [];
      audio.listeners[event].push(callback);
    },
    pause() {
      audio.paused = true;
    },
    async play() {
      audio.played = true;
    },
    emit(event) {
      for (const listener of audio.listeners[event] ?? []) {
        listener();
      }
    }
  };

  return audio;
}

function createHarness(currentMessageId = "message-1") {
  const calls: string[] = [];
  const audios: FakeAudio[] = [];
  let urlCounter = 0;

  const controller = new SpeechAudioPlaybackController({
    getSpeakingMessageId: () => currentMessageId,
    createObjectUrl: () => {
      const url = `blob:${++urlCounter}`;
      calls.push(`create-url:${url}`);
      return url;
    },
    revokeObjectUrl: (url) => calls.push(`revoke-url:${url}`),
    createAudio: (url) => {
      const audio = createFakeAudio(url);
      audios.push(audio);
      return audio;
    },
    onFinished: (messageId) => calls.push(`finished:${messageId}`)
  });

  return { audios, calls, controller };
}

async function run() {
  {
    const { audios, calls, controller } = createHarness("message-1");

    controller.play(new Blob(["audio"]), "message-1");
    assert.equal(audios.length, 1);
    assert.equal(audios[0].played, true);
    assert.deepEqual(calls, ["create-url:blob:1"]);
  }

  {
    const { audios, calls, controller } = createHarness("message-2");

    controller.play(new Blob(["audio"]), "message-1");
    assert.equal(audios.length, 0);
    assert.deepEqual(calls, []);
  }

  {
    const { audios, calls, controller } = createHarness("message-1");

    controller.play(new Blob(["audio"]), "message-1");
    audios[0].emit("ended");

    assert.equal(audios[0].paused, true);
    assert.deepEqual(calls, [
      "create-url:blob:1",
      "revoke-url:blob:1",
      "finished:message-1"
    ]);
  }

  {
    const { audios, calls, controller } = createHarness("message-1");

    controller.play(new Blob(["audio"]), "message-1");
    controller.stop();

    assert.equal(audios[0].paused, true);
    assert.deepEqual(calls, ["create-url:blob:1", "revoke-url:blob:1"]);
  }

  {
    const { calls, controller } = createHarness("message-1");

    controller.finish();
    assert.deepEqual(calls, []);
  }
}

void run()
  .then(() => {
    console.log("speechAudioPlaybackController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
