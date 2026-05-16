import assert from "node:assert/strict";
import { getSuggestionCards } from "../src/views/suggestionCardsRenderer";

const englishCards = getSuggestionCards("en");

assert.deepEqual(
  englishCards.map((card) => card.id),
  ["explain-note", "summarize-note", "create-roadmap", "extract-tasks"]
);
assert.equal(englishCards[0]?.label, "Explain note");
assert.equal(
  englishCards[0]?.description,
  "Explain the active note in plain language."
);

const russianCards = getSuggestionCards("ru");

assert.equal(russianCards[0]?.label, "Объяснить заметку");
assert.equal(
  russianCards[2]?.description,
  "Превратить активную заметку в этапы, риски и следующие действия."
);

console.log("suggestionCardsRenderer tests passed");
