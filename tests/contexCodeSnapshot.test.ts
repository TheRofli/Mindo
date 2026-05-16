import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import { renderContexCodeBlock } from "../src/contexCode/planBlock";

const block = renderContexCodeBlock(
  makeContexCodePlan({
    id: "ccp_snapshot",
    title: "LiveCollab",
    phases: [
      {
        id: "phase_1",
        title: "Foundation",
        displayTitle: "Foundation",
        summary: "Core setup.",
        tasks: [
          {
            id: "task_1",
            title: "Create plugin scaffold",
            displayTitle: "Create plugin scaffold",
            status: "run"
          },
          {
            id: "task_2",
            title: "Add source system",
            displayTitle: "Add source system",
            status: "todo"
          }
        ]
      }
    ]
  }),
  { language: "ru" }
);

const progress = String.fromCharCode(0x2591).repeat(20);

assert.doesNotMatch(block, /```(?:json)?/i);
assert.doesNotMatch(block, /"title"\s*:/);
assert.doesNotMatch(block, /Project: LiveCollab[\s\S]*Project: LiveCollab/);
assert.match(block, new RegExp(`${progress} \\| 0%`, "u"));
assert.doesNotMatch(block, new RegExp(`\\[${progress}\\]`, "u"));
assert.match(block, /\u041f\u0440\u043e\u0435\u043a\u0442\*\* LiveCollab/u);
assert.match(block, /\u0421\u0435\u0439\u0447\u0430\u0441/u);
assert.match(block, /\u041f\u043b\u0430\u043d/u);

console.log("contexCodeSnapshot tests passed");
