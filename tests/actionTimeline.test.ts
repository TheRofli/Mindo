import assert from "node:assert/strict";
import { ActionTimeline } from "../src/actions/actionTimeline";

const timeline = new ActionTimeline(3);

timeline.push({ type: "thinking", label: "Thinking" });
timeline.push({ type: "running", label: "Opening file", path: "Test/Test.md" });
timeline.push({ type: "done", label: "Opened", path: "Test/Test.md" });
timeline.push({ type: "done", label: "Rendered receipt" });

assert.equal(timeline.latest()?.label, "Rendered receipt");
assert.equal(timeline.all().length, 3);
assert.equal(timeline.all()[0].label, "Opening file");

console.log("actionTimeline tests passed");
