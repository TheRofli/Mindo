import { buildVaultCandidatePromptContextFromPaths } from "../src/router/vaultCandidatePromptContext";

const context = buildVaultCandidatePromptContextFromPaths(
  [
    "lumiq/lumiq.md",
    "lumiq/stat1.md",
    "Test/Test.md",
    "Obisidian/Obsidian tricks.md",
    "Proton/LLM Engineering.md",
    "Proton/Qore Systems Cases.md",
    "Proton/Qore Systems Strategy.md",
    "Proton/qquark-app.md"
  ],
  "Open LUMIK in folder LUMIK.",
  "Open LUMIK in folder LUMIK.",
  ["Proton/Qore Systems Cases.md"]
);

if (!context.includes("Vault candidates from the user's real Obsidian vault:")) {
  throw new Error("Expected prompt intro.");
}

if (!context.includes("lumiq/lumiq.md")) {
  throw new Error(`Expected lumiq/lumiq.md candidate, got:\n${context}`);
}

if (!context.includes("Folder candidates:")) {
  throw new Error("Expected folder candidates section.");
}

if (!context.includes("Context-near file candidates:")) {
  throw new Error("Expected context-near candidates section.");
}

if (!context.includes("Proton/Qore Systems Strategy.md")) {
  throw new Error(`Expected same-folder fallback candidate, got:\n${context}`);
}

console.log("vaultCandidatePromptContext tests passed");
