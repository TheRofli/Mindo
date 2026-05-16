import assert from "node:assert/strict";
import { SpeechCompletionController } from "../src/views/controllers/SpeechCompletionController";

async function run() {
  {
    const controller = new SpeechCompletionController();
    const completion = controller.waitFor("message-1");

    assert.equal(controller.pendingCount(), 1);
    controller.resolve("message-1", true);
    assert.equal(await completion, true);
    assert.equal(controller.pendingCount(), 0);
  }

  {
    const controller = new SpeechCompletionController();
    const completion = controller.waitFor("message-2");

    controller.resolve("message-2", false);
    assert.equal(await completion, false);
    assert.equal(controller.pendingCount(), 0);
  }

  {
    const controller = new SpeechCompletionController();

    controller.resolve("missing", true);
    assert.equal(controller.pendingCount(), 0);
  }

  {
    const controller = new SpeechCompletionController();
    const first = controller.waitFor("message-3");
    const second = controller.waitFor("message-3");

    controller.resolve("message-3", true);
    assert.equal(await second, true);
    assert.equal(controller.pendingCount(), 0);

    let firstResolved = false;
    void first.then(() => {
      firstResolved = true;
    });
    await Promise.resolve();
    assert.equal(firstResolved, false);
  }
}

void run()
  .then(() => {
    console.log("speechCompletionController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
