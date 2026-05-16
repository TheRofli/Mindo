import assert from "node:assert/strict";
import {
  LiveBargeInAudioMonitorController,
  type LiveBargeInAudioMonitorState
} from "../src/views/controllers/LiveBargeInAudioMonitorController";

function createTrack() {
  return {
    stopped: false,
    stop() {
      this.stopped = true;
    }
  };
}

function createStream() {
  const track = createTrack();
  return {
    track,
    getTracks: () => [track]
  };
}

function createHarness(options?: {
  shouldKeep?: () => boolean;
  shouldRun?: () => boolean;
  isOwnedStream?: (stream: MediaStream) => boolean;
  shouldInterrupt?: (state: LiveBargeInAudioMonitorState) => boolean;
}) {
  const calls: string[] = [];
  const stream = createStream();
  const analyser = {
    frequencyBinCount: 4,
    fftSize: 0,
    getByteTimeDomainData: () => calls.push("read-level")
  };
  const source = {
    connect: () => calls.push("connect"),
    disconnect: () => calls.push("disconnect")
  };
  const audioContext = {
    state: "running",
    createAnalyser: () => analyser,
    createMediaStreamSource: () => source,
    resume: async () => calls.push("resume"),
    close: () => {
      calls.push("close");
    }
  };
  let frame = 0;
  const controller = new LiveBargeInAudioMonitorController({
    canRequestStream: () => true,
    getStream: async () => stream as unknown as MediaStream,
    createAudioContext: () => audioContext as unknown as AudioContext,
    requestAnimationFrame: () => {
      calls.push("raf");
      frame += 1;
      return frame;
    },
    cancelAnimationFrame: (id) => calls.push(`cancel:${id}`),
    now: () => 1000,
    getNormalizedLevel: () => 0.8,
    shouldKeep: options?.shouldKeep ?? (() => true),
    shouldRun: options?.shouldRun ?? (() => true),
    isOwnedStream: options?.isOwnedStream ?? (() => false),
    shouldInterrupt:
      options?.shouldInterrupt ??
      ((state) => {
        calls.push(`interrupt-check:${state.level}`);
        return false;
      }),
    onVoiceDetected: async () => {
      calls.push("voice-detected");
    },
    warn: (label, error) => calls.push(`${label}:${String(error)}`)
  });

  return {
    calls,
    controller,
    stream
  };
}

async function run() {
  {
    const { calls, controller } = createHarness();

    await controller.start();

    assert.equal(calls.includes("connect"), true);
    assert.equal(calls.includes("read-level"), true);
    assert.equal(calls.includes("interrupt-check:0.8"), true);
    assert.equal(calls.includes("raf"), true);
  }

  {
    const { calls, controller } = createHarness({
      shouldInterrupt: () => true
    });

    await controller.start();

    assert.equal(calls.includes("voice-detected"), true);
    assert.equal(calls.includes("raf"), false);
  }

  {
    const { calls, controller, stream } = createHarness({
      isOwnedStream: (candidate) => candidate === (stream as unknown as MediaStream)
    });

    await controller.start();
    controller.stop();

    assert.equal(stream.track.stopped, false);
    assert.ok(calls.some((call) => call.startsWith("cancel:")));
    assert.equal(calls.includes("disconnect"), true);
    assert.equal(calls.includes("close"), true);
  }

  {
    const { controller, stream } = createHarness({
      isOwnedStream: () => false
    });

    await controller.start();
    controller.stop();

    assert.equal(stream.track.stopped, true);
  }
}

void run()
  .then(() => {
    console.log("liveBargeInAudioMonitorController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
