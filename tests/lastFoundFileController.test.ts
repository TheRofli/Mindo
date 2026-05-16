import assert from "node:assert/strict";

import {
  LastFoundFileController,
  type LastFoundFileControllerDeps,
  type MarkdownFileLike
} from "../src/views/controllers/LastFoundFileController";
import type {
  ActionReceipt,
  CurrentNoteContext,
  LlmRequestContext,
  VaultSearchResult
} from "../src/types";
import type { VoiceSessionMemory } from "../src/views/sidebarTypes";

function createDeps(
  overrides: Partial<LastFoundFileControllerDeps<MarkdownFileLike>> = {}
) {
  const memory: VoiceSessionMemory = {
    lastFoundFiles: [
      {
        path: "Test/Test.md",
        title: "Test",
        score: 10,
        snippet: "test"
      }
    ]
  };
  const files = new Map<string, { file: MarkdownFileLike; content: string }>([
    [
      "Test/Test.md",
      {
        file: {
          path: "Test/Test.md",
          basename: "Test",
          extension: "md"
        },
        content: "Hello from test"
      }
    ],
    [
      "Obsidian/Idea.md",
      {
        file: {
          path: "Obsidian/Idea.md",
          basename: "Idea",
          extension: "md"
        },
        content: "Idea content"
      }
    ]
  ]);
  const opened: string[] = [];
  const statuses: string[] = [];
  const errors: Array<string | null> = [];
  const receipts: Array<{ receipt: ActionReceipt; userContent?: string }> = [];
  const sent: Array<{ text: string; context: LlmRequestContext; save: boolean }> =
    [];
  const attached: VaultSearchResult[][] = [];

  const deps: LastFoundFileControllerDeps<MarkdownFileLike> = {
    memory,
    findLastMentionedMarkdownPaths: () => [],
    openVaultPath: async (path) => {
      opened.push(path);
    },
    appendActionReceipt: (receipt, userContent) => {
      receipts.push({ receipt, userContent });
    },
    sendMessage: async (text, context, save) => {
      sent.push({ text, context, save });
    },
    attachVaultResults: (results) => {
      attached.push(results);
    },
    getMarkdownFile: (path) => files.get(path)?.file ?? null,
    readFile: async (file) => files.get(file.path)?.content ?? "",
    setError: (error) => {
      errors.push(error);
    },
    setStatus: (status) => {
      statuses.push(status);
    },
    now: () => 123,
    maxContextChars: 8,
    ...overrides
  };

  return {
    controller: new LastFoundFileController(deps),
    deps,
    memory,
    opened,
    statuses,
    errors,
    receipts,
    sent,
    attached
  };
}

{
  const { controller, opened, receipts, memory } = createDeps({
    findLastMentionedMarkdownPaths: () => ["Obsidian/Idea.md"]
  });

  await controller.openLastFoundFile("open it");

  assert.deepEqual(opened, ["Obsidian/Idea.md"]);
  assert.equal(memory.lastOpenedFile, "Obsidian/Idea.md");
  assert.equal(memory.activeFolder, "Obsidian");
  assert.equal(receipts[0].receipt.status, "opened");
  assert.equal(receipts[0].receipt.path, "Obsidian/Idea.md");
  assert.equal(receipts[0].userContent, "open it");
}

{
  const { controller, sent, memory } = createDeps();

  await controller.answerFromLastFoundFile("what is inside?");

  assert.equal(sent.length, 1);
  assert.equal(sent[0].text, "what is inside?");
  assert.equal(sent[0].save, false);
  assert.equal(sent[0].context.currentNote?.path, "Test/Test.md");
  assert.equal(sent[0].context.currentNote?.content, "Hello fr");
  assert.equal(sent[0].context.currentNote?.isTruncated, true);
  assert.equal(memory.lastOpenedFile, "Test/Test.md");
}

{
  const { controller, attached, receipts, statuses } = createDeps();

  controller.attachLastFoundFiles();

  assert.equal(attached[0][0].path, "Test/Test.md");
  assert.equal(receipts[0].receipt.label, "Attached search context");
  assert.equal(statuses.at(-1), "Status: Search context attached");
}

{
  const memory: VoiceSessionMemory = {
    lastFoundFiles: []
  };
  const { controller, errors, statuses } = createDeps({ memory });

  await controller.openLastFoundFile("open last");
  assert.match(errors.at(-1) ?? "", /No remembered/);
  assert.equal(statuses.at(-1), "Status: No remembered file");
}

{
  const { controller } = createDeps();

  const context = (await controller.readMarkdownFileContext(
    "Test/Test.md"
  )) as CurrentNoteContext;

  assert.equal(context.path, "Test/Test.md");
  assert.equal(context.name, "Test");
  assert.equal(context.originalLength, "Hello from test".length);
  assert.equal(context.includedLength, 8);
}

console.log("lastFoundFileController tests passed");
