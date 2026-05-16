import type { ActionTimelineEventType } from "../../actions/actionTimeline";

export interface SidebarLoadingInteractionElements {
  inputEl: HTMLTextAreaElement | null;
  useCurrentNoteEl: HTMLInputElement | null;
  useVaultSearchEl: HTMLInputElement | null;
  micButtonEl: HTMLButtonElement | null;
  liveDialogueButtonEl: HTMLButtonElement | null;
  noteActionButtons: HTMLButtonElement[];
  selectionToolbarButtons: HTMLButtonElement[];
  statusEl: HTMLElement | null;
}

export interface SidebarLoadingInteractionState {
  isLoading: boolean;
  isRecording: boolean;
  isTranscribingVoice: boolean;
}

export interface SidebarLoadingInteractionResult {
  hideSelectionToolbar: boolean;
}

export interface SidebarLoadingStateControllerDeps {
  setIsLoading: (isLoading: boolean) => void;
  pushActionTimeline: (
    type: ActionTimelineEventType,
    label: string
  ) => void;
  getInteractionElements: () => SidebarLoadingInteractionElements;
  getInteractionState: () => SidebarLoadingInteractionState;
  applyInteractionState: (
    elements: SidebarLoadingInteractionElements,
    state: SidebarLoadingInteractionState
  ) => SidebarLoadingInteractionResult;
  updateSendButton: () => void;
  hideSelectionToolbar: () => void;
  refreshLiveDialogueSurface: () => void;
  syncBargeInMonitor: () => void;
}

export class SidebarLoadingStateController {
  constructor(private readonly deps: SidebarLoadingStateControllerDeps) {}

  setLoading(isLoading: boolean): void {
    this.deps.setIsLoading(isLoading);
    this.deps.pushActionTimeline(
      isLoading ? "thinking" : "done",
      isLoading ? "Assistant is thinking" : "Assistant is ready"
    );

    const interactionState = this.deps.applyInteractionState(
      this.deps.getInteractionElements(),
      this.deps.getInteractionState()
    );

    this.deps.updateSendButton();

    if (interactionState.hideSelectionToolbar) {
      this.deps.hideSelectionToolbar();
    }

    this.deps.refreshLiveDialogueSurface();
    this.deps.syncBargeInMonitor();
  }
}
