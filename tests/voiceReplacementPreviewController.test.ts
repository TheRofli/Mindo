import assert from "node:assert/strict";
import { VoiceReplacementPreviewController } from "../src/views/controllers/VoiceReplacementPreviewController";
import type {
  ChatMessage,
  SelectedTextContext
} from "../src/types";
import type { VoiceTextReplacement } from "../src/views/sidebarTypes";

interface FakeFile {
  path: string;
}

const file: FakeFile = { path: "Test/Test.md" };
const messages: ChatMessage[] = [];
const statuses: string[] = [];
const errors: (string | null)[] = [];
const inlineDiffs: string[] = [];
let renderCount = 0;
let id = 0;
let selectedContext:
  | { context: SelectedTextContext; warning: null }
  | { context: null; warning: string | null } = {
  context: null,
  warning: "No selected text"
};
let activeNote: { file: FakeFile; content: string } | null = {
  file,
  content: "Alpha old-one Omega\nBeta stays"
};
let selectedFileContent = "Before selected old text after";

const controller = new VoiceReplacementPreviewController<FakeFile>({
  getMessages: () => messages,
  appendMessages: (...nextMessages) => messages.push(...nextMessages),
  readSelectedTextContextForVoice: () => selectedContext,
  readActiveMarkdownNote: async () => activeNote,
  getMarkdownFile: (path) => (path === file.path ? file : null),
  readFile: async () => selectedFileContent,
  setError: (error) => errors.push(error),
  setStatus: (status) => statuses.push(status),
  showInlineDiffForMessage: async (messageId) => {
    inlineDiffs.push(messageId);
  },
  renderMessages: () => {
    renderCount += 1;
  },
  createMessageId: () => `message-${++id}`,
  now: () => 1234
});

await controller.previewVoiceTextReplacement("Replace old one", {
  original: "old one",
  suggested: "new one"
});

assert.equal(messages.length, 2);
assert.equal(messages[0].role, "user");
assert.equal(messages[1].role, "assistant");
assert.equal(messages[1].diffPreview?.title, "Voice text replacement preview");
assert.equal(messages[1].diffPreview?.sourcePath, file.path);
assert.equal(messages[1].diffPreview?.original, "old-one");
assert.equal(messages[1].diffPreview?.suggested, "new one");
assert.equal(messages[1].diffPreview?.status, "pending");
assert.equal(statuses.at(-1), "Status: Preview ready");
assert.deepEqual(errors.at(-1), null);
assert.equal(inlineDiffs.at(-1), "message-2");
assert.equal(renderCount, 1);

selectedContext = {
  context: {
    path: file.path,
    name: "Test",
    text: "selected old text",
    isTruncated: false,
    originalLength: 17,
    includedLength: 17
  },
  warning: null
};

await controller.previewVoiceReplacement(
  "Replace selection",
  "```markdown\nselected new text\n```"
);

assert.equal(messages.at(-1)?.diffPreview?.title, "Voice replacement preview");
assert.equal(messages.at(-1)?.diffPreview?.original, "selected old text");
assert.equal(messages.at(-1)?.diffPreview?.suggested, "selected new text");

selectedContext = { context: null, warning: "No selected text" };
activeNote = { file, content: "# Title\nOnly meaningful line" };
await controller.previewVoiceReplacementOrCurrentNoteLine(
  "Replace current line",
  "Better line"
);

assert.equal(
  messages.at(-1)?.diffPreview?.original,
  "Only meaningful line"
);
assert.equal(messages.at(-1)?.diffPreview?.suggested, "Better line");

activeNote = { file, content: "A old one. B old two." };
const replacements: VoiceTextReplacement[] = [
  { original: "old one", suggested: "new one" },
  { original: "old two", suggested: "new two" }
];

await controller.previewVoiceMultiTextReplacement(
  "Replace both",
  replacements
);

assert.equal(messages.at(-1)?.diffPreview?.title, "Voice multi-replacement preview");
assert.equal(messages.at(-1)?.diffPreview?.original, "A old one. B old two.");
assert.equal(messages.at(-1)?.diffPreview?.suggested, "A new one. B new two.");

console.log("voiceReplacementPreviewController tests passed");
