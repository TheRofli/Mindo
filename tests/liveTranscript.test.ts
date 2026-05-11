import assert from "node:assert/strict";
import {
  buildLiveTranscriptValue,
  getSpeechRecognitionLanguage,
  shouldUseFinalTranscription
} from "../src/voice/liveTranscript";

assert.equal(getSpeechRecognitionLanguage("ru"), "ru-RU");
assert.equal(getSpeechRecognitionLanguage("en"), "en-US");
assert.equal(getSpeechRecognitionLanguage("auto"), "ru-RU");

assert.equal(
  buildLiveTranscriptValue("Поменяй", " этот текст", "исправь"),
  "Поменяй исправь"
);
assert.equal(buildLiveTranscriptValue("", "", "Открой тест"), "Открой тест");
assert.equal(shouldUseFinalTranscription("Я гений", "Я-гений"), true);
assert.equal(shouldUseFinalTranscription("Я гений", ""), true);
assert.equal(shouldUseFinalTranscription("Я гений", "Я гений"), false);

console.log("liveTranscript tests passed");
