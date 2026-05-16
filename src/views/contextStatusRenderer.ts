export interface ContextStatusViewInput {
  useCurrentNote: boolean;
  noteLabel: string | null;
  activeNoteText: string;
  noActiveNoteText: string;
}

export interface ContextStatusViewState {
  pillText: string;
  statusText: string;
  detailText: string | null;
  detailWarning: boolean;
}

export interface ContextStatusRendererElements {
  currentNotePillTextEl: HTMLElement | null;
  contextStatusEl: HTMLElement | null;
  contextDetailEl: HTMLElement | null;
}

export function getContextStatusViewState(
  input: ContextStatusViewInput
): ContextStatusViewState {
  const pillText = input.noteLabel ?? input.activeNoteText;

  if (!input.useCurrentNote) {
    return {
      pillText,
      statusText: "Context: Current note OFF",
      detailText: null,
      detailWarning: false
    };
  }

  return {
    pillText,
    statusText: "Context: Current note ON",
    detailText: input.noteLabel
      ? `${input.activeNoteText}: ${input.noteLabel}`
      : input.noActiveNoteText,
    detailWarning: !input.noteLabel
  };
}

export class ContextStatusRenderer {
  render(
    elements: ContextStatusRendererElements,
    input: ContextStatusViewInput
  ): void {
    const state = getContextStatusViewState(input);

    elements.currentNotePillTextEl?.setText(state.pillText);
    elements.contextStatusEl?.setText(state.statusText);

    if (!elements.contextDetailEl) {
      return;
    }

    elements.contextDetailEl.setText(state.detailText ?? "");
    elements.contextDetailEl.toggleClass(
      "contex-agent__context-detail--warning",
      state.detailWarning
    );
    elements.contextDetailEl.toggleClass(
      "contex-agent__hidden",
      !state.detailText
    );
  }
}
