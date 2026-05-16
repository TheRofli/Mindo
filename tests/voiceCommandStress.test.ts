import assert from "node:assert/strict";
import { rankOpenFilePathCandidates } from "../src/resolver/openFileResolver";
import { extractReplacementFromCompoundText } from "../src/tools/actionPlanCompletion";
import {
  preserveExplicitFolder,
  shouldPreventLocalCommandChatFallback
} from "../src/tools/localCommandRouter";

const vaultPaths = [
  "Test/Test.md",
  "Another/Test.md",
  "lumiq/lumiq.md",
  "lumiq/stat1.md",
  "Obsidian/Milanote.md",
  "Obsidian/Фишки obsidian.md",
  "Obsidian/Фишки markdown.md",
  "Proton/LLM Engineering.md",
  "Proton/qquark-app.md",
  "Proton/Qore Systems Cases.md",
  "Proton/Qore Systems Strategy.md"
];

const openTargets = [
  {
    file: "тест",
    folder: "Test",
    expected: "Test/Test.md"
  },
  {
    file: "LUMIK",
    folder: "LUMIK",
    expected: "lumiq/lumiq.md"
  },
  {
    file: "мила ноут",
    folder: "Obsidian",
    expected: "Obsidian/Milanote.md"
  },
  {
    file: "LLM Engineering",
    folder: "Proton",
    expected: "Proton/LLM Engineering.md"
  }
];

const openVerbs = [
  "открой",
  "открою",
  "открывай",
  "открываем",
  "покажи"
];
const politeFillers = ["", "мне", "пожалуйста", "мне пожалуйста"];
const fileNouns = ["", "файл", "заметку", "ноут"];
const folderPhrases = [
  "в папке",
  "в папки",
  "в папку",
  "в папка",
  "вапке",
  "вапки",
  "впапке",
  "в падке",
  "в парке"
];
const punctuation = [".", "!", "?", ""];

let generatedOpenCases = 0;

for (const target of openTargets) {
  for (const verb of openVerbs) {
    for (const filler of politeFillers) {
      for (const fileNoun of fileNouns) {
        for (const folderPhrase of folderPhrases) {
          for (const mark of punctuation) {
            const query = [verb, filler, fileNoun, target.file, folderPhrase, target.folder]
              .filter(Boolean)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim() + mark;
            const ranked = rankOpenFilePathCandidates(vaultPaths, query);

            assert.equal(
              ranked[0]?.path,
              target.expected,
              `Expected "${query}" to resolve to ${target.expected}, got ${ranked[0]?.path ?? "nothing"}`
            );
            generatedOpenCases += 1;
          }
        }
      }
    }
  }
}

const noisyMilanote = rankOpenFilePathCandidates(
  vaultPaths,
  "Открываем не мила ноут."
);
assert.equal(noisyMilanote[0]?.path, "Obsidian/Milanote.md");

const englishOpen = rankOpenFilePathCandidates(
  vaultPaths,
  "open LLM Engineering inside the folder Proton"
);
assert.equal(englishOpen[0]?.path, "Proton/LLM Engineering.md");

const englishStrategyOpen = rankOpenFilePathCandidates(
  vaultPaths,
  "open qore systems strategy in folder Proton"
);
assert.equal(englishStrategyOpen[0]?.path, "Proton/Qore Systems Strategy.md");

assert.equal(
  preserveExplicitFolder(
    "create a researched note about Voice Flow",
    "Создай вапке Obsidian заметку Voice Flow"
  ),
  "create a researched note about Voice Flow in folder Obsidian"
);

const replacementCases: Array<[
  string,
  {
    original: string;
    suggested: string;
  }
]> = [
  [
    "Поменяй Я-гений на Я-человек.",
    {
      original: "Я гений",
      suggested: "Я человек"
    }
  ],
  [
    "Убери Я-гений и поставь вместо него Я-человек.",
    {
      original: "Я гений",
      suggested: "Я человек"
    }
  ],
  [
    "Вместо Я-гений напиши Я-человек.",
    {
      original: "Я гений",
      suggested: "Я человек"
    }
  ],
  [
    "Remove old local LLM note and put new local LLM note instead.",
    {
      original: "old local LLM note",
      suggested: "new local LLM note"
    }
  ]
];

for (const [query, expected] of replacementCases) {
  assert.deepEqual(
    extractReplacementFromCompoundText(query),
    expected,
    `Expected replacement parser to understand "${query}"`
  );
}

const localOnlyCommands = [
  "откати",
  "отмени изменение",
  "верни назад",
  "прочитай последний ответ",
  "озвучь ответ",
  "останови озвучку",
  "стоп чтение",
  "accept",
  "reject",
  "undo",
  "read latest answer"
];

for (const command of localOnlyCommands) {
  assert.equal(
    shouldPreventLocalCommandChatFallback(command),
    true,
    `Expected "${command}" to stay in local command routing`
  );
}

console.log(
  `voiceCommandStress tests passed: ${generatedOpenCases + replacementCases.length + localOnlyCommands.length + 3} generated/targeted cases`
);
