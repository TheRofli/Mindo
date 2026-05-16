import { strict as assert } from "node:assert";

import {
  executeSemanticLocalCommand,
  type SemanticLocalCommandExecutorHandlers
} from "../src/router/semanticLocalCommandExecutor";
import type { SemanticLocalCommand } from "../src/views/semanticLocalCommandPlan";

function createHandlers(log: string[]): SemanticLocalCommandExecutorHandlers {
  return {
    previewTextReplacement: async (commandText, replacement) => {
      log.push(`replace:${commandText}:${replacement.original}->${replacement.suggested}`);
    },
    previewMultiTextReplacement: async (commandText, replacements) => {
      log.push(`multi:${commandText}:${replacements.length}`);
    },
    previewSelectionOrLineReplacement: async (commandText, replacement) => {
      log.push(`selection:${commandText}:${replacement}`);
    },
    openFileByQuery: async (query, commandText) => {
      log.push(`open:${query}:${commandText}`);
    },
    openLastFile: async (commandText) => {
      log.push(`open-last:${commandText}`);
    },
    sendVaultSearch: async (query) => {
      log.push(`search:${query}`);
    },
    sendSemanticVaultQuestion: async (query) => {
      log.push(`rag:${query}`);
    },
    sendWebResearch: async (query) => {
      log.push(`web:${query}`);
    },
    createResearchNote: async (commandText, displayText) => {
      log.push(`research-note:${commandText}:${displayText}`);
    },
    createNote: async (commandText) => {
      log.push(`create:${commandText}`);
    },
    updateCurrentNote: async (commandText) => {
      log.push(`update:${commandText}`);
    },
    speakLatestAssistantMessage: async () => {
      log.push("read");
    },
    stopSpeaking: () => {
      log.push("stop");
    }
  };
}

async function run() {
  {
    const log: string[] = [];
    const handled = await executeSemanticLocalCommand(
      {
        action: "replace_text",
        original: "old",
        suggested: "new"
      },
      "replace old",
      createHandlers(log)
    );

    assert.equal(handled, true);
    assert.deepEqual(log, ["replace:replace old:old->new"]);
  }

  {
    const log: string[] = [];
    const command: SemanticLocalCommand = {
      action: "replace_text",
      replacements: [
        { original: "a", suggested: "b" },
        { original: "c", suggested: "d" }
      ]
    };
    const handled = await executeSemanticLocalCommand(
      command,
      "replace many",
      createHandlers(log)
    );

    assert.equal(handled, true);
    assert.deepEqual(log, ["multi:replace many:2"]);
  }

  {
    const log: string[] = [];
    const handled = await executeSemanticLocalCommand(
      {
        action: "open_file",
        query: "Milanote in Obsidian"
      },
      "open milanote",
      createHandlers(log)
    );

    assert.equal(handled, true);
    assert.deepEqual(log, ["open:Milanote in Obsidian:open milanote"]);
  }

  {
    const log: string[] = [];
    const handled = await executeSemanticLocalCommand(
      {
        action: "replace_text"
      },
      "broken replace",
      createHandlers(log)
    );

    assert.equal(handled, false);
    assert.deepEqual(log, []);
  }

  {
    const log: string[] = [];
    const handled = await executeSemanticLocalCommand(
      {
        action: "stop_speaking"
      },
      "stop",
      createHandlers(log)
    );

    assert.equal(handled, true);
    assert.deepEqual(log, ["stop"]);
  }
}

run()
  .then(() => {
    console.log("semanticLocalCommandExecutor tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
