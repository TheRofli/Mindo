import type { ContexActionSource } from "../actions/actionTypes";
import { parseOpenFileQueryParts } from "../resolver/openFileResolver";
import { rankVaultCandidatesFromPaths } from "../router/vaultCandidates";
import { normalizeVoiceCommandNoise } from "../voice/speechNoise";
import type {
  WorkflowAttachmentContext,
  WorkflowContextBundle,
  WorkflowFolderCandidate,
  WorkflowUiLanguage
} from "./workflowTypes";

export interface BuildWorkflowContextInput {
  userText: string;
  source: ContexActionSource;
  uiLanguage?: WorkflowUiLanguage;
  activeNotePath?: string;
  activeNoteExcerpt?: string;
  activeNoteWordCount?: number;
  selectedText?: string;
  attachments?: WorkflowAttachmentContext[];
  vaultPaths?: string[];
  ragSnippets?: string[];
  wikiSnippets?: string[];
  webSnippets?: string[];
  recentChatSummary?: string;
  nowIso?: string;
}

export function buildWorkflowContext(
  input: BuildWorkflowContextInput
): WorkflowContextBundle {
  const effectiveText = extractEffectiveWorkflowText(input.userText);
  const vaultPaths = input.vaultPaths ?? [];
  const noteCandidates = rankVaultCandidatesFromPaths(
    vaultPaths,
    effectiveText
  );

  return {
    source: input.source,
    userText: input.userText,
    effectiveText,
    uiLanguage: input.uiLanguage ?? "en",
    activeNote: input.activeNotePath
      ? {
          path: input.activeNotePath,
          folder: getFolderPath(input.activeNotePath),
          title: getBasename(input.activeNotePath),
          excerpt: input.activeNoteExcerpt,
          wordCount: input.activeNoteWordCount
        }
      : undefined,
    selectedText: input.selectedText?.trim() || undefined,
    attachments: input.attachments ?? [],
    noteCandidates,
    folderCandidates: rankFolderCandidates(
      vaultPaths,
      effectiveText,
      noteCandidates.map((candidate) => getFolderPath(candidate.path))
    ),
    ragSnippets: input.ragSnippets ?? [],
    wikiSnippets: input.wikiSnippets ?? [],
    webSnippets: input.webSnippets ?? [],
    recentChatSummary: input.recentChatSummary,
    nowIso: input.nowIso ?? new Date().toISOString()
  };
}

export function extractEffectiveWorkflowText(userText: string): string {
  const normalized = normalizeVoiceCommandNoise(userText)
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return normalized;
  }

  const unicodeCorrected = extractUnicodeCorrection(normalized);
  if (unicodeCorrected) {
    return cleanCorrectedWorkflowText(unicodeCorrected);
  }

  const correctionPatterns = [
    /(?:^|[\s,;.!?])(?:нет|не|стоп)\s*,?\s*(?:не\s+\S+\s*,?\s*)?(?:лучше|давай\s+лучше)\s+(.+)$/iu,
    /(?:^|[\s,;.!?])(?:точнее|извиняюсь|я\s+имел(?:а)?\s+в\s+виду)\s*,?\s*(.+)$/iu,
    /(?:^|[\s,;.!?])(?:actually|instead|i\s+mean)\s*,?\s*(.+)$/iu
  ];

  for (const pattern of correctionPatterns) {
    const match = normalized.match(pattern);
    const corrected = match?.[1]?.trim();

    if (corrected) {
      return cleanCorrectedWorkflowText(corrected);
    }
  }

  return normalized;
}

function cleanCorrectedWorkflowText(text: string): string {
  return normalizeVoiceCommandNoise(text)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:нет|не|стоп|no|not)\s*,?\s*/iu, "")
    .replace(/^(?:точнее|извиняюсь|я\s+имел(?:а)?\s+в\s+виду)\s*,?\s*/iu, "")
    .replace(/^(?:нет|не|стоп|no|not)\s*,?\s*/iu, "")
    .replace(/^(?:лучше|давай\s+лучше)\s+/iu, "")
    .trim();
}

function extractUnicodeCorrection(text: string): string | undefined {
  const correctionPatterns = [
    /(?:^|[\s,;.!?])(?:нет|не|стоп)\s*,?\s*(?:не\s+\S+\s*,?\s*)?(?:лучше|давай\s+лучше)\s+(.+)$/iu,
    /(?:^|[\s,;.!?])(?:точнее|извиняюсь|я\s+имел(?:а)?\s+в\s+виду)\s*,?\s*(.+)$/iu,
    /(?:^|[\s,;.!?])(?:actually|instead|i\s+mean)\s*,?\s*(.+)$/iu
  ];

  for (const pattern of correctionPatterns) {
    const corrected = text.match(pattern)?.[1]?.trim();

    if (corrected) {
      return corrected;
    }
  }

  return undefined;
}

function rankFolderCandidates(
  paths: string[],
  query: string,
  candidateFolders: string[] = []
): WorkflowFolderCandidate[] {
  const folderQuery = parseOpenFileQueryParts(query).folderQuery;
  const normalizedQuery = normalizeComparable(folderQuery || query);
  const folders = uniqueStrings(
    paths.map((path) => getFolderPath(path)).filter(Boolean)
  );
  const rankedCandidateFolders = uniqueStrings(candidateFolders);

  return folders
    .map((folder) => {
      const candidateIndex = rankedCandidateFolders.indexOf(folder);
      const candidateBoost = candidateIndex >= 0 ? 900 - candidateIndex * 25 : 0;

      return {
        path: folder,
        name: folder.split("/").pop() ?? folder,
        score: scoreFolder(folder, normalizedQuery) + candidateBoost
      };
    })
    .filter((folder) => folder.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
}

function scoreFolder(folder: string, normalizedQuery: string): number {
  const name = folder.split("/").pop() ?? folder;
  const normalizedFolder = normalizeComparable(folder);
  const normalizedName = normalizeComparable(name);

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedName === normalizedQuery) {
    return 1000;
  }

  if (normalizedFolder === normalizedQuery) {
    return 900;
  }

  if (normalizedFolder.includes(normalizedQuery)) {
    return 500;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const covered = queryTokens.filter((token) => normalizedFolder.includes(token)).length;

  return covered ? covered * 100 : 0;
}

function getFolderPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

function getBasename(path: string): string {
  return (path.split("/").pop() ?? path).replace(/\.md$/i, "");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeComparable(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\\/]+/g, " ")
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
