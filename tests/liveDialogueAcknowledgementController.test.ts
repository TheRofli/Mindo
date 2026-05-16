import assert from "node:assert/strict";
import { LiveDialogueAcknowledgementController } from "../src/views/controllers/LiveDialogueAcknowledgementController";
import type { LiveDialogueAcknowledgementKind } from "../src/voice/liveDialogue";

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

function createHarness(options: {
  provider?: string;
  isActive?: boolean;
  requestFails?: boolean;
} = {}) {
  const calls: string[] = [];
  const audios: FakeAudio[] = [];
  let urlCounter = 0;
  let provider = options.provider ?? "silero";
  let active = options.isActive ?? true;

  const controller = new LiveDialogueAcknowledgementController({
    getTtsProvider: () => provider,
    isSessionActive: () => active,
    requestAudio: async (text) => {
      calls.push(`request:${text}`);
      if (options.requestFails) {
        throw new Error("synth failed");
      }
      return new Blob([text]);
    },
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
    buildText: (kind) => `ack:${kind}`,
    onError: (error) => calls.push(`error:${String(error)}`)
  });

  return {
    calls,
    audios,
    controller,
    setProvider(value: string) {
      provider = value;
    },
    setActive(value: boolean) {
      active = value;
    }
  };
}

async function run() {
  {
    const { controller, calls } = createHarness({ provider: "browser" });
    await controller.warm();
    assert.deepEqual(calls, []);
  }

  {
    const { controller, calls } = createHarness();
    await controller.warm();
    assert.deepEqual(
      calls.filter((call) => call.startsWith("request:")).sort(),
      (["thinking", "opening", "editing", "researching"] as const)
        .map((kind) => `request:ack:${kind}`)
        .sort()
    );
  }

  {
    const { controller, calls, audios } = createHarness();
    await controller.getAudio("opening");
    await controller.play("opening");
    assert.equal(controller.getSpeechText(), "ack:opening");
    assert.equal(audios.length, 1);
    assert.equal(audios[0].played, true);
    assert.ok(calls.includes("create-url:blob:1"));

    audios[0].emit("ended");
    assert.equal(controller.getSpeechText(), "");
    assert.equal(audios[0].paused, true);
    assert.ok(calls.includes("revoke-url:blob:1"));
  }

  {
    const { controller, calls, audios, setActive } = createHarness();
    await controller.getAudio("editing");
    setActive(false);
    await controller.play("editing");
    assert.equal(audios.length, 0);
    assert.equal(calls.some((call) => call.startsWith("create-url:")), false);
  }

  {
    const { controller, calls, audios } = createHarness();
    await controller.play("researching");
    assert.equal(audios.length, 0);
    assert.equal(calls.length, 0);
  }

  {
    const { controller, calls } = createHarness({ requestFails: true });
    await controller.warm();
    assert.ok(calls.some((call) => call.startsWith("error:")));
  }
}

void run()
  .then(() => {
    console.log("liveDialogueAcknowledgementController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
