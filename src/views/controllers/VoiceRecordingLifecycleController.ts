import type { ContexSettings } from "../../types";
import type { VoiceRecordingStopMode } from "../sidebarTypes";

export interface VoiceRecordingLifecycleControllerDeps {
  canRecord: () => boolean;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createMediaRecorder: (stream: MediaStream) => MediaRecorder;
  getIsLiveDialogueSessionActive: () => boolean;
  ensureLiveDialogueInputStream: () => Promise<MediaStream | null>;
  getMicrophoneStreamConstraints: () => MediaStreamConstraints;
  getLiveDialogueInputStream: () => MediaStream | null;
  getMediaRecorder: () => MediaRecorder | null;
  setMediaRecorder: (recorder: MediaRecorder | null) => void;
  getMediaStream: () => MediaStream | null;
  setMediaStream: (stream: MediaStream | null) => void;
  getRecordedAudioChunks: () => Blob[];
  setRecordedAudioChunks: (chunks: Blob[]) => void;
  getShouldTranscribeRecording: () => boolean;
  setShouldTranscribeRecording: (value: boolean) => void;
  getRecordingStopMode: () => VoiceRecordingStopMode;
  setRecordingStopMode: (mode: VoiceRecordingStopMode) => void;
  setIsRecording: (value: boolean) => void;
  setIsLiveDialogueTurn: (value: boolean) => void;
  setIsTranscribingVoice: (value: boolean) => void;
  getAutoStartLocalStt: () => boolean;
  ensureLocalSttServer: (force: boolean) => Promise<boolean>;
  transcribeAudio: (settings: ContexSettings, audio: Blob) => Promise<string>;
  getSettings: () => ContexSettings;
  sendTranscribedText: (
    text: string,
    options: { liveDialogue: boolean }
  ) => Promise<void>;
  appendTranscribedText: (text: string) => void;
  stopLiveBargeInMonitor: () => void;
  resetVoiceTurnAutoStop: () => void;
  addPromptRecordingClass: () => void;
  removePromptRecordingClass: () => void;
  startRecordingTimer: () => void;
  stopRecordingTimer: () => void;
  startVoiceLevelMeter: (stream: MediaStream) => void;
  stopVoiceLevelMeter: () => void;
  startLiveTranscriptPreview: () => void;
  stopLiveTranscriptPreview: () => void;
  restoreLiveTranscriptBaseText: () => void;
  clearLiveTranscriptPreviewState: () => void;
  updateMicButton: () => void;
  updateLiveDialogueButton: () => void;
  updateSendButton: () => void;
  setLoading: (isLoading: boolean) => void;
  setStatus: (status: string) => void;
  setSttStatusText: (
    text: string,
    tone: "ok" | "warning" | "busy"
  ) => void;
  pushActionTimeline: (type: "running", label: string) => void;
  refreshSttStatus: () => Promise<void>;
  setError: (message: string | null) => void;
  getErrorMessage: (error: unknown) => string;
}

export class VoiceRecordingLifecycleController {
  constructor(private readonly deps: VoiceRecordingLifecycleControllerDeps) {}

