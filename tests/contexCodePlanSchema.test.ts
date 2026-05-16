import assert from "node:assert/strict";
import {
  normalizeContexCodePlan,
  serializeContexCodePlan
} from "../src/contexCode";

const normalized = normalizeContexCodePlan(
  {
    id: "",
    title: "",
    status: "strange",
    projectNotePath: 42,
    phases: [
      {
        title: "Phase",
        tasks: [
          {
            title: "Task",
            status: "mystery",
            acceptance: "Done"
          }
        ]
      }
    ]
  },
  "2026-05-10T00:00:00.000Z"
);

assert.equal(normalized.version, 1);
assert.equal(normalized.title, "Untitled Mindo Code Plan");
assert.equal(normalized.status, "draft");
assert.equal(normalized.projectNotePath, "Untitled Mindo Code Plan.md");
assert.equal(normalized.phases[0]?.status, "queued");
assert.equal(normalized.phases[0]?.tasks[0]?.status, "queued");
assert.deepEqual(normalized.phases[0]?.tasks[0]?.acceptance, ["Done"]);

const serialized = serializeContexCodePlan(normalized);
assert.equal(JSON.parse(serialized).version, 1);
assert.ok(serialized.endsWith("\n"));

console.log("contexCodePlanSchema tests passed");
