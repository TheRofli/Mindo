import assert from "node:assert/strict";
import {
  RECORDING_TIMER_INTERVAL_MS,
  VoiceRecordingTimerController,
  getRecordingTimerResetText
} from "../src/views/controllers/VoiceRecordingTimerController";

class FakeTimerElement {
  classes = new Set<string>();
  text = "";

  addClass(cls: string): void {
    this.classes.add(cls);
  }

  removeClass(cls: string): void {
    this.classes.delete(cls);
  }

  setText(text: string): void {
    this.text = text;
  }
}

let now = 10_000;
let nextTimerId = 1;
let intervalCallback: (() => void) | null = null;
let intervalMs = 0;
const clearedTimerIds: number[] = [];

const controller = new VoiceRecordingTimerController({
  now: () => now,
  setInterval: (callback, ms) => {
    intervalCallback = callback;
    intervalMs = ms;
    return nextTimerId++;
  },
  clearInterval: (timerId) => {
    clearedTimerIds.push(timerId);
  },
  formatElapsedTime: (startedAt, currentTime) =>
    `${Math.floor((currentTime - startedAt) / 1000)}s`
});

const timerEl = new FakeTimerElement();

assert.equal(getRecordingTimerResetText(), "0:00");
assert.equal(RECORDING_TIMER_INTERVAL_MS, 250);

controller.start(timerEl as unknown as HTMLElement);

assert.equal(timerEl.classes.has("is-active"), true);
assert.equal(timerEl.text, "0s");
assert.equal(intervalMs, RECORDING_TIMER_INTERVAL_MS);

now = 12_500;
intervalCallback?.();

assert.equal(timerEl.text, "2s");

controller.stop(timerEl as unknown as HTMLElement);

assert.equal(timerEl.classes.has("is-active"), false);
assert.equal(timerEl.text, "0:00");
assert.deepEqual(clearedTimerIds, [1]);

console.log("voiceRecordingTimerController tests passed");
