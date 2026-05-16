import assert from "node:assert/strict";

import {
  VoiceRecordingLifecycleController,
  type VoiceRecordingLifecycleControllerDeps
} from "../src/views/controllers/VoiceRecordingLifecycleController";
import type { VoiceRecordingStopMode } from "../src/views/sidebarTypes";

class FakeRecorder {
  state: RecordingState = "inactive";
  readonly listeners = new Map<string, Array<(event?: any) => void>>();
  startCalls = 0;
  stopCalls = 0;

  addEventListener(type: string, listener: (event?: any) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  start(): void {
    this.state = "recording";
    this.startCalls += 1;
  }

  stop(): void {
    this.state = "inactive";
    this.stopCalls += 1;
  }

  emitData(data: Blob): void {
    for (const listener of this.listeners.get("dataavailable") ?? []) {
      listener({ data });
    }
  }
}

function makeTrack() {
  return {
    stopped: false,
    stop() {
      this.stopped = true;
    }
  };
}

function makeStream(track = makeTrack()) {
  return {
    track,
    getTracks() {
      return [track];
    }
  };
}

function makeController(
  overrides: Partial<VoiceRecordingLifecycleControllerDeps> = {}
) {
  const state = {
    chunks: [] as Blob[],
    mediaRecorder: null as MediaRecorder | null,
    mediaStream: null as MediaStream | null,
    shouldTranscribe: true,
    stopMode: "insert" as VoiceRecordingStopMode,
    isRecording: false,
    isLiveDialogueTurn: false,
    isTranscribing: false,
    isLiveDialogueSessionActive: false,
    liveDialogueInputStream: null as MediaStream | null,
    autoStartLocalStt: false
  };
  const calls: string[] = [];
  const deps = {
    canRecord: () => true,
    getUserMedia: async () => makeStream() as unknown as MediaStream,
    createMediaRecorder: (stream: MediaStream) => {
      const recorder = new FakeRecorder();
      state.mediaStream = stream;
      return recorder as unknown as MediaRecorder;
    },
    getIsLiveDialogueSessionActive: () => state.isLiveDialogueSessionActive,
    ensureLiveDialogueInputStream: async () =>
      state.liveDialogueInputStream,
    getMicrophoneStreamConstraints: () => ({ audio: true }),
    getLiveDialogueInputStream: () => state.liveDialogueInputStream,
    getMediaRecorder: () => state.mediaRecorder,
    setMediaRecorder: (recorder: MediaRecorder | null) => {
      state.mediaRecorder = recorder;
    },
    getMediaStream: () => state.mediaStream,
    setMediaStream: (stream: MediaStream | null) => {
      state.mediaStream = stream;
    },
    getRecordedAudioChunks: () => state.chunks,
    setRecordedAudioChunks: (chunks: Blob[]) => {
      state.chunks = chunks;
    },
    getShouldTranscribeRecording: () => state.shouldTranscribe,
    setShouldTranscribeRecording: (value: boolean) => {
      state.shouldTranscribe = value;
    },
    getRecordingStopMode: () => state.stopMode,
    setRecordingStopMode: (mode: VoiceRecordingStopMode) => {
      state.stopMode = mode;
    },
    setIsRecording: (value: boolean) => {
      state.isRecording = value;
    },
    setIsLiveDialogueTurn: (value: boolean) => {
      state.isLiveDialogueTurn = value;
    },
    setIsTranscribingVoice: (value: boolean) => {
      state.isTranscribing = value;
    },
    getAutoStartLocalStt: () => state.autoStartLocalStt,
    ensureLocalSttServer: async () => true,
    transcribeAudio: async () => "hello world",
    getSettings: () => ({}) as VoiceRecordingLifecycleControllerDeps extends {
      getSettings: () => infer Settings;
    }
      ? Settings
      : never,
    sendTranscribedText: async (text: string, options: { liveDialogue: boolean }) => {
      calls.push(`send:${text}:${options.liveDialogue}`);
    },
    appendTranscribedText: (text: string) => {
      calls.push(`append:${text}`);
    },
    stopLiveBargeInMonitor: () => calls.push("stop-barge-in"),
    resetVoiceTurnAutoStop: () => calls.push("reset-auto-stop"),
    addPromptRecordingClass: () => calls.push("prompt-recording"),
    removePromptRecordingClass: () => calls.push("prompt-idle"),
    startRecordingTimer: () => calls.push("timer-start"),
    stopRecordingTimer: () => calls.push("timer-stop"),
    startVoiceLevelMeter: () => calls.push("meter-start"),
    stopVoiceLevelMeter: () => calls.push("meter-stop"),
    startLiveTranscriptPreview: () => calls.push("preview-start"),
    stopLiveTranscriptPreview: () => calls.push("preview-stop"),
    restoreLiveTranscriptBaseText: () => calls.push("preview-restore"),
    clearLiveTranscriptPreviewState: () => calls.push("preview-clear"),
    updateMicButton: () => calls.push("mic"),
    updateLiveDialogueButton: () => calls.push("live-button"),
    updateSendButton: () => calls.push("send-button"),
    setLoading: (value: boolean) => calls.push(`loading:${value}`),
    setStatus: (value: string) => calls.push(`status:${value}`),
    setSttStatusText: (text: string, tone: string) =>
      calls.push(`stt:${tone}:${text}`),
    pushActionTimeline: (type: string, label: string) =>
      calls.push(`timeline:${type}:${label}`),
    refreshSttStatus: async () => calls.push("stt-refresh"),
    setError: (message: string | null) => calls.push(`error:${message ?? ""}`),
    getErrorMessage: (error: unknown) =>
      error instanceof Error ? error.message : String(error)
  };
  const merged = { ...deps, ...overrides };

  return {
    controller: new VoiceRecordingLifecycleController(merged),
    calls,
    state
  };
}

{
  const { controller, calls, state } = makeController();

  await controller.startRecording();
  const recorder = state.mediaRecorder as unknown as FakeRecorder;
  recorder.emitData(new Blob(["abc"], { type: "audio/webm" }));

  assert.equal(recorder.startCalls, 1);
  assert.equal(state.chunks.length, 1);
  assert.equal(state.isRecording, true);
  assert.equal(state.stopMode, "insert");
  assert.equal(state.shouldTranscribe, true);
  assert.deepEqual(calls.slice(0, 4), [
    "stop-barge-in",
    "error:",
    "reset-auto-stop",
    "prompt-recording"
  ]);
  assert.equal(calls.includes("timer-start"), true);
  assert.equal(calls.includes("meter-start"), true);
  assert.equal(calls.includes("preview-start"), true);
}

{
  const { controller, state } = makeController();
  const recorder = new FakeRecorder();
  recorder.state = "recording";
  state.mediaRecorder = recorder as unknown as MediaRecorder;

  controller.stopRecording("send");

  assert.equal(state.stopMode, "send");
  assert.equal(state.shouldTranscribe, true);
  assert.equal(recorder.stopCalls, 1);
}

{
  const { controller, calls, state } = makeController();
  const track = makeTrack();
  state.mediaStream = makeStream(track) as unknown as MediaStream;
  state.mediaRecorder = new FakeRecorder() as unknown as MediaRecorder;
  state.chunks = [new Blob(["abc"])];
  state.isRecording = true;
  state.isLiveDialogueTurn = true;

  controller.cleanupRecording();

  assert.equal(track.stopped, true);
  assert.equal(state.mediaRecorder, null);
  assert.equal(state.mediaStream, null);
  assert.equal(state.chunks.length, 0);
  assert.equal(state.isRecording, false);
  assert.equal(state.isLiveDialogueTurn, false);
  assert.equal(calls.includes("preview-stop"), true);
  assert.equal(calls.includes("timer-stop"), true);
  assert.equal(calls.includes("meter-stop"), true);
}

{
  const { controller, calls, state } = makeController();
  state.chunks = [new Blob(["abc"], { type: "audio/webm" })];
  state.shouldTranscribe = true;
  state.stopMode = "send";
  state.isLiveDialogueSessionActive = true;

  await controller.handleRecordingStop();

  assert.equal(calls.includes("loading:true"), true);
  assert.equal(calls.includes("loading:false"), true);
  assert.equal(calls.includes("timeline:running:Transcribing voice to send"), true);
  assert.equal(calls.includes("send:hello world:true"), true);
  assert.equal(state.isTranscribing, false);
}

console.log("voiceRecordingLifecycleController tests passed");
