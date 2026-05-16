import assert from "node:assert/strict";
import {
  getVectorVaultDocuments,
  searchVectorVaultMarkdown
} from "../src/rag/vaultRag";
import { searchVaultMarkdownMany } from "../src/search/vaultSearch";

const files = [
  {
    path: "Obsidian/Voice Flow.md",
    basename: "Voice Flow",
    stat: {
      mtime: 1,
      size: 100
    }
  },
  {
    path: "Proton/Model Training.md",
    basename: "Model Training",
    stat: {
      mtime: 1,
      size: 100
    }
  },
  {
    path: ".obsidian/private.md",
    basename: "private",
    stat: {
      mtime: 1,
      size: 100
    }
  }
];

const contentByPath: Record<string, string> = {
  "Obsidian/Voice Flow.md":
    "# Voice Flow\n\nMicrophone audio goes through STT, tool routing, diff preview, and TTS.",
  "Proton/Model Training.md":
    "# Model Training\n\nFine tuning, quantization, datasets, and benchmark evaluation.",
  ".obsidian/private.md": "# Private\n\nThis ignored file mentions STT and TTS."
};

const app = {
  vault: {
    configDir: ".obsidian",
    getMarkdownFiles: () => files,
    cachedRead: async (file: { path: string }) => {
      readCounts[file.path] = (readCounts[file.path] ?? 0) + 1;
      return contentByPath[file.path] ?? "";
    }
  }
};

const readCounts: Record<string, number> = {};

async function main(): Promise<void> {
  const results = await searchVectorVaultMarkdown(
    app as never,
    "voice stt tts tool routing",
    4
  );

  assert.equal(results[0]?.path, "Obsidian/Voice Flow.md");
  assert.ok(results.every((result) => !result.path.startsWith(".obsidian/")));
  assert.ok(results[0]?.matches?.includes("vector"));

  await searchVectorVaultMarkdown(app as never, "voice stt tts tool routing", 4);

  assert.equal(
    readCounts["Obsidian/Voice Flow.md"],
    1,
    "unchanged markdown files are reused between RAG searches"
  );

  const beforeDirectDocumentReads = readCounts["Obsidian/Voice Flow.md"] ?? 0;
  await getVectorVaultDocuments(app as never);
  await getVectorVaultDocuments(app as never);

  assert.equal(
    readCounts["Obsidian/Voice Flow.md"],
    beforeDirectDocumentReads,
    "Rust sidecar document snapshots reuse unchanged file content"
  );

  const batchedKeywordResults = await searchVaultMarkdownMany(
    app as never,
    ["voice stt", "quantization benchmark"],
    3
  );

  assert.equal(batchedKeywordResults[0]?.[0]?.path, "Obsidian/Voice Flow.md");
  assert.equal(batchedKeywordResults[1]?.[0]?.path, "Proton/Model Training.md");

  console.log("vaultRag tests passed");
}

void main();
