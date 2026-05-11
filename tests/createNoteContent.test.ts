import assert from "node:assert/strict";
import {
  buildGeneratedNoteMarkdownContent,
  chooseGeneratedNoteTitle,
  sanitizeStreamedNoteMarkdown,
  stripDuplicateLeadingTitle
} from "../src/views/createNoteContent";

assert.equal(
  stripDuplicateLeadingTitle(
    "# Обзор лучших LLM 2026 года: Выбор модели под задачу\n\nТекст заметки.",
    "Обзор лучших LLM 2026 года Выбор модели под задачу",
    "Obisidian/Обзор лучших LLM 2026 года Выбор модели под задачу.md"
  ),
  "Текст заметки."
);

assert.equal(
  stripDuplicateLeadingTitle(
    "# Different heading\n\nТекст заметки.",
    "Обзор лучших LLM",
    "Obisidian/Обзор лучших LLM.md"
  ),
  "# Different heading\n\nТекст заметки."
);

assert.equal(
  stripDuplicateLeadingTitle(
    "---\ntags: [llm]\n---\n# План Contex Agent\n\nКонтент.",
    "План Contex Agent",
    "Obisidian/План Contex Agent.md"
  ),
  "---\ntags: [llm]\n---\nКонтент."
);

assert.equal(
  stripDuplicateLeadingTitle(
    "Modern Local LLM Features 2026\n\nBody",
    "Modern Local LLM Features 2026",
    "Contex Inbox/Modern Local LLM Features 2026.md"
  ),
  "Body"
);

assert.equal(
  sanitizeStreamedNoteMarkdown(
    '```json\n{"title":"Voice Flow","content":"# Voice Flow\\n\\nShort plan."}\n```',
    "Voice Flow",
    "Obisidian/Voice Flow.md"
  ),
  "Short plan."
);

assert.equal(
  sanitizeStreamedNoteMarkdown(
    "```markdown\n# Voice Flow\n\nShort plan.\n```",
    "Voice Flow",
    "Obisidian/Voice Flow.md"
  ),
  "Short plan."
);

assert.equal(
  chooseGeneratedNoteTitle({
    currentTitle: "только предложить правку",
    rawContent: "# LiveShare\n\nObsidian plugin for collaborative Markdown workspaces.",
    userPrompt:
      "Название файла придумай сам, короткое и красивое. Режим только предложить правку."
  }),
  "LiveShare"
);

assert.equal(
  chooseGeneratedNoteTitle({
    currentTitle: "анекдотами",
    rawContent: "# Анекдоты\n\nАнекдот 1",
    userPrompt: "Создай файл с анекдотами в папке тест"
  }),
  "Анекдоты"
);

assert.equal(
  buildGeneratedNoteMarkdownContent(
    "# Создать файл про технологии\n\nТекст без дубля заголовка.",
    "Создать файл про технологии",
    "lumiq/Создать файл про технологии.md",
    { includeSources: false }
  ),
  "Текст без дубля заголовка."
);

assert.equal(
  buildGeneratedNoteMarkdownContent(
    "# файл План Contex Agent\n\nТекст без дубля заголовка.",
    "План Contex Agent",
    "Obisidian/План Contex Agent.md",
    { includeSources: false }
  ),
  "Текст без дубля заголовка."
);

assert.equal(
  buildGeneratedNoteMarkdownContent("", "Empty", "Inbox/Empty.md", {
    includeSources: false
  }),
  ""
);

assert.equal(
  chooseGeneratedNoteTitle({
    currentTitle: "только предложить правку",
    rawContent: "# LiveShare\n\nObsidian plugin for collaborative Markdown workspaces.",
    userPrompt:
      "Название файла придумай сам, короткое и красивое. Режим только предложить правку."
  }),
  "LiveShare"
);

assert.equal(
  chooseGeneratedNoteTitle({
    currentTitle: "с анекдотами в папке тест",
    rawContent: "# Анекдоты\n\nАнекдот 1",
    userPrompt: "Создай файл с анекдотами в папке тест"
  }),
  "Анекдоты"
);

console.log("createNoteContent tests passed");
