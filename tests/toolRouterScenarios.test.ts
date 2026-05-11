import assert from "node:assert/strict";
import { parseSemanticLocalCommandPlan } from "../src/views/semanticLocalCommandPlan";

const scenarios = [
  {
    name: "open file in folder",
    response: {
      action: "open_file",
      query: "Test/Test.md"
    },
    expectedActions: ["open_file"],
    expectedQuery: "Test/Test.md"
  },
  {
    name: "open then replace",
    response: {
      actions: [
        {
          action: "open_file",
          query: "Proton/LLM Engineering.md"
        },
        {
          action: "replace_text",
          replacements: [
            {
              original: "old",
              suggested: "new"
            }
          ]
        }
      ]
    },
    expectedActions: ["open_file", "replace_text"],
    expectedQuery: "Proton/LLM Engineering.md"
  },
  {
    name: "corrected intent wins",
    response: {
      action: "research_note",
      query:
        "create a new researched note about modern local LLM features in folder Obisidian"
    },
    expectedActions: ["research_note"],
    expectedQuery:
      "create a new researched note about modern local LLM features in folder Obisidian"
  },
  {
    name: "latest answer TTS",
    response: {
      action: "read_last_answer"
    },
    expectedActions: ["read_last_answer"]
  }
];

for (const scenario of scenarios) {
  const parsed = parseSemanticLocalCommandPlan(JSON.stringify(scenario.response));

  assert.ok(parsed, scenario.name);
  assert.deepEqual(
    parsed.map((action) => action.action),
    scenario.expectedActions,
    scenario.name
  );

  if (scenario.expectedQuery) {
    assert.equal(parsed[0]?.query, scenario.expectedQuery, scenario.name);
  }
}

console.log("toolRouterScenarios tests passed");
