import assert from "node:assert/strict";
import { SemanticLocalCommandClassifier } from "../src/views/controllers/SemanticLocalCommandClassifier";

const markdownFiles = [
  { path: "Test/Test.md" },
  { path: "lumiq/lumiq.md" },
  { path: "Obisidian/Фишки obsidian.md" }
];

{
  let capturedPrompt = "";
  const classifier = new SemanticLocalCommandClassifier({
    app: {
      vault: {
        getMarkdownFiles: () => markdownFiles
      }
    } as any,
    getSettings: () => ({ model: "test-model" }) as any,
    readActiveMarkdownNote: async () => ({
      file: { path: "Test/Test.md" } as any,
      content: "Я гений\nOld local LLM note."
    }),
    findLastMentionedMarkdownPaths: () => ["Obisidian/Фишки obsidian.md"],
    getLastFoundFilePaths: () => ["lumiq/lumiq.md"],
    requestCompletion: async (_settings, messages) => {
      capturedPrompt = messages[0]?.content ?? "";
      return JSON.stringify({
        actions: [
          {
            action: "open_file",
            query: "Test/Test.md"
          },
          {
            action: "replace_text",
            original: "Я гений",
            suggested: "Я человек"
          }
        ]
      });
    }
  });

  const plan = await classifier.classifyPlan(
    "Открой тест в папке тест и поменяй Я гений на Я человек.",
    "тест в папке тест и поменяй Я гений на Я человек"
  );

  assert.equal(plan?.length, 2);
  assert.equal(plan?.[0]?.action, "open_file");
  assert.equal(plan?.[0]?.query, "Test/Test.md");
  assert.equal(plan?.[1]?.action, "replace_text");
  assert.match(capturedPrompt, /Active note path: Test\/Test\.md/);
  assert.match(capturedPrompt, /Corrected\/latest command segment:/);
  assert.match(capturedPrompt, /Test\/Test\.md/);
}

{
  const classifier = new SemanticLocalCommandClassifier({
    app: {
      vault: {
        getMarkdownFiles: () => markdownFiles
      }
    } as any,
    getSettings: () => ({ model: "test-model" }) as any,
    readActiveMarkdownNote: async () => null,
    findLastMentionedMarkdownPaths: () => [],
    getLastFoundFilePaths: () => [],
    requestCompletion: async () => JSON.stringify({ action: "none" })
  });

  assert.equal(await classifier.classifyPlan("Привет"), null);
  assert.equal(await classifier.classifyFirst("Привет"), null);
}

console.log("semanticLocalCommandClassifier tests passed");
