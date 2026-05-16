import { resolveVaultFolderPathFromPaths } from "../src/resolver/vaultFolderResolver";

const paths = [
  "lumiq/lumiq.md",
  "lumiq/stat1.md",
  "Test/Test.md",
  "Obisidian/Фишки obsidian.md",
  "Proton/LLM Engineering.md"
];

const exact = resolveVaultFolderPathFromPaths(paths, "test");
if (exact !== "Test") {
  throw new Error(`Expected Test folder, got ${exact}`);
}

const cyrillic = resolveVaultFolderPathFromPaths(paths, "обсидиан");
if (cyrillic !== "Obisidian") {
  throw new Error(`Expected Obisidian folder, got ${cyrillic}`);
}

const none = resolveVaultFolderPathFromPaths(paths, "missing folder");
if (none !== null) {
  throw new Error(`Expected null for missing folder, got ${none}`);
}

console.log("vaultFolderResolver tests passed");
