import assert from "node:assert/strict";
import {
  findUniqueTextOccurrence,
  replaceSelectedOccurrence
} from "../src/diff/textOccurrence";

const unicodeHyphenToSpace = findUniqueTextOccurrence(
  "\u042f \u0433\u0435\u043d\u0438\u0439",
  "\u042f-\u0433\u0435\u043d\u0438\u0439"
);

assert.equal(unicodeHyphenToSpace.error, null);
assert.equal(
  unicodeHyphenToSpace.match?.original,
  "\u042f \u0433\u0435\u043d\u0438\u0439"
);

const minorSttTypo = findUniqueTextOccurrence(
  "\u042f \u0433\u0435\u043d\u0438\u0439",
  "\u042f \u0433\u0435\u043d\u0438"
);

assert.equal(minorSttTypo.error, null);
assert.equal(minorSttTypo.match?.original, "\u042f \u0433\u0435\u043d\u0438\u0439");

const hyphenToSpace = findUniqueTextOccurrence("Я гений", "Я-гений");

assert.equal(hyphenToSpace.error, null);
assert.equal(hyphenToSpace.match?.original, "Я гений");

const emDashToSpace = findUniqueTextOccurrence("Я гений", "Я — гений");

assert.equal(emDashToSpace.error, null);
assert.equal(emDashToSpace.match?.original, "Я гений");

assert.equal(
  replaceSelectedOccurrence(
    "Я гений\nСтарое слово",
    hyphenToSpace.match?.original ?? "",
    "Я человек",
    hyphenToSpace.match?.occurrenceIndex
  ),
  "Я человек\nСтарое слово"
);

const ambiguous = findUniqueTextOccurrence("Я гений\nЯ — гений", "Я-гений");

assert.match(ambiguous.error ?? "", /more than once/i);

console.log("textOccurrence tests passed");
