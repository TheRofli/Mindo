import assert from "node:assert/strict";

import {
  getSidebarInteractionState,
  SidebarInteractionStateRenderer
} from "../src/views/sidebarInteractionStateRenderer";

type FakeButton = { disabled: boolean };
type FakeStatus = { text: string; setText(value: string): void };

const button = (): FakeButton => ({ disabled: false });

const status = (): FakeStatus => ({
  text: "",
  setText(value: string) {
    this.text = value;
  }
});

{
  const state = getSidebarInteractionState({
    isLoading: true,
    isRecording: false,
    isTranscribingVoice: false
  });

  assert.equal(state.inputDisabled, true);
  assert.equal(state.contextTogglesDisabled, true);
  assert.equal(state.micDisabled, true);
  assert.equal(state.liveDialogueDisabled, false);
  assert.equal(state.actionButtonsDisabled, true);
  assert.equal(state.hideSelectionToolbar, true);
  assert.equal(state.statusText, "Status: Waiting for LLM");
}

{
  const state = getSidebarInteractionState({
    isLoading: true,
    isRecording: true,
    isTranscribingVoice: false
  });

  assert.equal(state.micDisabled, false);
}

{
  const state = getSidebarInteractionState({
    isLoading: false,
    isRecording: false,
    isTranscribingVoice: true
  });

  assert.equal(state.inputDisabled, false);
  assert.equal(state.micDisabled, true);
  assert.equal(state.liveDialogueDisabled, true);
  assert.equal(state.actionButtonsDisabled, false);
  assert.equal(state.hideSelectionToolbar, false);
  assert.equal(state.statusText, null);
}

{
  const inputEl = button();
  const currentNoteEl = button();
  const vaultSearchEl = button();
  const micButtonEl = button();
  const liveDialogueButtonEl = button();
  const noteActionButton = button();
  const selectionButton = button();
  const statusEl = status();

  const renderer = new SidebarInteractionStateRenderer();
  renderer.apply(
    {
      inputEl,
      useCurrentNoteEl: currentNoteEl,
      useVaultSearchEl: vaultSearchEl,
      micButtonEl,
      liveDialogueButtonEl,
      noteActionButtons: [noteActionButton],
      selectionToolbarButtons: [selectionButton],
      statusEl
    },
    {
      isLoading: true,
      isRecording: false,
      isTranscribingVoice: false
    }
  );

  assert.equal(inputEl.disabled, true);
  assert.equal(currentNoteEl.disabled, true);
  assert.equal(vaultSearchEl.disabled, true);
  assert.equal(micButtonEl.disabled, true);
  assert.equal(liveDialogueButtonEl.disabled, false);
  assert.equal(noteActionButton.disabled, true);
  assert.equal(selectionButton.disabled, true);
  assert.equal(statusEl.text, "Status: Waiting for LLM");
}

console.log("sidebarInteractionStateRenderer tests passed");
