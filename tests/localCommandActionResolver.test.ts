import assert from "node:assert/strict";

import {
  LocalCommandActionResolver,
  type LocalCommandActionResolverDeps
} from "../src/views/controllers/LocalCommandActionResolver";
import type { LocalCommandAction } from "../src/views/sidebarTypes";

function createResolver(
  overrides: Partial<LocalCommandActionResolverDeps> = {}
) {
  const events: string[] = [];
  const deps: LocalCommandActionResolverDeps = {
    findLatestDiffMessage: () => null,
    resolveWorkflowLocalCommandAction: () => null,
    resolveOpenFileCandidate: () => null,
    resolveSemanticLocalCommandAction: async () => null,
    ...overrides
  };

  return {
    resolver: new LocalCommandActionResolver(deps),
    events
  };
}

{
  const { resolver } = createResolver({
    findLatestDiffMessage: (status) =>
      status === "pending" ? { id: "diff-1" } : null
  });

  const action = await resolver.resolve("\u043f\u0440\u0438\u043c\u0438");

  assert.deepEqual(action, {
    kind: "apply-diff",
    messageId: "diff-1"
  });
}

{
  const { resolver } = createResolver({
    resolveWorkflowLocalCommandAction: (trimmedText, effectiveText) => ({
      kind: "create-note",
      commandText: effectiveText,
      displayText: trimmedText
    })
  });

  const original =
    "\u043e\u0442\u043a\u0440\u043e\u0439 \u0432 \u043f\u0430\u043f\u043a\u0435 Obsidian, " +
    "\u0442\u043e\u0447\u043d\u0435\u0435 \u0441\u043e\u0437\u0434\u0430\u0439 \u0432 \u043f\u0430\u043f\u043a\u0435 Obsidian \u043f\u043b\u0430\u043d";

  const action = await resolver.resolve(original);

  assert.deepEqual(action, {
    kind: "create-note",
    commandText:
      "\u0441\u043e\u0437\u0434\u0430\u0439 \u0432 \u043f\u0430\u043f\u043a\u0435 Obsidian \u043f\u043b\u0430\u043d",
    displayText: original
  });
}

{
  const { resolver } = createResolver({
    resolveOpenFileCandidate: (query) =>
      query === "\u0442\u0435\u0441\u0442 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442"
        ? "Test/Test.md"
        : null
  });

  const action = await resolver.resolve(
    "\u041e\u0442\u043a\u0440\u043e\u0439 \u0442\u0435\u0441\u0442 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442."
  );

  assert.deepEqual(action, {
    kind: "open-file",
    commandText:
      "\u041e\u0442\u043a\u0440\u043e\u0439 \u0442\u0435\u0441\u0442 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442.",
    query:
      "\u0442\u0435\u0441\u0442 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442"
  });
}

{
  const events: string[] = [];
  const { resolver } = createResolver({
    resolveOpenFileCandidate: (query) => {
      events.push(`candidate:${query}`);
      return null;
    },
    resolveSemanticLocalCommandAction: async () => {
      events.push("semantic");
      return {
        kind: "open-file",
        commandText:
          "\u0410 \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u043d\u0435 \u041e\u043a\u043a\u043e \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439 \u0444\u0430\u0439\u043b?",
        query: "Proton/Qore Systems Strategy.md"
      };
    }
  });

  const action = await resolver.resolve(
    "\u0410 \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u043d\u0435 \u041e\u043a\u043a\u043e \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439 \u0444\u0430\u0439\u043b?"
  );

  assert.deepEqual(action, {
    kind: "open-file",
    commandText:
      "\u0410 \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u043d\u0435 \u041e\u043a\u043a\u043e \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439 \u0444\u0430\u0439\u043b?",
    query: "Proton/Qore Systems Strategy.md"
  });
  assert.deepEqual(events, [
    "candidate:\u041e\u043a\u043a\u043e \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439",
    "semantic"
  ]);
}

