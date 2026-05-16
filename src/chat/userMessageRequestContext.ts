import type {
  CurrentNoteContext,
  LlmFileAttachment,
  LlmRequestContext,
  VaultSearchResult
} from "../types";

export interface UserMessageRequestContextInput {
  content: string;
  liveDialogue?: boolean;
  useCurrentNote: boolean;
  useVaultSearch: boolean;
  outgoingAttachments: LlmFileAttachment[] | null;
  attachedVaultResults: VaultSearchResult[] | null;
  readCurrentNoteContext: () => Promise<{
    context: CurrentNoteContext | null;
  }>;
  expandSemanticVaultQuery: (query: string) => Promise<string[]>;
  searchSemanticVault: (
    query: string,
    queryVariants: string[],
    limit: number
  ) => Promise<VaultSearchResult[]>;
}

export interface UserMessageRequestContextResult {
  context: LlmRequestContext | null;
  usedAttachedFiles: boolean;
  usedAttachedVaultResults: boolean;
}

export async function buildUserMessageRequestContext(
  input: UserMessageRequestContextInput
): Promise<UserMessageRequestContextResult> {
  const context: LlmRequestContext = {};

  if (input.liveDialogue) {
    context.liveDialogue = true;
  }

  if (input.useCurrentNote) {
    context.currentNote = (await input.readCurrentNoteContext()).context;
  }

  const usedAttachedVaultResults = Boolean(input.attachedVaultResults?.length);

  if (input.attachedVaultResults?.length) {
    context.vaultResults = input.attachedVaultResults;
  } else if (
    input.useVaultSearch &&
    input.content &&
    !input.outgoingAttachments?.length
  ) {
    context.vaultResults = await input.searchSemanticVault(
      input.content,
      await input.expandSemanticVaultQuery(input.content),
      8
    );
  }

  const usedAttachedFiles = Boolean(input.outgoingAttachments?.length);

  if (input.outgoingAttachments?.length) {
    context.attachments = input.outgoingAttachments;
  }

  return {
    context: hasUserMessageRequestContext(context) ? context : null,
    usedAttachedFiles,
    usedAttachedVaultResults
  };
}

function hasUserMessageRequestContext(context: LlmRequestContext): boolean {
  return Boolean(
    context.currentNote ||
      context.vaultResults?.length ||
      context.attachments?.length ||
      context.liveDialogue
  );
}
