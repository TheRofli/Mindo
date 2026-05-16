import type { LocalCommandAction } from "../sidebarTypes";
import {
  extractCreateNoteCommandSegment,
  extractVoiceRefineInstruction,
  extractVoiceReplacement,
  extractVoiceTextReplacement,
  getEffectiveLocalCommandText,
  isCreateNoteCommand,
  isBareOpenFileCorrection,
  isOpenLastFileReference,
  isPlainOpenFileCommand,
  isResearchNoteCommand,
  isVoiceAcceptCommand,
  isVoiceImproveSelectionCommand,
  isVoiceReadLastAnswerCommand,
  isVoiceRejectCommand,
  isVoiceStopSpeakingCommand,
  isVoiceUndoCommand,
  normalizeNoisyLocalCommandText,
  parseVoiceMemoryIntent,
  parseVoiceNoteAction,
  parseVoiceOpenFileQuery,
  parseVoiceSemanticVaultQuery,
  parseVoiceVaultSearchQuery,
  parseVoiceWebResearchQuery,
  shouldRouteThroughSemanticIntentRouter
} from "../sidebarPureHelpers";

export interface LocalCommandActionResolverDeps {
  findLatestDiffMessage: (
    status: "pending" | "applied"
  ) => { id: string } | null;
  resolveWorkflowLocalCommandAction: (
    trimmedText: string,
    effectiveCommandText: string
  ) => LocalCommandAction | null;
  resolveOpenFileCandidate: (query: string) => unknown;
  resolveSemanticLocalCommandAction: (
    commandText: string,
    effectiveCommandText?: string
  ) => Promise<LocalCommandAction | null>;
}

export class LocalCommandActionResolver {
  constructor(private readonly deps: LocalCommandActionResolverDeps) {}

