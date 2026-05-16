export interface VoiceActivityState {
  hasSpeech: boolean;
  isSpeechActive: boolean;
  isSpeechConfirmed: boolean;
  firstSpeechAt: number;
  confirmedSpeechAt: number;
  lastSpeechAt: number;
  speechFrameCount: number;
  silenceStartedAt: number;
  shouldAutoStop: boolean;
}

export interface VoiceActivityTuning {
  speechThreshold: number;
  silenceMs: number;
  minSpeechMs?: number;
  minSpeechFrames?: number;
  confirmationMs?: number;
  confirmationFrames?: number;
}

export const LIVE_TURN_VOICE_ACTIVITY: VoiceActivityTuning = {
  speechThreshold: 0.045,
  silenceMs: 2000,
  minSpeechMs: 420,
  minSpeechFrames: 3,
  confirmationMs: 180,
  confirmationFrames: 2
};

export const LIVE_BARGE_IN_VOICE_ACTIVITY: VoiceActivityTuning = {
  speechThreshold: 0.042,
  silenceMs: 1200,
  minSpeechMs: 120,
  minSpeechFrames: 1,
  confirmationMs: 40,
  confirmationFrames: 1
};

export type VoiceActivityEvent =
  | {
      type: "level";
      now: number;
      level: number;
      speechThreshold: number;
      silenceMs: number;
      minSpeechMs?: number;
      minSpeechFrames?: number;
      confirmationMs?: number;
      confirmationFrames?: number;
    }
  | { type: "reset" };

export function createVoiceActivityState(): VoiceActivityState {
  return {
    hasSpeech: false,
    isSpeechActive: false,
    isSpeechConfirmed: false,
    firstSpeechAt: 0,
    confirmedSpeechAt: 0,
    lastSpeechAt: 0,
    speechFrameCount: 0,
    silenceStartedAt: 0,
    shouldAutoStop: false
  };
}

export function reduceVoiceActivity(
  state: VoiceActivityState,
  event: VoiceActivityEvent
): VoiceActivityState {
  if (event.type === "reset") {
    return createVoiceActivityState();
  }

  const isSpeech = event.level >= event.speechThreshold;

  if (isSpeech) {
    const firstSpeechAt = state.firstSpeechAt || event.now;
    const speechFrameCount = state.speechFrameCount + 1;
    const speechDurationMs = event.now - firstSpeechAt;
    const confirmationMs = event.confirmationMs ?? event.minSpeechMs ?? 0;
    const confirmationFrames =
      event.confirmationFrames ?? event.minSpeechFrames ?? 1;
    const isSpeechConfirmed =
      state.isSpeechConfirmed ||
      (speechFrameCount >= confirmationFrames &&
        speechDurationMs >= confirmationMs);

    return {
      hasSpeech: true,
      isSpeechActive: true,
      isSpeechConfirmed,
      firstSpeechAt,
      confirmedSpeechAt:
        state.confirmedSpeechAt || (isSpeechConfirmed ? event.now : 0),
      lastSpeechAt: event.now,
      speechFrameCount,
      silenceStartedAt: 0,
      shouldAutoStop: false
    };
  }

  if (!state.hasSpeech) {
    return {
      ...state,
      isSpeechActive: false,
      shouldAutoStop: false
    };
  }

  const silenceStartedAt = state.silenceStartedAt || event.now;
  const minSpeechMs = event.minSpeechMs ?? 0;
  const minSpeechFrames = event.minSpeechFrames ?? 1;
  const speechDurationMs =
    state.firstSpeechAt && state.lastSpeechAt
      ? state.lastSpeechAt - state.firstSpeechAt
      : 0;
  const hasEnoughSpeech =
    state.speechFrameCount >= minSpeechFrames && speechDurationMs >= minSpeechMs;

  return {
    ...state,
    isSpeechActive: false,
    silenceStartedAt,
    shouldAutoStop:
      hasEnoughSpeech && event.now - silenceStartedAt >= event.silenceMs
  };
}

export function isVoiceActivityConfirmed(state: VoiceActivityState): boolean {
  return state.isSpeechConfirmed && state.confirmedSpeechAt > 0;
}

export function getNormalizedAudioLevelFromTimeDomainData(
  data: Uint8Array
): number {
  if (!data.length) {
    return 0;
  }

  let sumSquares = 0;

  for (const value of data) {
    const sample = (value - 128) / 128;
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / data.length);

  return Math.min(1, rms * 5);
}
