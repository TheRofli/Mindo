import { isVoiceActivityConfirmed, type VoiceActivityState } from "../../voice/voiceActivity";

export interface LiveBargeInAudioState {
  isLiveDialogueActive: boolean;
  isAssistantBusy: boolean;
  isRecording: boolean;
  isTranscribingVoice: boolean;
  isAlreadyHandling: boolean;
  now: number;
  lastHandledAt?: number;
}

export class LiveDialogueController {
  shouldInterruptSpeech(isLiveDialogueActive: boolean, isSpeaking: boolean): boolean {
    return isLiveDialogueActive && isSpeaking;
  }

  shouldKeepBargeInAudioMonitor(
    isLiveDialogueActive: boolean,
    hasLiveInputStream: boolean
  ): boolean {
    return isLiveDialogueActive && hasLiveInputStream;
  }

  shouldInterruptFromAudio(
    state: LiveBargeInAudioState,
    voiceActivity: VoiceActivityState
  ): boolean {
    return (
      state.isLiveDialogueActive &&
      state.isAssistantBusy &&
      !state.isRecording &&
      !state.isTranscribingVoice &&
      !state.isAlreadyHandling &&
      (!state.lastHandledAt || state.now - state.lastHandledAt >= 900) &&
      isVoiceActivityConfirmed(voiceActivity)
    );
  }
}
