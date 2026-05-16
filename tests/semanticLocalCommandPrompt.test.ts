import { buildSemanticLocalCommandPrompt } from "../src/router/semanticLocalCommandPrompt";

const prompt = buildSemanticLocalCommandPrompt({
  commandText: "Открой тест, точнее создай заметку.",
  effectiveCommandText: "создай заметку.",
  activeNotePath: "Test/Test.md",
  activeNoteExcerpt: "Current note content",
  mentionedPaths: ["Obisidian/Фишки obsidian.md"],
  lastResultPaths: ["lumiq/lumiq.md"],
  toolRouterContext: "Tool router context",
  vaultCandidateContext: "Vault candidate context"
});

if (!prompt.includes("Return JSON only")) {
  throw new Error("Expected JSON-only instruction.");
}

if (!prompt.includes("Corrected/latest command segment:")) {
  throw new Error("Expected corrected command segment.");
}

if (!prompt.includes("Vault candidate context")) {
  throw new Error("Expected vault candidate context.");
}

if (!prompt.includes("Active note path: Test/Test.md")) {
  throw new Error("Expected active note path.");
}

console.log("semanticLocalCommandPrompt tests passed");
