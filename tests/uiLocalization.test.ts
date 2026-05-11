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

console.log("uiLocalization tests passed");
