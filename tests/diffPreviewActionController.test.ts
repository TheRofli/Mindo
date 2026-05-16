import assert from "node:assert/strict";
import { DiffPreviewActionController } from "../src/views/controllers/DiffPreviewActionController";
import type { ActionReceipt, ChatMessage } from "../src/types";

interface FakeFile {
  path: string;
}

const file: FakeFile = { path: "Test/Test.md" };
let content = "Alpha old text Omega";
const receipts: ActionReceipt[] = [];
const statuses: string[] = [];
const errors: (string | null)[] = [];
const loadingStates: boolean[] = [];
const rendered: string[] = [];
const notices: string[] = [];
let activeRefineMessageId: string | null = null;

const messages: ChatMessage[] = [
  {
    id: "diff-1",
    role: "assistant",
    content: "Preview",
    createdAt: 1,
    diffPreview: {
      title: "Improve preview",
      sourcePath: file.path,
      original: "old text",
      suggested: "new text",
      status: "pending",
      userPrompt: "Improve"
    }
  }
];

const controller = new DiffPreviewActionController<FakeFile>({
  getMessages: () => messages,
  getModel: () => "test-model",
  getFile: (path) => (path === file.path ? file : null),
  readFile: async () => content,
  writeFile: async (_file, nextContent) => {
    content = nextContent;
  },
  assertWritablePath: () => undefined,
  recordOperation: async () => ({ id: "operation-1" }),
  markOperationApplied: async () => undefined,
  rollbackOperation: async () => undefined,
  requestCompletion: async () => "refined text",
  cleanReplacement: (value) => value.trim(),
  clearInlineDiff: () => undefined,
  showInlineDiff: async () => true,
  getActiveRefineMessageId: () => activeRefineMessageId,
  setActiveRefineMessageId: (messageId) => {
    activeRefineMessageId = messageId;
  },
  setError: (message) => errors.push(message),
  setLoading: (loading) => loadingStates.push(loading),
  setStatus: (status) => statuses.push(status),
  appendActionReceipt: (receipt) => receipts.push(receipt),
  setContextDetail: () => undefined,
  renderMessages: () => {
    rendered.push("rendered");
  },
  notify: (message) => notices.push(message),
  getErrorMessage: (error) =>
    error instanceof Error ? error.message : String(error)
});

assert.equal(controller.findLatestDiffMessage("pending")?.id, "diff-1");
await controller.applyDiffPreview("diff-1");
assert.equal(content, "Alpha new text Omega");
assert.equal(messages[0].diffPreview?.status, "applied");
assert.equal(messages[0].diffPreview?.historyOperationId, "operation-1");
assert.equal(receipts.at(-1)?.label, "Applied change");
assert.deepEqual(loadingStates.slice(-2), [true, false]);
assert.equal(statuses.at(-1), "Status: Applied");
assert.equal(notices.at(-1), "Mindo applied the suggested replacement.");

await controller.undoDiffPreview("diff-1");
assert.equal(messages[0].diffPreview?.status, "reverted");
assert.equal(receipts.at(-1)?.label, "Reverted change");

messages[0].diffPreview = {
  title: "Improve preview",
  sourcePath: file.path,
  original: "old text",
  suggested: "new text",
  status: "pending"
};
controller.handleInlineDiffAction({ messageId: "diff-1", action: "change" });
assert.equal(activeRefineMessageId, "diff-1");
controller.handleInlineDiffAction({ messageId: "diff-1", action: "reject" });
assert.equal(messages[0].diffPreview.status, "rejected");
assert.equal(receipts.at(-1)?.status, "rejected");

console.log("diffPreviewActionController tests passed");
