import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import { normalizeContexCodePlan } from "../src/contexCode/planSchema";

const plan = normalizeContexCodePlan(
  {
    title: "Voice Flow",
    projectNotePath: "Obsidian/Voice Flow.md",
    phases: [
      {
        title: "Live Dialogue",
        tasks: [
          {
            title: "Add VAD",
            summary: "Detect pauses.",
            acceptance: ["Stops after a configurable pause"],
          },
        ],
      },
    ],
  },
  "2026-05-10T12:00:00.000Z",
);

assert.equal(plan.version, 1);
assert.equal(plan.status, "draft");
assert.equal(plan.phases[0].status, "queued");
assert.equal(plan.phases[0].tasks[0].status, "queued");
assert.equal(plan.phases[0].tasks[0].id.startsWith("task_1_1_"), true);
assert.equal(plan.createdAt, "2026-05-10T12:00:00.000Z");

const existing = makeContexCodePlan({ status: "done" });
const normalizedExisting = normalizeContexCodePlan(existing, "2026-05-10T12:00:00.000Z");
assert.equal(normalizedExisting.id, existing.id);
assert.equal(normalizedExisting.status, "done");

console.log("contexCodePlanTypes tests passed");
