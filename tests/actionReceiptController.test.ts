import assert from "node:assert/strict";
import { ActionReceiptController } from "../src/views/controllers/ActionReceiptController";
import type {
  ActionReceipt,
  ChatMessage,
  LlmFileAttachment
} from "../src/types";
import type { WikiMemoryRecordInput } from "../src/wiki/wikiMemoryController";

const messages: ChatMessage[] = [
  {
    id: "assistant-1",
    role: "assistant",
    content: "Opened Obsidian/Foo.md",
    createdAt: 1
  }
];
const rendered: number[] = [];
const wikiRecords: WikiMemoryRecordInput[] = [];

const controller = new ActionReceiptController({
  getMessages: () => messages,
  appendMessages: (...nextMessages) => messages.push(...nextMessages),
  createActionReceiptMessages: (
    receipt: ActionReceipt,
    messageCount: number,
    userContent?: string,
    userAttachments?: LlmFileAttachment[] | null
  ) => [
    ...(userContent
      ? [
          {
            id: `user-${messageCount}`,
            role: "user" as const,
            content: userContent,
            createdAt: 2,
            attachments: userAttachments ?? undefined
          }
        ]
      : []),
    {
      id: `receipt-${messageCount}`,
      role: "assistant" as const,
      content: receipt.label,
      createdAt: 3,
      actionReceipt: receipt
    }
  ],
  getSuppressActionReceiptUserContent: () => false,
  renderMessages: () => {
    rendered.push(messages.length);
  },
  recordWikiAutopilotMemory: async (input) => {
    wikiRecords.push(input);
  },
  getMarkdownFiles: () => [
    { path: "Obsidian/Foo.md" },
    { path: "Test/Test.md" }
  ],
  findMarkdownPathsInText: (text, files) =>
    files
      .filter((file) => text.includes(file.path))
      .map((file) => file.path)
});

controller.appendActionReceipt(
  {
    status: "opened",
    label: "Opened note",
    detail: "Obsidian/Foo.md",
    path: "Obsidian/Foo.md"
  },
  "open foo",
  [{ name: "a.png", type: "image/png", size: 10 }]
);

assert.equal(messages.length, 3);
assert.equal(messages[1].role, "user");
assert.equal(messages[1].attachments?.[0]?.name, "a.png");
assert.equal(messages[2].actionReceipt?.status, "opened");
assert.equal(rendered.length, 1);
assert.equal(wikiRecords.length, 1);
assert.equal(wikiRecords[0].userText, "open foo");
assert.deepEqual(wikiRecords[0].sourcePaths, ["Obsidian/Foo.md"]);

assert.deepEqual(controller.findLastMentionedMarkdownPaths(), [
  "Obsidian/Foo.md"
]);

console.log("actionReceiptController tests passed");
