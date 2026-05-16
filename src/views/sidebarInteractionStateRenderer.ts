export interface SidebarInteractionStateInput {
  isLoading: boolean;
  isRecording: boolean;
  isTranscribingVoice: boolean;
}

export interface SidebarInteractionState {
  inputDisabled: boolean;
  contextTogglesDisabled: boolean;
  micDisabled: boolean;
  liveDialogueDisabled: boolean;
  actionButtonsDisabled: boolean;
  hideSelectionToolbar: boolean;
  statusText: string | null;
}

interface DisabledElementLike {
  disabled: boolean;
}

interface StatusElementLike {
  setText(value: string): void;
}

export interface SidebarInteractionElements {
  inputEl: DisabledElementLike | null;
  useCurrentNoteEl: DisabledElementLike | null;
  useVaultSearchEl: DisabledElementLike | null;
  micButtonEl: DisabledElementLike | null;
  liveDialogueButtonEl: DisabledElementLike | null;
  noteActionButtons: Iterable<DisabledElementLike>;
  selectionToolbarButtons: Iterable<DisabledElementLike>;
  statusEl: StatusElementLike | null;
}

export function getSidebarInteractionState(
  input: SidebarInteractionStateInput
): SidebarInteractionState {
  return {
    inputDisabled: input.isLoading,
    contextTogglesDisabled: input.isLoading,
    micDisabled:
      (input.isLoading && !input.isRecording) || input.isTranscribingVoice,
    liveDialogueDisabled: input.isTranscribingVoice,
    actionButtonsDisabled: input.isLoading,
    hideSelectionToolbar: input.isLoading,
    statusText: input.isLoading ? "Status: Waiting for LLM" : null
  };
}

export class SidebarInteractionStateRenderer {
  apply(
    elements: SidebarInteractionElements,
    input: SidebarInteractionStateInput
  ): SidebarInteractionState {
    const state = getSidebarInteractionState(input);

    if (elements.inputEl) {
      elements.inputEl.disabled = state.inputDisabled;
    }

    if (elements.useCurrentNoteEl) {
      elements.useCurrentNoteEl.disabled = state.contextTogglesDisabled;
    }

    if (elements.useVaultSearchEl) {
      elements.useVaultSearchEl.disabled = state.contextTogglesDisabled;
    }

    if (elements.micButtonEl) {
      elements.micButtonEl.disabled = state.micDisabled;
    }

    if (elements.liveDialogueButtonEl) {
      elements.liveDialogueButtonEl.disabled = state.liveDialogueDisabled;
    }

    for (const button of elements.noteActionButtons) {
      button.disabled = state.actionButtonsDisabled;
    }

    for (const button of elements.selectionToolbarButtons) {
      button.disabled = state.actionButtonsDisabled;
    }

    if (state.statusText) {
      elements.statusEl?.setText(state.statusText);
    }

    return state;
  }
}