{
  const events: string[] = [];
  const { resolver } = createResolver({
    resolveOpenFileCandidate: (query) => {
      events.push(`candidate:${query}`);
      return null;
    },
    resolveSemanticLocalCommandAction: async () => {
      events.push("semantic");
      return {
        kind: "open-file",
        commandText:
          "\u0438\u043c\u0435\u043d\u043d\u043e \u041a\u043e\u0440 \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438",
        query: "Proton/Qore Systems Strategy.md"
      };
    }
  });

  const action = await resolver.resolve(
    "\u0438\u043c\u0435\u043d\u043d\u043e \u041a\u043e\u0440 \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438"
  );

  assert.deepEqual(action, {
    kind: "open-file",
    commandText:
      "\u0438\u043c\u0435\u043d\u043d\u043e \u041a\u043e\u0440 \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438",
    query: "Proton/Qore Systems Strategy.md"
  });
  assert.deepEqual(events, [
    "candidate:\u041a\u043e\u0440 \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438",
    "semantic"
  ]);
}

{
  const semanticAction: LocalCommandAction = {
    kind: "action-plan",
    commandText:
      "\u043e\u0442\u043a\u0440\u043e\u0439 \u0438 \u043f\u043e\u043c\u0435\u043d\u044f\u0439",
    actions: [
      {
        kind: "open-file",
        commandText:
          "\u043e\u0442\u043a\u0440\u043e\u0439 \u0438 \u043f\u043e\u043c\u0435\u043d\u044f\u0439",
        query: "Test/Test.md"
      }
    ]
  };
  const { resolver, events } = createResolver({
    resolveSemanticLocalCommandAction: async (commandText, effectiveText) => {
      events.push(`${commandText}|${effectiveText}`);
      return semanticAction;
    }
  });

  const action = await resolver.resolve(
    "\u041e\u0442\u043a\u0440\u043e\u0439 \u0442\u0435\u0441\u0442 \u0438 \u043f\u043e\u043c\u0435\u043d\u044f\u0439 \u0441\u0442\u0430\u0440\u043e\u0435 \u043d\u0430 \u043d\u043e\u0432\u043e\u0435."
  );

  assert.equal(action, semanticAction);
  assert.deepEqual(events, [
    "\u041e\u0442\u043a\u0440\u043e\u0439 \u0442\u0435\u0441\u0442 \u0438 \u043f\u043e\u043c\u0435\u043d\u044f\u0439 \u0441\u0442\u0430\u0440\u043e\u0435 \u043d\u0430 \u043d\u043e\u0432\u043e\u0435.|" +
      "\u041e\u0442\u043a\u0440\u043e\u0439 \u0442\u0435\u0441\u0442 \u0438 \u043f\u043e\u043c\u0435\u043d\u044f\u0439 \u0441\u0442\u0430\u0440\u043e\u0435 \u043d\u0430 \u043d\u043e\u0432\u043e\u0435."
  ]);
}

{
  const events: string[] = [];
  const { resolver } = createResolver({
    resolveOpenFileCandidate: (query) => {
      events.push(`candidate:${query}`);
      return null;
    },
    resolveSemanticLocalCommandAction: async () => {
      events.push("semantic");
      return null;
    }
  });

  const action = await resolver.resolve(
    "\u041e\u0442\u043a\u0440\u043e\u0439 \u043d\u0435\u044f\u0441\u043d\u044b\u0439 \u0444\u0430\u0439\u043b."
  );

  assert.equal(action, null);
  assert.deepEqual(events, [
    "candidate:\u043d\u0435\u044f\u0441\u043d\u044b\u0439",
    "semantic"
  ]);
}

{
  const { resolver } = createResolver();

  const action = await resolver.resolve(
    "\u043f\u043e\u0438\u0449\u0438 \u0432 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0435 \u0441\u0432\u0435\u0436\u0438\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0438 LLM"
  );

  assert.deepEqual(action, {
    kind: "research-web",
    query:
      "\u0441\u0432\u0435\u0436\u0438\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0438 LLM"
  });
}

console.log("localCommandActionResolver tests passed");
