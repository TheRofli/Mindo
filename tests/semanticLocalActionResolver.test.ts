import assert from "node:assert/strict";
import { SemanticLocalActionResolver } from "../src/views/controllers/SemanticLocalActionResolver";
import type { SemanticLocalCommand } from "../src/views/semanticLocalCommandPlan";

{
  const statuses: string[] = [];
  const resolver = new SemanticLocalActionResolver({
    classifyPlan: async () => null,
    setStatus: (status) => statuses.push(status),
    warn: () => undefined
  });

  assert.equal(await resolver.resolve("hello"), null);
  assert.deepEqual(statuses, ["Status: Understanding command"]);
}

{
  const commands: SemanticLocalCommand[] = [
    {
      action: "open_file",
      query: "Test/Test.md"
    }
  ];
  const resolver = new SemanticLocalActionResolver({
    classifyPlan: async () => commands,
    setStatus: () => undefined,
    warn: () => undefined
  });

  assert.deepEqual(await resolver.resolve("Open test"), {
    kind: "open-file",
    commandText: "Open test",
    query: "Test/Test.md"
  });
}

{
  const commands: SemanticLocalCommand[] = [
    {
      action: "open_file",
      query: "Test/Test.md"
    },
    {
      action: "replace_text",
      original: "old",
      suggested: "new"
    }
  ];
  const resolver = new SemanticLocalActionResolver({
    classifyPlan: async () => commands,
    setStatus: () => undefined,
    warn: () => undefined
  });

  const action = await resolver.resolve(
    "Open Test/Test.md and replace old with new"
  );
  assert.equal(action?.kind, "action-plan");
  assert.equal(action?.actions.length, 2);
  assert.equal(action?.actions[0]?.kind, "open-file");
  assert.equal(action?.actions[1]?.kind, "replace-text");
}

{
  const statuses: string[] = [];
  const warnings: string[] = [];
  const resolver = new SemanticLocalActionResolver({
    classifyPlan: async () => {
      throw new Error("model unavailable");
    },
    setStatus: (status) => statuses.push(status),
    warn: (message) => warnings.push(message)
  });

  assert.equal(await resolver.resolve("Open something"), null);
  assert.deepEqual(statuses, ["Status: Understanding command", "Status: Ready"]);
  assert.deepEqual(warnings, ["[Mindo] Semantic local command failed"]);
}

console.log("semanticLocalActionResolver tests passed");
