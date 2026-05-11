import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import { calculatePlanProgress, getCurrentTask, transitionTask } from "../src/contexCode/progress";

const plan = makeContexCodePlan();
const progress = calculatePlanProgress(plan);
assert.equal(progress.totalTasks, 2);
assert.equal(progress.completedTasks, 0);
assert.equal(progress.percent, 0);
assert.equal(getCurrentTask(plan)?.id, "task_1_1_first_task");

const afterDone = transitionTask(plan, "task_1_1_first_task", "done", "2026-05-10T12:10:00.000Z");
assert.equal(afterDone.phases[0].tasks[0].status, "done");
assert.equal(afterDone.currentTaskId, "task_1_2_second_task");
assert.equal(getCurrentTask(afterDone)?.id, "task_1_2_second_task");
assert.equal(calculatePlanProgress(afterDone).percent, 50);

const finished = transitionTask(afterDone, "task_1_2_second_task", "done", "2026-05-10T12:20:00.000Z");
assert.equal(finished.status, "done");
assert.equal(calculatePlanProgress(finished).percent, 100);

console.log("contexCodeProgress tests passed");
