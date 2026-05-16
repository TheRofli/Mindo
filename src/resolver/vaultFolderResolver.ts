import {
  normalizeOpenFileValue,
  scoreVaultFolderCandidate
} from "./openFileResolver";

export function resolveVaultFolderPathFromPaths(
  markdownPaths: string[],
  folderQuery: string
): string | null {
  const normalizedQuery = normalizeOpenFileValue(folderQuery);

  if (!normalizedQuery) {
    return null;
  }

  const folders = Array.from(
    new Set(markdownPaths.map(getFolderPath).filter(Boolean))
  );
  const scoredFolders = folders
    .map((folder) => ({
      folder,
      score: scoreVaultFolderCandidate(folder, normalizedQuery)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.folder.localeCompare(right.folder)
    );

  return scoredFolders[0]?.folder ?? null;
}

function getFolderPath(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash <= 0 ? "" : path.slice(0, lastSlash);
}
