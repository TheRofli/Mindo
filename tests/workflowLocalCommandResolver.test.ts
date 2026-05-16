import assert from "node:assert/strict";

import type { WorkflowRoute } from "../src/workflows";
import {
  resolveWorkflowCreateTarget,
  workflowRouteToLocalCommandAction
} from "../src/views/workflowLocalCommandResolver";

const baseRoute: WorkflowRoute = {
  id: "route-1",
  intent: "vault_action",
  confidence: 1,
  reason: "test",
  source: "chat",
  userText: "open Test",
  effectiveText: "open Test",
  uiLanguage: "en",
  actions: [],
  statusSteps: [],
  needsWeb: false,
  needsModel: false
};

{
  const action = workflowRouteToLocalCommandAction({
    route: {
      ...baseRoute,
      intent: "note_creation",
      effectiveText: "create note about LiveCollab",
      actions: [
        {
          id: "create-1",
          kind: "create_note",
          title: "LiveCollab",
          folderHint: "Projects",
          contentPrompt: "Create note"
        }
      ]
    },
    originalText: "создай заметку",
    findLatestAppliedDiffMessageId: () => null
  });

  assert.deepEqual(action, {
    kind: "create-note",
    commandText: "create note about LiveCollab",
    displayText: "создай заметку"
  });
}

{
  const action = workflowRouteToLocalCommandAction({
    route: {
      ...baseRoute,
      intent: "safe_edit",
      effectiveText: "open Test and replace old with new",
      actions: [
        {
          id: "open-1",
          kind: "open_note",
          query: "Test",
          candidatePath: "Test/Test.md"
        },
        {
          id: "replace-1",
          kind: "replace_text",
          replacements: [
            {
              original: "old",
              suggested: "new"
            }
          ]
        }
      ]
    },
    originalText: "открой тест и поменяй old на new",
    findLatestAppliedDiffMessageId: () => null
  });

  assert.deepEqual(action, {
    kind: "action-plan",
    commandText: "открой тест и поменяй old на new",
    actions: [
      {
        kind: "open-file",
        commandText: "открой тест и поменяй old на new",
        query: "Test/Test.md"
      },
      {
        kind: "replace-text",
        commandText: "открой тест и поменяй old на new",
        replacement: {
          original: "old",
          suggested: "new"
        }
      }
    ]
  });
}

{
  const action = workflowRouteToLocalCommandAction({
    route: {
      ...baseRoute,
      intent: "safe_edit",
      effectiveText: "undo",
      actions: [
        {
          id: "undo-1",
          kind: "undo_change"
        }
      ]
    },
    originalText: "откати",
    findLatestAppliedDiffMessageId: () => "message-1"
  });

  assert.deepEqual(action, {
    kind: "undo-diff",
    messageId: "message-1"
  });
}

{
  const action = workflowRouteToLocalCommandAction({
    route: {
      ...baseRoute,
      intent: "safe_edit",
      effectiveText: "undo",
      actions: [
        {
          id: "undo-1",
          kind: "undo_change"
        }
      ]
    },
    originalText: "откати",
    findLatestAppliedDiffMessageId: () => null
  });

  assert.equal(action, null);
}

{
  const target = resolveWorkflowCreateTarget({
    route: {
      ...baseRoute,
      intent: "note_creation",
      title: "Voice Flow.md",
      folderHint: "Obsidian",
      actions: [
        {
          id: "create-1",
          kind: "create_note",
          title: "Voice Flow.md",
          folderHint: "Obsidian",
          contentPrompt: "Create note"
        }
      ]
    },
    commandText: "создай файл про voice flow",
    activePath: "Test/Test.md",
    resolveVaultFolderPath: (folder) =>
      folder.toLowerCase() === "obsidian" ? "Obisidian" : null,
    resolveCreateNoteTargetFolder: () => "Test",
    inferCreateNoteTitleFromCommand: () => "Fallback",
    inferResearchNoteTitle: () => "Research Fallback",
    sanitizeCreateNoteFilename: (filename) => filename ?? "Fallback.md"
  });

  assert.deepEqual(target, {
    title: "Voice Flow",
    targetFolder: "Obisidian"
  });
}

console.log("workflowLocalCommandResolver tests passed");