  async startRecording(): Promise<void> {
    if (!this.deps.canRecord()) {
      this.deps.setError(
        "Voice recording is not available in this Obsidian window."
      );
      return;
    }

    try {
      this.deps.stopLiveBargeInMonitor();
      this.deps.setError(null);
      this.deps.setRecordedAudioChunks([]);
      const mediaStream = this.deps.getIsLiveDialogueSessionActive()
        ? await this.deps.ensureLiveDialogueInputStream()
        : await this.deps.getUserMedia(
            this.deps.getMicrophoneStreamConstraints()
          );

      if (!mediaStream) {
        throw new Error("Live Dialogue microphone is not available.");
      }

      this.deps.setMediaStream(mediaStream);
      const mediaRecorder = this.deps.createMediaRecorder(mediaStream);
      this.deps.setMediaRecorder(mediaRecorder);
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          this.deps.setRecordedAudioChunks([
            ...this.deps.getRecordedAudioChunks(),
            event.data
          ]);
        }
      });
      mediaRecorder.addEventListener("stop", () => {
        void this.handleRecordingStop();
      });
      this.deps.setShouldTranscribeRecording(true);
      this.deps.setRecordingStopMode("insert");
      this.deps.resetVoiceTurnAutoStop();
      mediaRecorder.start();
      this.deps.setIsRecording(true);
      this.deps.addPromptRecordingClass();
      this.deps.startRecordingTimer();
      this.deps.startVoiceLevelMeter(mediaStream);
      this.deps.startLiveTranscriptPreview();
      this.deps.setStatus("Status: Listening");
      this.deps.setSttStatusText("STT: recording...", "busy");
      this.deps.updateMicButton();
      this.deps.updateSendButton();
    } catch (error) {
      this.cleanupRecording();
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Voice unavailable");
      void this.deps.refreshSttStatus();
    }
  }

  stopRecording(mode: VoiceRecordingStopMode): void {
    this.deps.setRecordingStopMode(mode);
    this.deps.setShouldTranscribeRecording(mode !== "discard");

    const mediaRecorder = this.deps.getMediaRecorder();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      return;
    }

    this.cleanupRecording();
  }

  async handleRecordingStop(): Promise<void> {
    const chunks = [...this.deps.getRecordedAudioChunks()];
    const shouldTranscribe = this.deps.getShouldTranscribeRecording();
    const stopMode = this.deps.getRecordingStopMode();
    this.cleanupRecording();

    if (!shouldTranscribe || !chunks.length) {
      if (!shouldTranscribe) {
        this.deps.restoreLiveTranscriptBaseText();
      }
      this.deps.clearLiveTranscriptPreviewState();
      this.deps.setStatus("Status: Ready");
      void this.deps.refreshSttStatus();
      return;
    }

    const audioBlob = new Blob(chunks, {
      type: chunks[0]?.type || "audio/webm"
    });

    this.deps.setIsTranscribingVoice(true);
    this.deps.setLoading(true);
    this.deps.updateSendButton();
    this.deps.setStatus(
      stopMode === "send"
        ? "Status: Transcribing and sending voice"
        : "Status: Transcribing voice"
    );
    this.deps.pushActionTimeline(
      "running",
      stopMode === "send" ? "Transcribing voice to send" : "Transcribing voice"
    );
    this.deps.setSttStatusText("STT: transcribing...", "busy");

    try {
      if (this.deps.getAutoStartLocalStt()) {
        const isReady = await this.deps.ensureLocalSttServer(true);

        if (!isReady) {
          throw new Error("Local STT server is not responding.");
        }
      }

      const text = await this.deps.transcribeAudio(
        this.deps.getSettings(),
        audioBlob
      );
      this.deps.setIsTranscribingVoice(false);
      this.deps.setLoading(false);

      if (stopMode === "send") {
        await this.deps.sendTranscribedText(text, {
          liveDialogue: this.deps.getIsLiveDialogueSessionActive()
        });
      } else {
        this.deps.appendTranscribedText(text);
        this.deps.setStatus("Status: Voice ready");
      }
      this.deps.clearLiveTranscriptPreviewState();
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Transcription failed");
    } finally {
      this.deps.setIsTranscribingVoice(false);
      this.deps.setLoading(false);
      this.deps.updateMicButton();
      this.deps.updateSendButton();
      void this.deps.refreshSttStatus();
    }
  }

  cleanupRecording(): void {
    this.deps.stopLiveTranscriptPreview();
    this.deps.stopVoiceLevelMeter();
    this.deps.stopRecordingTimer();
    this.deps.removePromptRecordingClass();

    const mediaStream = this.deps.getMediaStream();
    const liveDialogueInputStream = this.deps.getLiveDialogueInputStream();

    if (mediaStream && mediaStream !== liveDialogueInputStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    this.deps.setMediaStream(null);
    this.deps.setMediaRecorder(null);
    this.deps.setRecordedAudioChunks([]);
    this.deps.setIsRecording(false);
    this.deps.setIsLiveDialogueTurn(false);
    this.deps.resetVoiceTurnAutoStop();
    this.deps.updateMicButton();
    this.deps.updateLiveDialogueButton();
    this.deps.updateSendButton();
  }
}
