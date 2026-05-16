import type { CreateNoteProposal } from "../modals/CreateNoteModal";
import type { ChatMessage } from "../types";
import { buildRefineResearchNotePrompt } from "../views/createNotePrompts";
import { parseCreateNoteProposalText } from "../views/createNoteProposal";
import {
  inferCreateNoteTitleFromCommand,
  slugifyTitle
} from "../views/createNotePathUtils";
import { stripDuplicateLeadingTitle } from "../views/createNoteContent";
import { stripHiddenTtsHints } from "../voice/speechText";

export interface PrepareResearchNoteProposalOptions {
  proposalText: string;
  targetFolder: string;
  commandText: string;
  getUniqueNotePath: (path: string) => Promise<string>;
}

export interface RefineResearchNoteProposalOptions<TSettings> {
  proposal: CreateNoteProposal;
  commandText: string;
  sourceText: string;
  targetFolder: string;
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

export async function prepareResearchNoteProposal(
  options: PrepareResearchNoteProposalOptions
): Promise<CreateNoteProposal> {
  const parsed = parseCreateNoteProposalText(options.proposalText);
  const title =
    sanitizeResearchTitle(parsed.title) ||
    inferResearchNoteTitle(options.commandText) ||
    "Mindo Research Note";
  const path = await options.getUniqueNotePath(
    `${normalizeResearchFolder(options.targetFolder)}/${slugifyTitle(title)}.md`
  );
  const rawContent = parsed.content ?? "";
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

export async function refineResearchNoteProposal<TSettings>(
  options: RefineResearchNoteProposalOptions<TSettings>
): Promise<CreateNoteProposal> {
  const trimmedInstruction = options.instruction.trim();

  if (!trimmedInstruction) {
    return options.proposal;
  }

  options.onClearError?.();
  options.onStatus?.("Status: Refining research note");

  try {
    const createdAt = options.createdAt ?? Date.now();
    const proposalText = await options.requestLlmChatCompletion(
      options.settings,
      [
        {
          id: `${createdAt}-refine-research-note`,
          role: "user",
          content: buildRefineResearchNotePrompt({
            commandText: options.commandText,
            sourceText: options.sourceText,
            currentContent: options.proposal.content,
            instruction: trimmedInstruction
          }),
          createdAt
        }
      ]
    );

    return prepareResearchNoteProposal({
      proposalText,
      targetFolder: options.targetFolder,
      commandText: options.commandText,
      getUniqueNotePath: options.getUniqueNotePath
    });
  } finally {
    options.onStatus?.("Status: Ready");
  }
}

function normalizeResearchFolder(folder: string): string {
  return (
    folder
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+$/g, "") || "Mindo Inbox"
  );
}

function sanitizeResearchTitle(title: string | undefined): string | null {
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

function inferResearchNoteTitle(commandText: string): string {
  return (
    sanitizeResearchTitle(
      inferCreateNoteTitleFromCommand(commandText, "Mindo Research Note")
    ) ?? "Mindo Research Note"
  );
}
