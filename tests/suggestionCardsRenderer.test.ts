import assert from "node:assert/strict";
import { getSuggestionCards } from "../src/views/suggestionCardsRenderer";

const englishCards = getSuggestionCards("en");

assert.deepEqual(
  englishCards.map((card) => card.id),
  ["vault-recall", "connect-note", "improve-draft"]
);
assert.deepEqual(
  englishCards.map((card) => card.label),
  ["Ask your vault", "Connect this note", "Improve this draft"]
);
assert.deepEqual(
  englishCards.map((card) => card.description),
  [
    "Find what your notes already say about the current idea.",
    "Find related notes and explain the strongest links.",
    "Draft a clearer version through preview/diff."
  ]
);
assert.deepEqual(
  englishCards.map((card) => card.action.prompt),
  [
    "What have I already written about this? Answer from my vault and cite the notes you used.",
    "Connect this note to related notes in my vault. Explain the strongest links and cite the notes.",
    "Make this draft clearer. Show a preview/diff first and do not silently change the note."
  ]
);

const russianCards = getSuggestionCards("ru");

assert.deepEqual(
  russianCards.map((card) => card.label),
  ["Спросить vault", "Связать заметку", "Улучшить черновик"]
);
assert.deepEqual(
  russianCards.map((card) => card.description),
  [
    "Найти, что заметки уже говорят о текущей идее.",
    "Найти заметки, которые связаны с текущей.",
    "Подготовить более ясную версию через preview/diff."
  ]
);
assert.deepEqual(
  russianCards.map((card) => card.action.prompt),
  [
    "What have I already written about this? Answer from my vault and cite the notes you used.",
    "Connect this note to related notes in my vault. Explain the strongest links and cite the notes.",
    "Сделай этот черновик яснее. Сначала покажи preview/diff, не меняй заметку молча."
  ]
);

console.log("suggestionCardsRenderer tests passed");
