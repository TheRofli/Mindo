import type { App, TFile } from "obsidian";
import { rankOpenFilePathCandidates } from "../resolver/openFileResolver";

export interface VaultCandidate {
  path: string;
  basename: string;
  folder: string;
  score: number;
}

export function collectVaultCandidates(
  app: App,
  query: string,
  limit = 30
): VaultCandidate[] {
  return rankVaultCandidatesFromPaths(
    app.vault.getMarkdownFiles().map((file: TFile) => file.path),
    query
  ).slice(0, limit);
}

export function rankVaultCandidatesFromPaths(
  paths: string[],
  query: string
): VaultCandidate[] {
  return rankOpenFilePathCandidates(paths, query);
}
