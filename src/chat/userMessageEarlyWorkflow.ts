export interface EarlyUserMessageWorkflowInput {
  content: string;
  liveDialogue: boolean;
  hasOutgoingAttachments: boolean;
  handlePendingContexCodeInterviewAnswer: (content: string) => Promise<boolean>;
  handleLocalCommandText: (content: string) => Promise<boolean>;
  clearAttachedContext: () => void;
  continueLiveDialogueAfterLocalAction: () => Promise<void>;
  isLoading: () => boolean;
  hasActiveGenerationAbortController: () => boolean;
  setLoading: (loading: boolean) => void;
  clearPendingUserMessage: () => void;
  setSuppressActionReceiptUserContent: (value: boolean) => void;
}

export async function handleEarlyUserMessageWorkflow(
  input: EarlyUserMessageWorkflowInput
): Promise<boolean> {
  input.setSuppressActionReceiptUserContent(true);

  try {
    if (await input.handlePendingContexCodeInterviewAnswer(input.content)) {
      finalizeHandledUserMessage(input);
      return true;
    }

    if (await input.handleLocalCommandText(input.content)) {
      if (input.liveDialogue) {
        finalizeHandledUserMessage(input);
        await input.continueLiveDialogueAfterLocalAction();
        return true;
      }

      finalizeHandledUserMessage(input);
      return true;
    }

    return false;
  } finally {
    input.setSuppressActionReceiptUserContent(false);
  }
}

function finalizeHandledUserMessage(input: EarlyUserMessageWorkflowInput): void {
  if (input.hasOutgoingAttachments) {
    input.clearAttachedContext();
  }

  if (input.isLoading() && !input.hasActiveGenerationAbortController()) {
    input.setLoading(false);
  }

  input.clearPendingUserMessage();
}
