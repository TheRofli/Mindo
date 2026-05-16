import assert from "node:assert/strict";
import { ChatScrollController } from "../src/views/controllers/ChatScrollController";

function createScrollEl(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number
) {
  return {
    scrollHeight,
    scrollTop,
    clientHeight
  } as HTMLElement;
}

{
  const controller = new ChatScrollController({
    getChatEl: () => null
  });

  assert.equal(controller.isNearBottom(), true);
  assert.equal(controller.getShouldAutoScroll(), true);
}

{
  let chatEl = createScrollEl(1000, 700, 292);
  const controller = new ChatScrollController({
    getChatEl: () => chatEl
  });

  assert.equal(controller.isNearBottom(), true);
  assert.equal(controller.updateFromScroll(), true);
  assert.equal(controller.getShouldAutoScroll(), true);

  chatEl = createScrollEl(1000, 500, 292);

  assert.equal(controller.isNearBottom(), false);
  assert.equal(controller.updateFromScroll(), false);
  assert.equal(controller.getShouldAutoScroll(), false);
}

{
  const controller = new ChatScrollController({
    bottomThresholdPx: 16,
    getChatEl: () => createScrollEl(1000, 682, 300)
  });

  assert.equal(controller.isNearBottom(), false);
  assert.equal(controller.updateFromScroll(), false);

  controller.setShouldAutoScroll(true);

  assert.equal(controller.getShouldAutoScroll(), true);
}

console.log("chatScrollController tests passed");
