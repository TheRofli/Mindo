import assert from "node:assert/strict";
import {
  buildLiveDialogueAcknowledgement,
  buildLiveDialogueActionSpeech,
  buildLiveDialogueSystemInstruction,
  createLiveDialogueGreeting,
  shouldAcceptLiveBargeInTranscript
} from "../src/voice/liveDialogue";

assert.equal(createLiveDialogueGreeting(), "Привет, я слушаю. Чем помочь?");

const instruction = buildLiveDialogueSystemInstruction();
assert.ok(instruction.includes("Live Dialogue mode"));
assert.ok(instruction.includes("summarize the note instead of reading it verbatim"));
assert.ok(instruction.includes("Keep normal replies under 45 words"));
assert.ok(instruction.includes("Never read a whole note aloud"));
assert.ok(instruction.includes("ask one brief useful follow-up question"));
assert.ok(instruction.includes("prefer doing the action through tools/local actions"));
assert.ok(instruction.includes("If the user interrupts"));
assert.ok(instruction.includes("If current note context is provided"));
assert.ok(instruction.includes("do not say you lack access"));

assert.equal(buildLiveDialogueAcknowledgement("thinking"), "Секунду.");
assert.equal(buildLiveDialogueAcknowledgement("opening"), "Открываю.");
assert.equal(buildLiveDialogueAcknowledgement("editing"), "Сейчас поменяю.");
assert.equal(buildLiveDialogueAcknowledgement("researching"), "Посмотрю свежие данные.");

assert.equal(shouldAcceptLiveBargeInTranscript(""), false);
assert.equal(shouldAcceptLiveBargeInTranscript("а"), false);
assert.equal(shouldAcceptLiveBargeInTranscript("подожди, открой тест"), true);

assert.equal(
  buildLiveDialogueActionSpeech({
    status: "done",
    label: "Opened note",
    path: "Test/Test.md"
  }),
  "Открыл файл Test/Test.md. Что дальше?"
);

assert.equal(
  buildLiveDialogueActionSpeech({
    status: "failed",
    label: "Action not resolved"
  }),
  "Не смог безопасно выполнить это действие. Уточни файл, папку или текст, и я попробую ещё раз."
);

console.log("liveDialogue tests passed");
