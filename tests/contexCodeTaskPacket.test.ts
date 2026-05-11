import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import { buildTaskPacket, formatContexCodeSource } from "../src/contexCode/taskPacket";

const plan = makeContexCodePlan();

assert.equal(
  formatContexCodeSource(plan.sources[0]),
  "[[Obsidian/Spec.md|Project spec]]",
);
assert.equal(
  formatContexCodeSource(plan.sources[1]),
  "[External docs](https://example.com/docs)",
);

const packet = buildTaskPacket(plan, "task_1_1_first_task", {
  verificationCommands: ["npm run verify"],
});
assert.match(packet, /Contex Code Task Packet/);
assert.match(packet, /First task/);
assert.match(packet, /src\/contexCode\/planTypes\.ts/);
assert.match(packet, /npm run verify/);
assert.match(packet, /\[\[Obsidian\/Spec\.md\|Project spec\]\]/);

const shortPacket = buildTaskPacket(plan, "task_1_1_first_task", { maxChars: 160 });
assert.ok(shortPacket.length <= 190);
assert.match(shortPacket, /truncated/);

console.log("contexCodeTaskPacket tests passed");
