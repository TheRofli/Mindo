import assert from "node:assert/strict";
import {
  getFolderPath,
  inferCreateNoteTitleFromCommand,
  isSafeCreateNotePath,
  normalizeCreateNotePath,
  sanitizeCreateNoteFilename,
  slugifyTitle
} from "../src/views/createNotePathUtils";

assert.equal(slugifyTitle("Bad/File: Name?"), "Bad File Name");
assert.equal(getFolderPath("Obsidian/Voice Flow.md"), "Obsidian");
assert.equal(
  sanitizeCreateNoteFilename("```json.md", "# Voice Flow\nBody"),
  "Voice Flow.md"
);
assert.equal(
  sanitizeCreateNoteFilename("Plan for Contex.md", "# Ignored"),
  "Plan for Contex.md"
);
assert.equal(normalizeCreateNotePath("Plan"), "Mindo Inbox/Plan.md");
assert.equal(normalizeCreateNotePath("Obsidian/Plan"), "Obsidian/Plan.md");
assert.equal(isSafeCreateNotePath("Obsidian/Plan.md"), true);
assert.equal(isSafeCreateNotePath("Obsidian/```json.md"), false);
assert.equal(
  inferCreateNoteTitleFromCommand("Создай в текущей папке файл План теста."),
  "План теста"
);
assert.equal(
  inferCreateNoteTitleFromCommand("Создай в папке Obsidian файл План Contex Agent."),
  "План Contex Agent"
);
assert.equal(
  inferCreateNoteTitleFromCommand(
    "Создай в папке `тест` новый Markdown-файл. Название файла придумай самостоятельно, но оно должно отражать тему «10 идей проектов для ускорения вайбкодинга»."
  ),
  "10 идей проектов для ускорения вайбкодинга"
);
assert.equal(
  inferCreateNoteTitleFromCommand(
    "Создай современную страницу про самые современные фичи для local LLM в этом году."
  ),
  "самые современные фичи для local LLM в этом году"
);
assert.equal(
  inferCreateNoteTitleFromCommand(
    "Создай в папке Obsidian заметку Contex Voice Flow и добавь туда вебресерч про локальные STT, TTS в 2026 году."
  ),
  "Contex Voice Flow"
);

assert.equal(
  inferCreateNoteTitleFromCommand(
    "\u0421\u043e\u0437\u0434\u0430\u0439 \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u043f\u0430\u043f\u043a\u0435 \u0444\u0430\u0439\u043b \u041f\u043b\u0430\u043d \u0442\u0435\u0441\u0442\u0430."
  ),
  "\u041f\u043b\u0430\u043d \u0442\u0435\u0441\u0442\u0430"
);
assert.equal(
  inferCreateNoteTitleFromCommand(
    "\u0421\u043e\u0437\u0434\u0430\u0439 \u0432 \u043f\u0430\u043f\u043a\u0435 Obsidian \u043d\u043e\u0432\u044b\u0439 Markdown-\u0444\u0430\u0439\u043b. \u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0444\u0430\u0439\u043b\u0430 \u043f\u0440\u0438\u0434\u0443\u043c\u0430\u0439 \u0441\u0430\u043c\u043e\u0441\u0442\u043e\u044f\u0442\u0435\u043b\u044c\u043d\u043e, \u043d\u043e \u043e\u043d\u043e \u0434\u043e\u043b\u0436\u043d\u043e \u043e\u0442\u0440\u0430\u0436\u0430\u0442\u044c \u0442\u0435\u043c\u0443 \u00ab10 \u0438\u0434\u0435\u0439 \u0434\u043b\u044f vibe coding\u00bb."
  ),
  "10 \u0438\u0434\u0435\u0439 \u0434\u043b\u044f vibe coding"
);
assert.equal(
  sanitizeCreateNoteFilename(
    "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0432 \u044d\u0442\u043e\u0439 \u043f\u0430\u043f\u043a\u0435.md",
    "# \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u0440\u0435\u0436\u0438\u043c\nBody"
  ),
  "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u0440\u0435\u0436\u0438\u043c.md"
);
assert.equal(
  sanitizeCreateNoteFilename(
    "\u0441 \u0430\u043d\u0435\u043a\u0434\u043e\u0442\u0430\u043c\u0438 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442.md",
    "# \u0410\u043d\u0435\u043a\u0434\u043e\u0442\u044b\n\n\u0410\u043d\u0435\u043a\u0434\u043e\u0442 1"
  ),
  "\u0410\u043d\u0435\u043a\u0434\u043e\u0442\u044b.md"
);
assert.equal(
  sanitizeCreateNoteFilename(
    "with jokes in folder Test.md",
    "# Jokes\n\nJoke 1"
  ),
  "Jokes.md"
);
assert.equal(
  inferCreateNoteTitleFromCommand(
    "\u0421\u043e\u0437\u0434\u0430\u0439 \u0444\u0430\u0439\u043b \u0441 \u0430\u043d\u0435\u043a\u0434\u043e\u0442\u0430\u043c\u0438 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442"
  ),
  "\u0430\u043d\u0435\u043a\u0434\u043e\u0442\u044b"
);
assert.equal(
  sanitizeCreateNoteFilename(
    "анекдотами.md",
    "# Анекдоты в папке Тест\n\nАнекдот 1"
  ),
  "анекдоты.md"
);
assert.equal(
  sanitizeCreateNoteFilename(
    "Создать файл.md",
    "# Современные фичи в папке Obsidian\n\nBody"
  ),
  "Современные фичи.md"
);

console.log("createNotePathUtils tests passed");
