import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import { buildContexCodeWikiEvent, recordContexCodeWikiEvent } from "../src/contexCode/wikiEvents";

const plan = makeContexCodePlan();
const event = buildContexCodeWikiEvent(plan, "task_completed", "2026-05-10T13:00:00.000Z", plan.phases[0].tasks[0]);

assert.equal(event.type, "contex_code.task_completed");
assert.equal(event.planId, plan.id);
assert.equal(event.taskId, "task_1_1_first_task");
assert.match(event.summary, /First task/);

const recorded: unknown[] = [];
const result = await recordContexCodeWikiEvent(
  {
    async writeContexCodeEvent(input: unknown): Promise<void> {
      recorded.push(input);
    },
  },
  event,
);
assert.equal(result, true);
assert.equal(recorded.length, 1);

console.log("contexCodeWikiEvents tests passed");
