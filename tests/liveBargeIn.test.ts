import assert from "node:assert/strict";
import {
  isLiveStopOnlyCommand,
  shouldAcceptLiveBargeInTranscript,
  shouldHandleLiveBargeIn,
  shouldRejectAssistantEcho
} from "../src/voice/liveDialogue";

assert.equal(shouldAcceptLiveBargeInTranscript("нет"), true);
assert.equal(shouldAcceptLiveBargeInTranscript("стоп"), true);
assert.equal(shouldAcceptLiveBargeInTranscript("wait"), true);
assert.equal(isLiveStopOnlyCommand("\u0441\u0442\u043e\u043f"), true);
assert.equal(
  isLiveStopOnlyCommand("\u0441\u0442\u043e\u043f \u043f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430"),
  true
);
assert.equal(isLiveStopOnlyCommand("нет, подожди"), true);
assert.equal(isLiveStopOnlyCommand("подожди открой тест"), false);

assert.equal(
  shouldRejectAssistantEcho(
    "Открой тест в папке Test",
    "Я открыла файл LLM Engineering в папке Proton."
  ),
  false
);

assert.equal(
  shouldRejectAssistantEcho(
    "Я открыла файл LLM Engineering в папке Proton",
    "Я открыла файл LLM Engineering в папке Proton. Что дальше?"
  ),
  true
);

assert.equal(
  shouldHandleLiveBargeIn({
    transcript: "подожди открой другой файл",
    assistantText: "Я рассказываю длинный ответ про текущую заметку.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: false,
    now: 3000,
    lastHandledAt: 0
  }),
  true
);

assert.equal(
  shouldHandleLiveBargeIn({
    transcript: "Я рассказываю длинный ответ про текущую заметку",
    assistantText: "Я рассказываю длинный ответ про текущую заметку.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: false,
    now: 3000,
    lastHandledAt: 0
  }),
  false
);

assert.equal(
  shouldHandleLiveBargeIn({
    transcript: "wait open test",
    assistantText: "I am answering a previous question.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: false,
    now: 3000,
    lastHandledAt: 2600
  }),
  false
);

assert.equal(
  shouldHandleLiveBargeIn({
    transcript: "wait open test",
    assistantText: "I am answering a previous question.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: true,
    now: 3000,
    lastHandledAt: 0
  }),
  false
);

assert.equal(
  shouldHandleLiveBargeIn({
    transcript: "\u0441\u0442\u043e\u043f",
    assistantText: "\u042f \u0441\u0435\u0439\u0447\u0430\u0441 \u0434\u043e\u043b\u0433\u043e \u043e\u0442\u0432\u0435\u0447\u0430\u044e.",
    isLiveDialogueActive: true,
    isAssistantBusy: true,
    isRecording: false,
    now: 5000,
    lastHandledAt: 0
  }),
  true
);

console.log("liveBargeIn tests passed");
