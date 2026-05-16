import assert from "node:assert/strict";
import { LiveDialogueInputStreamController } from "../src/views/controllers/LiveDialogueInputStreamController";

interface FakeTrack {
  readyState: string;
  stop: () => void;
  stopped: boolean;
}

function createTrack(readyState = "live"): FakeTrack {
  const track: FakeTrack = {
    readyState,
    stopped: false,
    stop: () => {
      track.stopped = true;
    }
  };
  return track;
}

function createStream(tracks: FakeTrack[]): MediaStream {
  return {
    getAudioTracks: () => tracks,
    getTracks: () => tracks
  } as unknown as MediaStream;
}

async function run() {
  {
    let active = false;
    let requestCount = 0;
    const errors: string[] = [];
    const controller = new LiveDialogueInputStreamController({
      isSessionActive: () => active,
      requestStream: async () => {
        requestCount += 1;
        return createStream([createTrack()]);
      },
      onError: (message) => errors.push(message)
    });

    assert.equal(await controller.ensure(), null);
    assert.equal(requestCount, 0);
    assert.deepEqual(errors, []);
  }

  {
    let requestCount = 0;
    const stream = createStream([createTrack()]);
    const controller = new LiveDialogueInputStreamController({
      isSessionActive: () => true,
      requestStream: async () => {
        requestCount += 1;
        return stream;
      },
      onError: () => undefined
    });

    assert.equal(await controller.ensure(), stream);
    assert.equal(await controller.ensure(), stream);
    assert.equal(requestCount, 1);
    assert.equal(controller.isCurrent(stream), true);
  }

  {
    let active = true;
    const track = createTrack();
    const stream = createStream([track]);
    const controller = new LiveDialogueInputStreamController({
      isSessionActive: () => active,
      requestStream: async () => {
        active = false;
        return stream;
      },
      onError: () => undefined
    });

    assert.equal(await controller.ensure(), null);
    assert.equal(track.stopped, true);
    assert.equal(controller.getCurrent(), null);
  }

  {
    const firstTrack = createTrack();
    const firstStream = createStream([firstTrack]);
    const secondStream = createStream([createTrack()]);
    let requestCount = 0;
    const controller = new LiveDialogueInputStreamController({
      isSessionActive: () => true,
      requestStream: async () => {
        requestCount += 1;
        return requestCount === 1 ? firstStream : secondStream;
      },
      onError: () => undefined
    });

    assert.equal(await controller.ensure(), firstStream);
    controller.stop();
    assert.equal(firstTrack.stopped, true);
    assert.equal(controller.getCurrent(), null);
    assert.equal(await controller.ensure(), secondStream);
  }

  {
    const errors: string[] = [];
    const controller = new LiveDialogueInputStreamController({
      isSessionActive: () => true,
      requestStream: async () => {
        throw new Error("microphone failed");
      },
      onError: (message) => errors.push(message)
    });

    assert.equal(await controller.ensure(), null);
    assert.deepEqual(errors, ["microphone failed"]);
  }
}

void run()
  .then(() => {
    console.log("liveDialogueInputStreamController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