  async resolve(trimmedText: string): Promise<LocalCommandAction | null> {
    const commandText = normalizeNoisyLocalCommandText(trimmedText);
    const effectiveCommandText = getEffectiveLocalCommandText(commandText);
    const createCommandText =
      extractCreateNoteCommandSegment(effectiveCommandText) ??
      (effectiveCommandText !== commandText
        ? null
        : extractCreateNoteCommandSegment(commandText));

    if (isVoiceStopSpeakingCommand(effectiveCommandText)) {
      return {
        kind: "stop-speaking"
      };
    }

    if (isVoiceReadLastAnswerCommand(effectiveCommandText)) {
      return {
        kind: "read-last-answer"
      };
    }

    const pendingDiffMessage = this.deps.findLatestDiffMessage("pending");

    if (pendingDiffMessage && isVoiceAcceptCommand(effectiveCommandText)) {
      return {
        kind: "apply-diff",
        messageId: pendingDiffMessage.id
      };
    }

    if (pendingDiffMessage && isVoiceRejectCommand(effectiveCommandText)) {
      return {
        kind: "reject-diff",
        messageId: pendingDiffMessage.id
      };
    }

    if (pendingDiffMessage) {
      const refineInstruction = extractVoiceRefineInstruction(effectiveCommandText);

      if (refineInstruction) {
        return {
          kind: "refine-diff",
          messageId: pendingDiffMessage.id,
          instruction: refineInstruction
        };
      }
    }

    const appliedDiffMessage = this.deps.findLatestDiffMessage("applied");

    if (appliedDiffMessage && isVoiceUndoCommand(effectiveCommandText)) {
      return {
        kind: "undo-diff",
        messageId: appliedDiffMessage.id
      };
    }

    if (isVoiceImproveSelectionCommand(effectiveCommandText)) {
      return {
        kind: "improve-selection"
      };
    }

    const workflowAction = this.deps.resolveWorkflowLocalCommandAction(
      trimmedText,
      effectiveCommandText
    );

    if (workflowAction) {
      return workflowAction;
    }

    const deterministicOpenFileQuery =
      parseVoiceOpenFileQuery(effectiveCommandText);
    const shouldTryDeterministicOpen =
      Boolean(deterministicOpenFileQuery) &&
      shouldUseDeterministicOpenFile(effectiveCommandText);
    const deterministicOpenFileCandidate =
      shouldTryDeterministicOpen && deterministicOpenFileQuery
        ? this.deps.resolveOpenFileCandidate(deterministicOpenFileQuery)
        : null;

    if (
      deterministicOpenFileQuery &&
      shouldTryDeterministicOpen &&
      deterministicOpenFileCandidate
    ) {
      return {
        kind: "open-file",
        commandText: trimmedText,
        query: deterministicOpenFileQuery
      };
    }

    if (createCommandText && isResearchNoteCommand(createCommandText)) {
      return {
        kind: "research-note",
        commandText: createCommandText,
        displayText: trimmedText
      };
    }

    if (createCommandText && isCreateNoteCommand(createCommandText)) {
      return {
        kind: "create-note",
        commandText: createCommandText,
        displayText: trimmedText
      };
    }

    const shouldTrySemanticAction = shouldRouteThroughSemanticIntentRouter(
      commandText,
      effectiveCommandText,
      createCommandText
    );

    if (shouldTrySemanticAction) {
      const semanticAction = await this.deps.resolveSemanticLocalCommandAction(
        commandText,
        effectiveCommandText
      );

      if (semanticAction) {
        return semanticAction;
      }
    }

    const textReplacement = extractVoiceTextReplacement(effectiveCommandText);

    if (textReplacement) {
      return {
        kind: "replace-text",
        commandText: trimmedText,
        replacement: textReplacement
      };
    }

    const replacement = extractVoiceReplacement(effectiveCommandText);

    if (replacement) {
      return {
        kind: "replace-selection-or-line",
        commandText: trimmedText,
        suggested: replacement
      };
    }

    const noteAction = parseVoiceNoteAction(effectiveCommandText);

    if (noteAction) {
      return {
        kind: "note-action",
        action: noteAction,
        commandText: effectiveCommandText
      };
    }

    if (isResearchNoteCommand(effectiveCommandText)) {
      return {
        kind: "research-note",
        commandText: effectiveCommandText,
        displayText: trimmedText
      };
    }

    if (isCreateNoteCommand(effectiveCommandText)) {
      return {
        kind: "create-note",
        commandText: effectiveCommandText,
        displayText: trimmedText
      };
    }

    if (isOpenLastFileReference(effectiveCommandText)) {
      return {
        kind: "open-last-file",
        commandText: trimmedText
      };
    }

    const openFileQuery =
      deterministicOpenFileQuery ?? parseVoiceOpenFileQuery(effectiveCommandText);

    if (openFileQuery) {
      if (
        shouldTrySemanticAction &&
        shouldTryDeterministicOpen &&
        !deterministicOpenFileCandidate
      ) {
        return null;
      }

      return {
        kind: "open-file",
        commandText: trimmedText,
        query: openFileQuery
      };
    }

    const webResearchQuery = parseVoiceWebResearchQuery(effectiveCommandText);

    if (webResearchQuery) {
      return {
        kind: "research-web",
        query: webResearchQuery
      };
    }

    const semanticVaultQuery = parseVoiceSemanticVaultQuery(effectiveCommandText);

    if (semanticVaultQuery) {
      return {
        kind: "semantic-vault",
        query: semanticVaultQuery
      };
    }

    const vaultSearchQuery = parseVoiceVaultSearchQuery(effectiveCommandText);

    if (vaultSearchQuery) {
      return {
        kind: "search-vault",
        query: vaultSearchQuery
      };
    }

    const memoryIntent = parseVoiceMemoryIntent(effectiveCommandText);

    if (memoryIntent === "summarize-last-file") {
      return {
        kind: "summarize-last-file",
        commandText: trimmedText
      };
    }

    if (memoryIntent === "open-last-file") {
      return {
        kind: "open-last-file"
      };
    }

    if (memoryIntent === "attach-last-results") {
      return {
        kind: "attach-last-results"
      };
    }

    return null;
  }
}

function shouldUseDeterministicOpenFile(commandText: string): boolean {
  return (
    isPlainOpenFileCommand(commandText) ||
    isBareOpenFileCorrection(commandText)
  );
}
