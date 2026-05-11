export type VoiceSessionStatus = "idle" | "recording" | "transcribing";
export type VoiceStopMode = "insert" | "send";

export interface VoiceSessionState {
  status: VoiceSessionStatus;
  startedAt: number;
  elapsedMs: number;
  stopMode: VoiceStopMode;
}

export type VoiceSessionEvent =
  | { type: "start"; now: number }
  | { type: "tick"; now: number }
  | { type: "stop_insert"; now: number }
  | { type: "send"; now: number }
  | { type: "finish" };

export function createVoiceSessionState(): VoiceSessionState {
  return {
    status: "idle",
    startedAt: 0,
    elapsedMs: 0,
    stopMode: "insert"
  };
}

export function reduceVoiceSession(
  state: VoiceSessionState,
  event: VoiceSessionEvent
): VoiceSessionState {
  if (event.type === "start") {
    return {
      status: "recording",
      startedAt: event.now,
      elapsedMs: 0,
      stopMode: "insert"
    };
  }

  if (event.type === "tick" && state.status === "recording") {
    return {
      ...state,
      elapsedMs: Math.max(0, event.now - state.startedAt)
    };
  }

  if (event.type === "stop_insert") {
    return {
      ...state,
      status: "transcribing",
      elapsedMs: Math.max(0, event.now - state.startedAt),
      stopMode: "insert"
    };
  }

  if (event.type === "send") {
    return {
      ...state,
      status: "transcribing",
      elapsedMs: Math.max(0, event.now - state.startedAt),
      stopMode: "send"
    };
  }

  if (event.type === "finish") {
    return createVoiceSessionState();
  }

  return state;
}
