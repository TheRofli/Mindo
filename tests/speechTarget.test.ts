import assert from "node:assert/strict";
import {
  findLatestAssistantSpeechMessage,
  findLatestSpeechTargetFromMessages
} from "../src/voice/speechTarget";

const target = findLatestAssistantSpeechMessage([
  { role: "assistant", content: "first", createdAt: 1 },
  { role: "user", content: "read", createdAt: 2 },
  { role: "assistant", content: "latest", createdAt: 3 }
]);

assert.equal(target?.content, "latest");

const diffTarget = await findLatestSpeechTargetFromMessages([
  {
    id: "u1",
    role: "user",
    content: "улучши",
    createdAt: 1
  },
  {
    id: "a1",
    role: "assistant",
    content: "",
    createdAt: 2,
    diffPreview: {
      title: "Improve selection preview",
      sourcePath: "Test/Test.md",
      original: "Я гений",
      suggested: "Я человек",
      status: "pending"
    }
  }
]);

assert.deepEqual(diffTarget, {
  id: "a1-diff-speech",
  content: "Я человек"
});

const fileTarget = await findLatestSpeechTargetFromMessages(
  [
    {
      id: "a2",
      role: "assistant",
      content: "",
      createdAt: 3,
      actionReceipt: {
        status: "saved",
        label: "Created note",
        path: "Obisidian/Voice Flow.md"
      }
    }
  ],
  async (path) => ({
    path,
    content: "# Voice Flow\n\nShort readable file."
  })
);

assert.deepEqual(fileTarget, {
  id: "a2-file-speech",
  content: "# Voice Flow\n\nShort readable file."
});

const ignoredReceipt = await findLatestSpeechTargetFromMessages([
  {
    id: "a3",
    role: "assistant",
    content: "Reading latest answer",
    createdAt: 4,
    actionReceipt: {
      status: "done",
      label: "Reading latest answer"
    }
  }
]);

assert.equal(ignoredReceipt, null);

console.log("speechTarget tests passed");
