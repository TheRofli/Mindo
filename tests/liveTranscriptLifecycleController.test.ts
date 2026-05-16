import assert from "node:assert/strict";
import {
  LiveTranscriptLifecycleController,
  type LiveTranscriptLifecycleControllerDeps
} from "../src/views/controllers/LiveTranscriptLifecycleController";

function createDeps(
  overrides: Partial<LiveTranscriptLifecycleControllerDeps> = {}
): LiveTranscriptLifecycleControllerDeps {
  const events: string[] = [];

  return {
    stopPreview: () => {
      events.push("stopPreview");
    },
    beginDraft: () => {
      events.push("beginDraft");
      return true;
    },
    startPreview: (options) => {
      events.push(`startPreview:${options.language}`);
      options.onPreview({ finalText: "final", interimText: "interim" });
      return true;
    },
    updateDraft: (finalText, interimText) => {
      events.push(`updateDraft:${finalText}:${interimText}`);
    },
    clearDraft: () => {
      events.push("clearDraft");
    },
    restoreDraft: () => {
      events.push("restoreDraft");
    },
    getLanguage: () => "ru-RU",
    getRecognitionConstructor: () => null,
    shouldRestart: () => true,
    onUnavailable: () => {
      events.push("unavailable");
    },
    getEvents: () => events,
    ...overrides
  };
}

function testStartsPreviewAndRoutesUpdates(): void {
  const deps = createDeps();
  const controller = new LiveTranscriptLifecycleController(deps);

  controller.start();

  assert.deepEqual(deps.getEvents?.(), [
    "stopPreview",
    "beginDraft",
    "startPreview:ru-RU",
    "updateDraft:final:interim"
  ]);
}

function testClearsDraftWhenDraftCannotBegin(): void {
  const deps = createDeps({ beginDraft: () => false });
  const controller = new LiveTranscriptLifecycleController(deps);

  controller.start();

  assert.deepEqual(deps.getEvents?.(), ["stopPreview"]);
}

function testClearsDraftWhenPreviewCannotStart(): void {
  const deps = createDeps({
    startPreview: () => {
      deps.getEvents?.().push("startPreview:false");
      return false;
    }
  });
  const controller = new LiveTranscriptLifecycleController(deps);

  controller.start();

  assert.deepEqual(deps.getEvents?.(), [
    "stopPreview",
    "beginDraft",
    "startPreview:false",
    "clearDraft"
  ]);
}

function testStopClearRestoreDelegate(): void {
  const deps = createDeps();
  const controller = new LiveTranscriptLifecycleController(deps);

  controller.stop();
  controller.clear();
  controller.restore();

  assert.deepEqual(deps.getEvents?.(), [
    "stopPreview",
    "clearDraft",
    "restoreDraft"
  ]);
}

testStartsPreviewAndRoutesUpdates();
testClearsDraftWhenDraftCannotBegin();
testClearsDraftWhenPreviewCannotStart();
testStopClearRestoreDelegate();

console.log("liveTranscriptLifecycleController tests passed");
