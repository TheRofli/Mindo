import {
  isLiveStopOnlyCommand,
  shouldHandleLiveBargeIn
} from "../../voice/liveDialogue";
import {
  isVoiceActivityConfirmed,
  type VoiceActivityState
} from "../../voice/voiceActivity";

export interface LiveBargeInAudioState {
  isLiveDialogueActive: boolean;
  isAssistantBusy: boolean;
  isRecording: boolean;
  isTranscribingVoice: boolean;
  isAlreadyHandling: boolean;
  now: number;
  lastHandledAt?: number;
}

export interface LiveBargeInTranscriptState {
  transcript: string;
  assistantText?: string | null;
  isLiveDialogueActive: boolean;
  isAssistantBusy: boolean;
  isRecording: boolean;
  isAlreadyHandling: boolean;
  now: number;
  lastHandledAt?: number;
}

export type LiveBargeInTranscriptDecision =
  | {
      kind: "ignore";
      prompt: "";
    }
  | {
      kind: "stop" | "prompt";
      prompt: string;
    };

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

  resolveBargeInTranscript(
    state: LiveBargeInTranscriptState
  ): LiveBargeInTranscriptDecision {
    if (state.isAlreadyHandling) {
      return {
        kind: "ignore",
        prompt: ""
      };
    }

    if (
      !shouldHandleLiveBargeIn({
        transcript: state.transcript,
        assistantText: state.assistantText ?? "",
        isLiveDialogueActive: state.isLiveDialogueActive,
        isAssistantBusy: state.isAssistantBusy,
        isRecording: state.isRecording,
        now: state.now,
        lastHandledAt: state.lastHandledAt
      })
    ) {
      return {
        kind: "ignore",
        prompt: ""
      };
    }

    const prompt = state.transcript.replace(/\s+/g, " ").trim();

    if (!prompt) {
      return {
        kind: "ignore",
        prompt: ""
      };
    }

    return {
      kind: isLiveStopOnlyCommand(prompt) ? "stop" : "prompt",
      prompt
    };
  }
}
