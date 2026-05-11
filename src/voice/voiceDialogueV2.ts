import {
  createVoiceActivityState,
  reduceVoiceActivity,
  type VoiceActivityState
} from "./voiceActivity";
import { shouldAcceptLiveBargeInTranscript } from "./liveDialogue";

export type VoiceDialogueV2Phase =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking";

export interface VoiceDialogueV2State {
  phase: VoiceDialogueV2Phase;
  partialTranscript: string;
  finalTranscript: string;
  voiceActivity: VoiceActivityState;
  shouldAutoStopRecording: boolean;
  shouldSubmitVoiceTurn: boolean;
  shouldCancelAssistantSpeech: boolean;
  updatedAt: number;
}

export type VoiceDialogueV2Event =
  | { type: "start_listening"; now: number }
  | { type: "partial_transcript"; text: string; now: number }
  | { type: "final_transcript"; text: string; now: number }
  | {
      type: "audio_level";
      level: number;
      speechThreshold: number;
      silenceMs: number;
      now: number;
    }
  | { type: "send_pressed"; now: number }
  | { type: "stop_pressed"; now: number }
  | { type: "barge_in_transcript"; text: string; now: number }
  | { type: "assistant_thinking"; now: number }
  | { type: "assistant_speaking"; now: number }
  | { type: "assistant_done"; now: number }
  | { type: "reset"; now: number };

export function createVoiceDialogueV2State(
  partial: Partial<VoiceDialogueV2State> = {}
): VoiceDialogueV2State {
  return {
    phase: "idle",
    partialTranscript: "",
    finalTranscript: "",
    voiceActivity: createVoiceActivityState(),
    shouldAutoStopRecording: false,
    shouldSubmitVoiceTurn: false,
    shouldCancelAssistantSpeech: false,
    updatedAt: 0,
    ...partial
  };
}

export function reduceVoiceDialogueV2(
  state: VoiceDialogueV2State,
  event: VoiceDialogueV2Event
): VoiceDialogueV2State {
  if (event.type === "reset") {
    return createVoiceDialogueV2State({ updatedAt: event.now });
  }

  const base = {
    ...state,
    shouldAutoStopRecording: false,
    shouldSubmitVoiceTurn: false,
    shouldCancelAssistantSpeech: false,
    updatedAt: event.now
  };

  switch (event.type) {
    case "start_listening":
      return {
        ...base,
        phase: "listening",
        partialTranscript: "",
        finalTranscript: "",
        voiceActivity: createVoiceActivityState()
      };

    case "partial_transcript":
      return {
        ...base,
        partialTranscript: event.text
      };

    case "final_transcript":
      return {
        ...base,
        phase: "thinking",
        finalTranscript: event.text,
        partialTranscript: event.text,
        shouldSubmitVoiceTurn: Boolean(event.text.trim())
      };

    case "audio_level": {
      const voiceActivity = reduceVoiceActivity(base.voiceActivity, {
        type: "level",
        now: event.now,
        level: event.level,
        speechThreshold: event.speechThreshold,
        silenceMs: event.silenceMs
      });

      return {
        ...base,
        voiceActivity,
        shouldAutoStopRecording:
          base.phase === "listening" && voiceActivity.shouldAutoStop
      };
    }

    case "send_pressed":
      if (base.phase === "listening") {
        return {
          ...base,
          phase: "transcribing",
          shouldSubmitVoiceTurn: true
        };
      }

      return {
        ...base,
        shouldSubmitVoiceTurn: base.phase === "idle"
      };

    case "stop_pressed":
      return {
        ...base,
        phase: "transcribing"
      };

    case "barge_in_transcript":
      if (!shouldAcceptLiveBargeInTranscript(event.text)) {
        return base;
      }

      return {
        ...base,
        phase: "listening",
        partialTranscript: event.text,
        shouldCancelAssistantSpeech:
          base.phase === "speaking" || base.phase === "thinking"
      };

    case "assistant_thinking":
      return {
        ...base,
        phase: "thinking"
      };

    case "assistant_speaking":
      return {
        ...base,
        phase: "speaking"
      };

    case "assistant_done":
      return {
        ...base,
        phase: "idle"
      };
  }
}

export function shouldFlushStreamingTtsChunk(
  text: string,
  options: { minWords?: number; maxChars?: number } = {}
): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return false;
  }

  if (/[.!?…。！？]$/u.test(normalized)) {
    return true;
  }

  const minWords = options.minWords ?? 8;
  const maxChars = options.maxChars ?? 180;
  const words = normalized
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((word) => word.length > 0);

  return words.length >= minWords || normalized.length >= maxChars;
}
