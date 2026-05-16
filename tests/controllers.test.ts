import assert from "node:assert/strict";
import { AttachmentController } from "../src/views/controllers/AttachmentController";
import { ChatController } from "../src/views/controllers/ChatController";
import { DiffController } from "../src/views/controllers/DiffController";
import { LiveDialogueController } from "../src/views/controllers/LiveDialogueController";
import { ModelProfileController } from "../src/views/controllers/ModelProfileController";
import { VoiceController } from "../src/views/controllers/VoiceController";
import { DEFAULT_SETTINGS } from "../src/types";
import {
  LIVE_BARGE_IN_VOICE_ACTIVITY,
  createVoiceActivityState,
  reduceVoiceActivity
} from "../src/voice/voiceActivity";

const attachmentController = new AttachmentController({
  maxTextChars: 8,
  maxImageBytes: 1024,
  maxPdfBytes: 1024
});

const textAttachment = await attachmentController.readAttachment(
  new File(["Hello markdown note"], "note.md", { type: "text/markdown" })
);
assert.equal(textAttachment.name, "note.md");
assert.equal(textAttachment.text, "Hello ma");

const pdfAttachment = await attachmentController.readAttachment(
  new File(["<feff005200750062007200690063> Tj"], "rubric.pdf", {
    type: "application/pdf"
  })
);
assert.equal(pdfAttachment.text, "Rubric");

const duplicateClipboardFile = new File(["same"], "same.txt", {
  type: "text/plain"
});
const unnamedClipboardImage = new File(["png"], "", {
  type: "image/png"
});
const extractedClipboardFiles = attachmentController.extractClipboardFiles({
  files: [duplicateClipboardFile],
  items: [
    {
      kind: "file",
      getAsFile: () => duplicateClipboardFile
    },
    {
      kind: "string",
      getAsFile: () => null
    },
    {
      kind: "file",
      getAsFile: () => unnamedClipboardImage
    }
  ]
});
assert.equal(extractedClipboardFiles.length, 2);
assert.equal(extractedClipboardFiles[0].name, "same.txt");
assert.match(extractedClipboardFiles[1].name, /^clipboard-\d+\.png$/);

const preparedAttachments = await attachmentController.prepareAttachedFiles(
  [new File(["one"], "one.txt", { type: "text/plain" })],
  Array.from({ length: 8 }, (_, index) => ({
    name: `old-${index}.txt`,
    type: "text/plain",
    size: 1,
    text: "old"
  }))
);
assert.equal(preparedAttachments.newAttachments.length, 1);
assert.equal(preparedAttachments.attachedFiles.length, 8);
assert.equal(preparedAttachments.attachedFiles.at(-1)?.name, "one.txt");

const chatController = new ChatController();
const userMessage = chatController.createUserMessage("  hello  ", 3, [
  textAttachment
]);
assert.equal(userMessage.role, "user");
assert.equal(userMessage.content, "  hello  ");
assert.equal(userMessage.attachments?.[0].name, "note.md");

const receiptMessages = chatController.createActionReceiptMessages(
  { status: "done", label: "Opened note", path: "Test/Test.md" },
  10,
  "Open test"
);
assert.equal(receiptMessages.length, 2);
assert.equal(receiptMessages[0].role, "user");
assert.equal(receiptMessages[1].role, "assistant");
assert.equal(receiptMessages[1].actionReceipt?.path, "Test/Test.md");

const diffController = new DiffController();
assert.equal(diffController.hasUsableSelection(null), false);
assert.equal(
  diffController.hasUsableSelection({
    path: "Test/Test.md",
    name: "Test",
    text: "Selected",
    isTruncated: false,
    originalLength: 8,
    includedLength: 8
  }),
  true
);

