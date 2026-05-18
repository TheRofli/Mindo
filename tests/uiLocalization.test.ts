import assert from "node:assert/strict";
import {
  getUiLanguageFromObsidianApp,
  getUiLanguageFromObsidianLocale,
  getActionText,
  getUiText,
  sanitizeUiLanguage
} from "../src/i18n";

assert.equal(sanitizeUiLanguage("ru"), "ru");
assert.equal(sanitizeUiLanguage("fr"), "en");
assert.equal(getUiLanguageFromObsidianLocale("ru"), "ru");
assert.equal(getUiLanguageFromObsidianLocale("ru-RU"), "ru");
assert.equal(getUiLanguageFromObsidianLocale("de"), "en");
assert.equal(
  getUiLanguageFromObsidianApp({
    vault: {
      getConfig(key: string) {
        return key === "locale" ? "ru" : null;
      }
    }
  }),
  "ru"
);
assert.equal(getUiText("en", "suggestedPrompts"), "Suggested Prompts");
assert.equal(getUiText("ru", "suggestedPrompts"), "Предложенные команды");
assert.equal(
  getUiText("ru", "composerPlaceholder"),
  "Ваш AI-ассистент для Obsidian • контекст подключается автоматически • / для команд"
);
assert.equal(getActionText("ru", "summarize-note").label, "Кратко пересказать");
assert.equal(getActionText("en", "summarize-note").label, "Summarize note");

assert.deepEqual(getActionText("en", "vault-recall"), {
  label: "Ask your vault",
  description: "Find what your notes already say about the current idea.",
  title: "Vault Recall"
});
assert.deepEqual(getActionText("en", "connect-note"), {
  label: "Connect this note",
  description: "Find notes that connect to the active note.",
  title: "Note Connections"
});
assert.deepEqual(getActionText("en", "improve-draft"), {
  label: "Improve this draft",
  description: "Draft a clearer version through preview/diff.",
  title: "Draft Preview"
});
assert.deepEqual(getActionText("ru", "vault-recall"), {
  label: "Спросить vault",
  description: "Найти, что твои заметки уже говорят об этой идее.",
  title: "Память vault"
});
assert.deepEqual(getActionText("ru", "connect-note"), {
  label: "Связать заметку",
  description: "Найти заметки, которые связаны с текущей.",
  title: "Связи заметки"
});
assert.equal(getActionText("ru", "improve-draft").label, "Улучшить черновик");
assert.equal(
  getActionText("ru", "improve-draft").description,
  "Подготовить более ясную версию через preview/diff."
);
assert.equal(getActionText("ru", "improve-draft").title, "Preview черновика");

console.log("uiLocalization tests passed");
