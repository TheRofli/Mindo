import type { CreateNoteProposal } from "../modals/CreateNoteModal";
import type { ChatMessage, SelectedTextContext } from "../types";
import { stripHiddenTtsHints } from "../voice/speechText";
import {
  buildRefineCreateNotePrompt,
  buildRefineCurrentNotePrompt
} from "../views/createNotePrompts";
import {
  extractFirstMarkdownHeadingTitle,
  stripDuplicateLeadingTitle
} from "../views/createNoteContent";
import { parseCreateNoteProposalText } from "../views/createNoteProposal";
import {
  isSafeCreateNotePath,
  sanitizeCreateNoteFilename,
  slugifyTitle
} from "../views/createNotePathUtils";

export interface PrepareCreateNoteProposalOptions {
  proposalText: string;
  fallbackFolder?: string;
  getUniqueNotePath: (path: string) => Promise<string>;
}

export interface PlaceCreateNoteProposalInFolderOptions {
  proposal: CreateNoteProposal;
  folder: string;
  getUniqueNotePath: (path: string) => Promise<string>;
}

export interface RefineCreateNoteProposalOptions<TSettings> {
  proposal: CreateNoteProposal;
  selectedContext: SelectedTextContext;
  instruction: string;
  settings: TSettings;
  createdAt?: number;
  onClearError?: () => void;
  onStatus?: (status: string) => void;
  requestLlmChatCompletion: (
    settings: TSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
  getUniqueNotePath: (path: string) => Promise<string>;
}

export interface RefineCurrentNoteProposalOptions<TSettings> {
  proposal: CreateNoteProposal;
  sourceContext: SelectedTextContext;
  instruction: string;
  fallbackFolder: string;
  promptLines: string[];
  settings: TSettings;
  createdAt?: number;
  onClearError?: () => void;
  onStatus?: (status: string) => void;
  requestLlmChatCompletion: (
    settings: TSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
  getUniqueNotePath: (path: string) => Promise<string>;
}

export async function prepareCreateNoteProposal(
  options: PrepareCreateNoteProposalOptions
): Promise<CreateNoteProposal> {
  const fallbackFolder = normalizeCreateNoteFolder(
    options.fallbackFolder ?? "Mindo Inbox"
  );
  const parsed = parseCreateNoteProposalText(options.proposalText);
  const rawContent = parsed.content ?? options.proposalText.trim();
  const title =
    sanitizeCreateNoteTitle(parsed.title) ||
    extractFirstMarkdownHeadingTitle(stripHiddenTtsHints(rawContent)) ||
    "Mindo Note";
  const requestedPath = isSafeCreateNotePath(parsed.path)
    ? normalizeCreateNotePath(parsed.path)
    : `${fallbackFolder}/${slugifyTitle(title)}.md`;
  const path = await options.getUniqueNotePath(requestedPath);
  const content = stripDuplicateLeadingTitle(
    stripHiddenTtsHints(rawContent),
    title,
    path
  );

  return {
    path,
    content
  };
}

export async function placeCreateNoteProposalInFolder(
  options: PlaceCreateNoteProposalInFolderOptions
): Promise<CreateNoteProposal> {
  const normalizedFolder = normalizeCreateNoteFolder(options.folder);
  const rawPath = normalizeCreateNotePath(options.proposal.path);
  const filename = sanitizeCreateNoteFilename(
    rawPath.split("/").pop(),
    options.proposal.content
  );
  const path = normalizedFolder ? `${normalizedFolder}/${filename}` : filename;

  return {
    ...options.proposal,
    path: await options.getUniqueNotePath(path)
  };
}

export async function refineCreateNoteProposal<TSettings>(
  options: RefineCreateNoteProposalOptions<TSettings>
): Promise<CreateNoteProposal> {
  const trimmedInstruction = options.instruction.trim();

  if (!trimmedInstruction) {
    return options.proposal;
  }

  options.onClearError?.();
  options.onStatus?.("Status: Updating note draft");

  try {
    const createdAt = options.createdAt ?? Date.now();
    const proposalText = await options.requestLlmChatCompletion(
      options.settings,
      [
        {
          id: `${createdAt}-refine-note`,
          role: "user",
          content: buildRefineCreateNotePrompt({
            selectedSourceText: options.selectedContext.text,
            currentPath: options.proposal.path,
            currentContent: options.proposal.content,
            instruction: trimmedInstruction
          }),
          createdAt
        }
      ]
    );

    return prepareCreateNoteProposal({
      proposalText,
      getUniqueNotePath: options.getUniqueNotePath
    });
  } finally {
    options.onStatus?.("Status: Ready");
  }
}

export async function refineCurrentNoteProposal<TSettings>(
  options: RefineCurrentNoteProposalOptions<TSettings>
): Promise<CreateNoteProposal> {
  const trimmedInstruction = options.instruction.trim();

  if (!trimmedInstruction) {
    return options.proposal;
  }

  options.onClearError?.();
  options.onStatus?.("Status: Updating note draft");

  try {
    const createdAt = options.createdAt ?? Date.now();
    const proposalText = await options.requestLlmChatCompletion(
      options.settings,
      [
        {
          id: `${createdAt}-refine-current-note-draft`,
          role: "user",
          content: buildRefineCurrentNotePrompt({
            fallbackFolder: options.fallbackFolder,
            sourcePath: options.sourceContext.path,
            sourceContent: options.sourceContext.text,
            currentPath: options.proposal.path,
            currentContent: options.proposal.content,
            instruction: trimmedInstruction
          }),
          createdAt
        }
      ]
    );

    return prepareCreateNoteProposal({
      proposalText,
      fallbackFolder: options.fallbackFolder,
      getUniqueNotePath: options.getUniqueNotePath
    });
  } finally {
    options.onStatus?.("Status: Ready");
  }
}

function normalizeCreateNoteFolder(folder: string): string {
  return folder
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/g, "");
}

function normalizeCreateNotePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

function sanitizeCreateNoteTitle(title: string | undefined): string | null {
  const cleaned = (title ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[{}[\]"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 3 || cleaned.toLowerCase() === "json") {
    return null;
  }

  return cleaned.slice(0, 90);
}
