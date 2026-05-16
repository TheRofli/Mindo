import assert from "node:assert/strict";
import { RenderSchedulerController } from "../src/views/controllers/RenderSchedulerController";

const scheduledCallbacks = new Map<number, () => void>();
const clearedTimers: number[] = [];
let nextTimerId = 1;
let renderCount = 0;

const controller = new RenderSchedulerController({
  delayMs: 150,
  render: () => {
    renderCount += 1;
  },
  setTimeout: (callback, delayMs) => {
    assert.equal(delayMs, 150);
    const timerId = nextTimerId++;
    scheduledCallbacks.set(timerId, callback);
    return timerId;
  },
  clearTimeout: (timerId) => {
    clearedTimers.push(timerId);
    scheduledCallbacks.delete(timerId);
  }
});

assert.equal(controller.queue(), true);
assert.equal(controller.queue(), false);
assert.equal(scheduledCallbacks.size, 1);

scheduledCallbacks.get(1)?.();

assert.equal(renderCount, 1);
assert.equal(controller.queue(), true);
assert.equal(scheduledCallbacks.size, 2);

controller.dispose();

assert.deepEqual(clearedTimers, [2]);

console.log("renderSchedulerController tests passed");
