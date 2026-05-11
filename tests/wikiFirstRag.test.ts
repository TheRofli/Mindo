import assert from "node:assert/strict";
import { searchWikiFirstMarkdown } from "../src/rag/wikiFirstRag";

const files = [
  {
    path: "Contex Wiki/Wiki/Concepts/Local LLM.md",
    basename: "Local LLM",
    stat: { mtime: 1, size: 100 }
  },
  {
    path: "Proton/LLM Engineering.md",
    basename: "LLM Engineering",
    stat: { mtime: 1, size: 100 }
  },
  {
    path: "Contex Wiki/Raw/Web/raw-local-llm.md",
    basename: "raw-local-llm",
    stat: { mtime: 1, size: 100 }
  }
];

const contentByPath: Record<string, string> = {
  "Contex Wiki/Wiki/Concepts/Local LLM.md":
    "---\nnode_id: concept-local-llm-abc12345\n---\n# Local LLM\n\nA local language model runs privately on user hardware.",
  "Proton/LLM Engineering.md":
    "# LLM Engineering\n\nA local language model can be tuned and benchmarked.",
  "Contex Wiki/Raw/Web/raw-local-llm.md": "# Raw\n\nlocal language model"
};

const app = {
  vault: {
    getMarkdownFiles: () => files,
    cachedRead: async (file: { path: string }) => contentByPath[file.path] ?? "",
    adapter: {
      exists: async (path: string) =>
        path === "Contex Wiki/Schema/aliases.json",
      read: async () =>
        JSON.stringify({
          "локальная модель": ["concept-local-llm-abc12345"],
          "local llm": ["concept-local-llm-abc12345"]
        })
    }
  }
};

async function main(): Promise<void> {
  const disabled = await searchWikiFirstMarkdown(app as never, "local llm", 4, {
    wikiEnabled: false,
    wikiRootFolder: "Contex Wiki"
  });

  assert.deepEqual(disabled, []);

  const results = await searchWikiFirstMarkdown(
    app as never,
    "локальная модель",
    4,
    {
      wikiEnabled: true,
      wikiRootFolder: "Contex Wiki"
    }
  );

  assert.equal(results[0]?.path, "Contex Wiki/Wiki/Concepts/Local LLM.md");
  assert.ok(results[0]?.matches?.includes("wiki"));
  assert.ok(results[0]?.matches?.includes("wiki-alias"));
  assert.ok(results.every((result) => !result.path.includes("/Raw/")));

  console.log("wikiFirstRag tests passed");
}

void main();
