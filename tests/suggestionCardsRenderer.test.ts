import assert from "node:assert/strict";
import { getSuggestionCards } from "../src/views/suggestionCardsRenderer";

const englishCards = getSuggestionCards("en");

assert.deepEqual(
  englishCards.map((card) => card.id),
  ["vault-recall", "connect-note", "improve-draft"]
);
assert.equal(englishCards[0]?.label, "Ask your vault");
assert.equal(
  englishCards[0]?.description,
  "Find what your notes already say about the current idea."
);
assert.equal(
  englishCards[0]?.action.prompt,
  "What have I already written about this? Answer from my vault and cite the notes you used."
);

const russianCards = getSuggestionCards("ru");

assert.equal(russianCards[0]?.label, "Спросить vault");
assert.equal(
  russianCards[1]?.description,
  "Найти заметки, которые связаны с текущей."
);
assert.equal(
  russianCards[2]?.action.prompt,
  "Сделай этот черновик яснее. Сначала покажи preview/diff, не меняй заметку молча."
);

console.log("suggestionCardsRenderer tests passed");
