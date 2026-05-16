import {
  LIVE_TURN_VOICE_ACTIVITY,
  createVoiceActivityState,
  reduceVoiceActivity,
  type VoiceActivityState
} from "../../voice/voiceActivity";
import type { VoiceRecordingStopMode } from "../sidebarTypes";

export interface VoiceTurnAutoStopState {
  isRecording: boolean;
  isLiveDialogueSessionActive: boolean;
  isLiveDialogueTurn: boolean;
  recordingStopMode: VoiceRecordingStopMode;
  mediaRecorderState: RecordingState | null;
}

export interface VoiceTurnAutoStopControllerDeps {
  now: () => number;
  stopRecording: (mode: VoiceRecordingStopMode) => void;
}

export class VoiceTurnAutoStopController {
  private voiceActivityState: VoiceActivityState = createVoiceActivityState();

  constructor(private readonly deps: VoiceTurnAutoStopControllerDeps) {}

  handleLevel(level: number, state: VoiceTurnAutoStopState): boolean {
    if (
      !state.isRecording ||
      !state.isLiveDialogueSessionActive ||
      !state.isLiveDialogueTurn ||
      state.recordingStopMode !== "insert"
    ) {
      return false;
    }

    this.voiceActivityState = reduceVoiceActivity(this.voiceActivityState, {
      type: "level",
      now: this.deps.now(),
      level,
      ...LIVE_TURN_VOICE_ACTIVITY
    });

    if (
      this.voiceActivityState.shouldAutoStop &&
      state.mediaRecorderState !== "inactive"
    ) {
      this.deps.stopRecording("send");
      return true;
    }

    return false;
  }

  reset(): void {
    this.voiceActivityState = createVoiceActivityState();
  }
}
