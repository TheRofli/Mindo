import assert from "node:assert/strict";

import {
  applyDiffPreviewChange,
  undoDiffPreviewChange
} from "../src/diff/diffPreviewWorkflow";
import type { TextDiffPreview } from "../src/types";

function createPreview(
  overrides: Partial<TextDiffPreview> = {}
): TextDiffPreview {
  return {
    title: "Improve selection preview",
    sourcePath: "Test/Test.md",
    original: "old",
    suggested: "new",
    status: "pending",
    userPrompt: "Improve selection",
    ...overrides
  };
}

{
  const preview = createPreview();
  let written = "";
  let markedId = "";
  const result = await applyDiffPreviewChange({
    diffPreview: preview,
    filePath: "Test/Test.md",
    model: "test-model",
    readContent: async () => "hello old world",
    writeContent: async (content) => {
      written = content;
    },
    recordOperation: async (input) => {
      assert.equal(input.beforeContent, "hello old world");
      assert.equal(input.afterContent, "hello new world");
      assert.equal(input.filePath, "Test/Test.md");
      assert.equal(input.model, "test-model");
      return { id: "op1" };
    },
    markOperationApplied: async (id) => {
      markedId = id;
    }
  });

  assert.equal(written, "hello new world");
  assert.equal(markedId, "op1");
  assert.equal(preview.status, "applied");
  assert.equal(preview.historyOperationId, "op1");
  assert.deepEqual(result.receipt, {
    status: "done",
    label: "Applied change",
    detail: "Updated Test/Test.md with previewed Markdown replacement.",
    path: "Test/Test.md"
  });
}

{
  const preview = createPreview({
    status: "applied",
    historyOperationId: "op1"
  });
  let rolledBackId = "";
  const result = await undoDiffPreviewChange({
    diffPreview: preview,
    filePath: "Test/Test.md",
    readContent: async () => {
      throw new Error("history rollback should not read content");
    },
    writeContent: async () => {
      throw new Error("history rollback should not write content");
    },
    rollbackOperation: async (id) => {
      rolledBackId = id;
    }
  });

  assert.equal(rolledBackId, "op1");
  assert.equal(preview.status, "reverted");
  assert.equal(result.receipt.status, "reverted");
  assert.equal(
    result.receipt.detail,
    "Reverted previewed Markdown replacement in Test/Test.md."
  );
  assert.equal(result.receipt.path, "Test/Test.md");
}

{
  const preview = createPreview({
    status: "applied"
  });
  let written = "";
  const result = await undoDiffPreviewChange({
    diffPreview: preview,
    filePath: "Test/Test.md",
    readContent: async () => "hello new world",
    writeContent: async (content) => {
      written = content;
    },
    rollbackOperation: async () => {
      throw new Error("rollback should not run without history id");
    }
  });

  assert.equal(written, "hello old world");
  assert.equal(preview.status, "reverted");
  assert.equal(result.receipt.label, "Reverted change");
  assert.equal(
    result.receipt.detail,
    "Reverted previewed Markdown replacement in Test/Test.md."
  );
}

{
  const preview = createPreview({
    status: "applied"
  });

  await assert.rejects(
    () =>
      undoDiffPreviewChange({
        diffPreview: preview,
        filePath: "Test/Test.md",
        readContent: async () => "new and new",
        writeContent: async () => {
          throw new Error("should not write ambiguous undo");
        },
        rollbackOperation: async () => {
          throw new Error("should not rollback");
        }
      }),
    /Suggested text appears more than once/
  );
}

console.log("diffPreviewWorkflow tests passed");