const liveDialogueController = new LiveDialogueController();
assert.equal(liveDialogueController.shouldInterruptSpeech(true, true), true);
assert.equal(liveDialogueController.shouldInterruptSpeech(false, true), false);
assert.equal(
  liveDialogueController.shouldKeepBargeInAudioMonitor(true, true),
  true
);
assert.equal(
  liveDialogueController.shouldKeepBargeInAudioMonitor(false, true),
  false
);
assert.equal(
  liveDialogueController.shouldKeepBargeInAudioMonitor(true, false),
  false
);
let bargeInActivity = createVoiceActivityState();
bargeInActivity = reduceVoiceActivity(bargeInActivity, {
  type: "level",
  now: 1000,
  level: 0.4,
  ...LIVE_BARGE_IN_VOICE_ACTIVITY
});
bargeInActivity = reduceVoiceActivity(bargeInActivity, {
  type: "level",
  now: 1060,
  level: 0.42,
  ...LIVE_BARGE_IN_VOICE_ACTIVITY
});
bargeInActivity = reduceVoiceActivity(bargeInActivity, {
  type: "level",
  now: 1160,
  level: 0.43,
  ...LIVE_BARGE_IN_VOICE_ACTIVITY
});
assert.equal(
  liveDialogueController.shouldInterruptFromAudio(
    {
      isLiveDialogueActive: true,
      isAssistantBusy: true,
      isRecording: false,
      isTranscribingVoice: false,
      isAlreadyHandling: false,
      now: 2000,
      lastHandledAt: 0
    },
    bargeInActivity
  ),
  true
);
assert.equal(
  liveDialogueController.shouldInterruptFromAudio(
    {
      isLiveDialogueActive: true,
      isAssistantBusy: true,
      isRecording: true,
      isTranscribingVoice: false,
      isAlreadyHandling: false,
      now: 2000,
      lastHandledAt: 0
    },
    bargeInActivity
  ),
  false
);
assert.equal(
  liveDialogueController.shouldInterruptFromAudio(
    {
      isLiveDialogueActive: true,
      isAssistantBusy: true,
      isRecording: false,
      isTranscribingVoice: false,
      isAlreadyHandling: false,
      now: 2400,
      lastHandledAt: 2000
    },
    bargeInActivity
  ),
  false
);
assert.deepEqual(
  liveDialogueController.resolveBargeInTranscript({
    transcript: "  wait open another note  ",
    assistantText: "I am still answering the previous question.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: false,
    isAlreadyHandling: false,
    now: 3000,
    lastHandledAt: 0
  }),
  {
    kind: "prompt",
    prompt: "wait open another note"
  }
);
assert.deepEqual(
  liveDialogueController.resolveBargeInTranscript({
    transcript: "stop",
    assistantText: "I am still answering the previous question.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: false,
    isAlreadyHandling: false,
    now: 3000,
    lastHandledAt: 0
  }),
  {
    kind: "stop",
    prompt: "stop"
  }
);
assert.deepEqual(
  liveDialogueController.resolveBargeInTranscript({
    transcript: "wait open another note",
    assistantText: "I am still answering the previous question.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: false,
    isAlreadyHandling: true,
    now: 3000,
    lastHandledAt: 0
  }),
  {
    kind: "ignore",
    prompt: ""
  }
);

const modelProfileController = new ModelProfileController();
const activeProfile = modelProfileController.getActive(DEFAULT_SETTINGS);
const appliedSettings = modelProfileController.apply(DEFAULT_SETTINGS, {
  ...activeProfile,
  id: "test-profile",
  name: "Test Profile",
  model: "test-model",
  baseUrl: "http://127.0.0.1:1234/v1",
  apiKey: "secret",
  temperature: 0.25,
  supportsVision: true
});
assert.equal(appliedSettings.model, "test-model");
assert.equal(appliedSettings.temperature, 0.25);
assert.equal(appliedSettings.activeModelProfileId, "test-profile");

const voiceController = new VoiceController();
assert.equal(voiceController.formatElapsedTime(1_000, 1_000), "0:00");
assert.equal(voiceController.formatElapsedTime(1_000, 66_000), "1:05");

console.log("controllers tests passed");
