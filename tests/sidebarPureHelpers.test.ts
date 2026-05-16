import assert from "node:assert/strict";
import {
  cleanSuggestedReplacement,
  normalizeNoisyLocalCommandText,
  parseVoiceOpenFileQuery
} from "../src/views/sidebarPureHelpers";

assert.equal(
  cleanSuggestedReplacement("```markdown\n# Title\n\nBody\n```"),
  "# Title\n\nBody"
);

const noisyOpen = normalizeNoisyLocalCommandText(
  "\u041e\u0442\u043a\u0440\u043e\u044e \u0442\u0435\u0441\u0442, \u0432\u0430\u043f\u043a\u0438 \u0442\u0435\u0441\u0442"
);

assert.match(noisyOpen, /\u043e\u0442\u043a\u0440\u043e\u0439/i);
assert.match(noisyOpen, /\u0432 \u043f\u0430\u043f\u043a\u0435/i);

assert.equal(
  parseVoiceOpenFileQuery("open file Test in folder Test"),
  "Test in folder Test"
);

assert.equal(
  parseVoiceOpenFileQuery(
    "\u0410 \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u043d\u0435 \u041e\u043a\u043a\u043e \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439 \u0444\u0430\u0439\u043b?"
  ),
  "\u041e\u043a\u043a\u043e \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439"
);

assert.equal(
  parseVoiceOpenFileQuery(
    "\u0438\u043c\u0435\u043d\u043d\u043e \u041a\u043e\u0440 \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438"
  ),
  "\u041a\u043e\u0440 \u0441\u0438\u0441\u0442\u0435\u043c \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438"
);

console.log("sidebarPureHelpers tests passed");
