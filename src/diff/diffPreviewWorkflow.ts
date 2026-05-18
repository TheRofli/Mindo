import type { ActionReceipt, TextDiffPreview } from "../types";
import {
  countOccurrences,
  replaceSelectedOccurrence
} from "./textOccurrence";

export interface DiffHistoryOperationInput {
  operationType: string;
  filePath: string;
  beforeContent: string;
  afterContent: string;
  selectedBefore: string;
  selectedAfter: string;
  model: string;
  userPrompt: string;
}

export interface DiffHistoryOperationResult {
  id: string;
}

export interface ApplyDiffPreviewChangeOptions {
  diffPreview: TextDiffPreview;
  filePath: string;
  model: string;
  readContent: () => Promise<string>;
  writeContent: (content: string) => Promise<void>;
  recordOperation: (
    input: DiffHistoryOperationInput
  ) => Promise<DiffHistoryOperationResult>;
  markOperationApplied: (operationId: string) => Promise<void>;
}

export interface UndoDiffPreviewChangeOptions {
  diffPreview: TextDiffPreview;
  filePath: string;
  readContent: () => Promise<string>;
  writeContent: (content: string) => Promise<void>;
  rollbackOperation: (operationId: string) => Promise<unknown>;
}

export interface DiffPreviewChangeResult {
  receipt: ActionReceipt;
}

export async function applyDiffPreviewChange(
  options: ApplyDiffPreviewChangeOptions
): Promise<DiffPreviewChangeResult> {
  const { diffPreview, filePath } = options;

  if (diffPreview.status !== "pending") {
    throw new Error("Diff preview is not pending.");
  }

  const currentContent = await options.readContent();
  const nextContent = replaceSelectedOccurrence(
    currentContent,
    diffPreview.original,
    diffPreview.suggested,
    diffPreview.originalOccurrenceIndex
  );
  const operation = await options.recordOperation({
    operationType: diffPreview.operationType ?? "improve-selection",
    filePath,
    beforeContent: currentContent,
    afterContent: nextContent,
    selectedBefore: diffPreview.original,
    selectedAfter: diffPreview.suggested,
    model: options.model,
    userPrompt: diffPreview.userPrompt ?? "Improve selection"
  });

  await options.writeContent(nextContent);
  await options.markOperationApplied(operation.id);
  diffPreview.historyOperationId = operation.id;
  diffPreview.status = "applied";

  return {
    receipt: {
      status: "done",
      label: "Applied change",
      detail: `Updated ${filePath} with previewed Markdown replacement.`,
      path: filePath
    }
  };
}

export async function undoDiffPreviewChange(
  options: UndoDiffPreviewChangeOptions
): Promise<DiffPreviewChangeResult> {
  const { diffPreview, filePath } = options;

  if (diffPreview.status !== "applied") {
    throw new Error("Diff preview is not applied.");
  }

  if (diffPreview.historyOperationId) {
    await options.rollbackOperation(diffPreview.historyOperationId);
    diffPreview.status = "reverted";

    return {
      receipt: createRevertedReceipt(filePath)
    };
  }

  const currentContent = await options.readContent();
  const occurrenceCount = countOccurrences(
    currentContent,
    diffPreview.suggested
  );

  if (occurrenceCount === 0) {
    throw new Error(
      "Suggested text was not found in the source note. The note may have changed."
    );
  }

  if (occurrenceCount > 1) {
    throw new Error(
      "Suggested text appears more than once. Undo would be ambiguous."
    );
  }

  await options.writeContent(
    currentContent.replace(diffPreview.suggested, diffPreview.original)
  );
  diffPreview.status = "reverted";

  return {
    receipt: createRevertedReceipt(filePath)
  };
}

function createRevertedReceipt(filePath: string): ActionReceipt {
  return {
    status: "reverted",
    label: "Reverted change",
    detail: `Reverted previewed Markdown replacement in ${filePath}.`,
    path: filePath
  };
}
