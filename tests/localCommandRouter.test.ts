import assert from "node:assert/strict";
import {
  semanticCommandToLocalAction,
  preserveExplicitFolder,
  shouldPreventLocalCommandChatFallback
} from "../src/tools/localCommandRouter";

const commandText = "Open Test, then replace old with new.";

assert.deepEqual(
  semanticCommandToLocalAction(
    {
      action: "replace_text",
      replacements: [
        {
          original: "old",
          suggested: "new"
        },
        {
          original: "first",
          suggested: "second"
        }
      ]
    },
    commandText
  ),
  {
    kind: "replace-multiple",
    commandText,
    replacements: [
      {
        original: "old",
        suggested: "new"
      },
      {
        original: "first",
        suggested: "second"
      }
    ]
  }
);

assert.deepEqual(
  semanticCommandToLocalAction(
    {
      action: "open_file",
      query: "Test/Test.md"
    },
    "Open test in folder Test."
  ),
  {
    kind: "open-file",
    commandText: "Open test in folder Test.",
    query: "Test/Test.md"
  }
);

assert.deepEqual(
  semanticCommandToLocalAction(
    {
      action: "research_note",
      query: "create a researched note about current local LLM trends"
    },
    "Create a modern local LLM note."
  ),
  {
    kind: "research-note",
    commandText: "create a researched note about current local LLM trends",
    displayText: "Create a modern local LLM note."
  }
);

assert.deepEqual(
  semanticCommandToLocalAction({ action: "read_last_answer" }, "read it"),
  {
    kind: "read-last-answer"
  }
);

assert.equal(
  semanticCommandToLocalAction({ action: "none" }, "tell me about create"),
  null
);

assert.equal(
  shouldPreventLocalCommandChatFallback("Create a note about RAG in Obsidian."),
  true
);
assert.equal(
  shouldPreventLocalCommandChatFallback("How do I create a note in Obsidian?"),
  false
);

assert.equal(
  preserveExplicitFolder(
    "create a researched note about Contex Voice Flow",
    "Создай в папке Obsidian заметку Contex Voice Flow"
  ),
  "create a researched note about Contex Voice Flow in folder Obsidian"
);

assert.deepEqual(
  semanticCommandToLocalAction(
    {
      action: "research_note",
      query: "create a researched note about STT and TTS"
    },
    "Создай в папке Obsidian заметку про STT and TTS"
  ),
  {
    kind: "research-note",
    commandText: "create a researched note about STT and TTS in folder Obsidian",
    displayText: "Создай в папке Obsidian заметку про STT and TTS"
  }
);

assert.equal(shouldPreventLocalCommandChatFallback("откати"), true);
assert.equal(shouldPreventLocalCommandChatFallback("прочитай последний ответ"), true);

console.log("localCommandRouter tests passed");
