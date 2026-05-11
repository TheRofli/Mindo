import assert from "node:assert/strict";
import {
  getSpeechText,
  guessSpeechLanguage,
  isMostlyEnglishSpeech,
  prepareSileroSpeechText,
  stripHiddenTtsHints
} from "../src/voice/speechText";

assert.equal(
  getSpeechText(
    "# Voice Flow\n\nLoopLM<!-- contex-tts: \u043b\u0443\u043f \u044d\u043b \u044d\u043c --> works.",
    "full"
  ),
  "\u043b\u0443\u043f \u044d\u043b \u044d\u043c works."
);

assert.equal(
  stripHiddenTtsHints(
    "Markdown<!-- contex-tts: \u043c\u0430\u0440\u043a\u0434\u0430\u0443\u043d --> stays visible."
  ),
  "Markdown stays visible."
);

assert.equal(
  prepareSileroSpeechText(
    "Contex \u0438 LoopLM \u0440\u0430\u0431\u043e\u0442\u0430\u044e\u0442 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e.",
    {
      contex: "\u043a\u043e\u043d\u0442\u0435\u043a\u0441",
      looplm: "\u043b\u0443\u043f \u044d\u043b \u044d\u043c"
    }
  ),
  "\u043a\u043e\u043d\u0442\u0435\u043a\u0441 \u0438 \u043b\u0443\u043f \u044d\u043b \u044d\u043c \u0440\u0430\u0431\u043e\u0442\u0430\u044e\u0442 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e."
);

assert.equal(
  prepareSileroSpeechText(
    "STT 2026 \u0438 11.5 \u0441\u0435\u043a\u0443\u043d\u0434\u044b.",
    {}
  ),
  "\u044d\u0441 \u0442\u0438 \u0442\u0438 \u0434\u0432\u0435 \u0442\u044b\u0441\u044f\u0447\u0438 \u0434\u0432\u0430\u0434\u0446\u0430\u0442\u044c \u0448\u0435\u0441\u0442\u044c \u0438 \u043e\u0434\u0438\u043d\u043d\u0430\u0434\u0446\u0430\u0442\u044c \u0446\u0435\u043b\u044b\u0445 \u043f\u044f\u0442\u044c \u0441\u0435\u043a\u0443\u043d\u0434\u044b."
);

assert.equal(
  guessSpeechLanguage(
    "\u041f\u0440\u0438\u0432\u0435\u0442, \u0440\u0430\u0441\u0441\u043a\u0430\u0436\u0438 \u043a\u0440\u0430\u0442\u043a\u043e."
  ),
  "ru-RU"
);
assert.equal(guessSpeechLanguage("Hello, summarize this note."), "en-US");
assert.equal(
  isMostlyEnglishSpeech(
    "This answer is mostly English and should be routed to the English voice."
  ),
  true
);

console.log("speechText tests passed");
