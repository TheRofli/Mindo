import assert from "node:assert/strict";
import { rankOpenFilePathCandidates } from "../src/resolver/openFileResolver";

const lumik = rankOpenFilePathCandidates(
  ["lumiq/stat1.md", "lumiq/lumiq.md", "Test/Test.md"],
  "LUMIK в папке LUMIK"
);

assert.equal(lumik[0]?.path, "lumiq/lumiq.md");

const lumic = rankOpenFilePathCandidates(
  ["lumiq/stat1.md", "lumiq/lumiq.md", "Test/Test.md"],
  "open LUMIC in folder LUMIC"
);

assert.equal(lumic[0]?.path, "lumiq/lumiq.md");

const exactFolderStillWins = rankOpenFilePathCandidates(
  ["lumiq/stat1.md", "Test/Test.md", "Another/Test.md"],
  "open test in folder Test"
);

assert.equal(exactFolderStillWins[0]?.path, "Test/Test.md");

const russianOpenVerbAndFolder = rankOpenFilePathCandidates(
  ["lumiq/stat1.md", "Test/Test.md", "Another/Test.md"],
  "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0439 \u0442\u0435\u0441\u0442 \u0432 \u043f\u0430\u043f\u043a\u0435 Test"
);

assert.equal(russianOpenVerbAndFolder[0]?.path, "Test/Test.md");

const splitPhoneticFileName = rankOpenFilePathCandidates(
  [
    "Obsidian/Milanote.md",
    "Obsidian/Contex_Agent_for_Obsidian_Full_Project_Spec_v3_FINAL_BRANDING.md",
    "Proton/LLM Engineering.md"
  ],
  "\u043c\u0438\u043b\u0430 \u043d\u043e\u0443\u0442"
);

assert.equal(splitPhoneticFileName[0]?.path, "Obsidian/Milanote.md");

console.log("openFileResolver tests passed");
