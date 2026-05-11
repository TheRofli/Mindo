import assert from "node:assert/strict";
import {
  buildLiveTranscriptValue,
  shouldUseFinalTranscription
} from "../src/voice/liveTranscript";
import {
  getActionText,
  getUiText,
  sanitizeUiLanguage
} from "../src/i18n";

const languages = ["en", "ru", "bad"];
const actions = [
  "explain-note",
  "summarize-note",
  "create-roadmap",
  "extract-tasks"
];
const prefixes = ["", "Открой", "Создай", "Поменяй", "Прочитай"];
const finals = ["тест", "файл", "заметку", "голосовой режим", "local LLM"];
const interims = ["", " сейчас", " пожалуйста", " в папке Obsidian"];

let checked = 0;

for (let index = 0; index < 200000; index += 1) {
  const language = sanitizeUiLanguage(languages[index % languages.length]);
  const action = actions[index % actions.length];
  const prefix = prefixes[index % prefixes.length];
  const finalText = finals[index % finals.length];
  const interim = interims[index % interims.length];
  const text = buildLiveTranscriptValue(prefix, interim, finalText);

  assert.ok(getUiText(language, "composerPlaceholder").length > 10);
  assert.ok(getActionText(language, action).label.length > 1);
  assert.ok(text.includes(finalText));
  assert.equal(shouldUseFinalTranscription(text, text), false);
  checked += 1;
}

assert.equal(checked, 200000);
console.log("megaPolishScenarios tests passed: 200000 checks");
