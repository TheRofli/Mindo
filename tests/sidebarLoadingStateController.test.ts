import assert from "node:assert/strict";
import { SidebarLoadingStateController } from "../src/views/controllers/SidebarLoadingStateController";

const calls: string[] = [];
let loadingState = false;
let hideSelectionToolbar = false;

const controller = new SidebarLoadingStateController({
  setIsLoading: (value) => {
    loadingState = value;
    calls.push(`loading:${value}`);
  },
  pushActionTimeline: (type, label) => calls.push(`timeline:${type}:${label}`),
  getInteractionElements: () => ({
    inputEl: null,
    useCurrentNoteEl: null,
    useVaultSearchEl: null,
    micButtonEl: null,
    liveDialogueButtonEl: null,
    noteActionButtons: [],
    selectionToolbarButtons: [],
    statusEl: null
  }),
  getInteractionState: () => ({
    isLoading: loadingState,
    isRecording: false,
    isTranscribingVoice: false
  }),
  applyInteractionState: () => ({ hideSelectionToolbar }),
  updateSendButton: () => calls.push("send"),
  hideSelectionToolbar: () => calls.push("hide-toolbar"),
  refreshLiveDialogueSurface: () => calls.push("refresh"),
  syncBargeInMonitor: () => calls.push("sync")
});

controller.setLoading(true);
assert.equal(loadingState, true);
assert.deepEqual(calls, [
  "loading:true",
  "timeline:thinking:Assistant is thinking",
  "send",
  "refresh",
  "sync"
]);

calls.length = 0;
hideSelectionToolbar = true;
controller.setLoading(false);
assert.equal(loadingState, false);
assert.deepEqual(calls, [
  "loading:false",
  "timeline:done:Assistant is ready",
  "send",
  "hide-toolbar",
  "refresh",
  "sync"
]);

console.log("sidebarLoadingStateController tests passed");
