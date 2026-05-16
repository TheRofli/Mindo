import type { ChatMessage } from "../types";
import { trimTextForContext } from "../text/textUtils";
import { buildLiveDialogueActionSpeech } from "./liveDialogue";
import { stripHiddenTtsHints } from "./speechText";

export type LiveDialoguePhase =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "transcribing";

export interface LiveDialogueSurfaceInput {
  isSessionActive: boolean;
  isRecording: boolean;
  isLoading: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  latestUserText: string;
  latestAssistantText: string;
  messages?: ChatMessage[];
  liveInput?: string;
  streamingMessageId?: string | null;
  maxTranscriptItems?: number;
}

export type LiveDialogueTranscriptVariant = "message" | "question" | "status";

export interface LiveDialogueTranscriptItem {
  role: "assistant" | "user";
  text: string;
  variant: LiveDialogueTranscriptVariant;
}

export interface LiveDialogueSurfaceState {
  isActive: boolean;
  phase: LiveDialoguePhase;
  rootClass: string;
  hideStandardWorkspace: boolean;
  showVoiceSurface: boolean;
  transcript: LiveDialogueTranscriptItem[];
}

export function getLiveDialogueSurfaceState(
  input: LiveDialogueSurfaceInput
): LiveDialogueSurfaceState {
  if (!input.isSessionActive) {
    return {
      isActive: false,
      phase: "idle",
      rootClass: "",
      hideStandardWorkspace: false,
      showVoiceSurface: false,
      transcript: []
    };
  }

  const phase = getLiveDialoguePhase(input);
  const transcript = buildLiveDialogueTranscript(input);

  return {
    isActive: true,
    phase,
    rootClass: `is-live-dialogue-surface-active is-live-dialogue-${phase}`,
    hideStandardWorkspace: true,
    showVoiceSurface: true,
    transcript
  };
}

function getLiveDialoguePhase(
  input: LiveDialogueSurfaceInput
): LiveDialoguePhase {
  if (input.isRecording) {
    return "listening";
  }

  if (input.isTranscribing) {
    return "transcribing";
  }

  if (input.isSpeaking) {
    return "speaking";
  }

  if (input.isLoading) {
    return "thinking";
  }

  return "idle";
}

function buildLiveDialogueTranscript(
  input: LiveDialogueSurfaceInput
): LiveDialogueTranscriptItem[] {
  const transcript = input.messages?.length
    ? buildLiveDialogueTranscriptFromMessages(input)
    : buildLegacyLiveDialogueTranscript(input);

  return compactLiveDialogueTranscript(transcript).slice(
    -(input.maxTranscriptItems ?? 8)
  );
}

function buildLegacyLiveDialogueTranscript(
  input: LiveDialogueSurfaceInput
): LiveDialogueTranscriptItem[] {
  const assistantText = input.latestAssistantText.trim();
  const userText = input.latestUserText.trim();
  const transcript: LiveDialogueTranscriptItem[] = [];

  if (assistantText) {
    transcript.push(createLiveDialogueTranscriptItem("assistant", assistantText));
  }

  if (userText) {
    transcript.push(createLiveDialogueTranscriptItem("user", userText));
  }

  return transcript;
}

function buildLiveDialogueTranscriptFromMessages(
  input: LiveDialogueSurfaceInput
): LiveDialogueTranscriptItem[] {
  const transcript = (input.messages ?? [])
    .filter(
      (message) =>
        (message.role === "assistant" || message.role === "user") &&
        (message.content.trim() || message.actionReceipt)
    )
    .map((message) =>
      createLiveDialogueTranscriptItem(
        message.role,
        message.actionReceipt
          ? buildLiveDialogueActionSpeech(message.actionReceipt)
          : trimTextForContext(
              stripHiddenTtsHints(message.content),
              message.role === "assistant" ? 900 : 360
            )
      )
    );
  const liveInput = input.liveInput?.trim() ?? "";

  if (input.isRecording && liveInput) {
    transcript.push(
      createLiveDialogueTranscriptItem(
        "user",
        trimTextForContext(liveInput, 260)
      )
    );
  }

  if (!transcript.length) {
    return buildLegacyLiveDialogueTranscript(input);
  }

  return transcript;
}

function createLiveDialogueTranscriptItem(
  role: "assistant" | "user",
  text: string
): LiveDialogueTranscriptItem {
  return {
    role,
    text,
    variant:
      role === "assistant" && looksLikeLiveDialogueQuestion(text)
        ? "question"
        : "message"
  };
}

function compactLiveDialogueTranscript(
  transcript: LiveDialogueTranscriptItem[]
): LiveDialogueTranscriptItem[] {
  const compacted: LiveDialogueTranscriptItem[] = [];

  for (const item of transcript) {
    const previous = compacted.at(-1);

    if (
      previous &&
      previous.role === item.role &&
      normalizeLiveDialogueText(previous.text) === normalizeLiveDialogueText(item.text)
    ) {
      continue;
    }

    compacted.push(item);
  }

  return compacted;
}

function normalizeLiveDialogueText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function looksLikeLiveDialogueQuestion(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length > 180) {
    return false;
  }

  return /[?？]\s*$/u.test(trimmed);
}

export function getLiveDialogueLatestUserText(options: {
  messages: ChatMessage[];
  liveInput: string;
  isRecording: boolean;
}): string {
  const liveInput = options.liveInput.trim();

  if (options.isRecording && liveInput) {
    return trimTextForContext(liveInput, 240);
  }

  const latestUserMessage = [...options.messages]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim());

  return latestUserMessage
    ? trimTextForContext(latestUserMessage.content, 240)
    : "";
}

export function getLiveDialogueLatestAssistantText(options: {
  messages: ChatMessage[];
  streamingMessageId: string | null;
}): string {
  const streamingMessage = options.streamingMessageId
    ? options.messages.find((message) => message.id === options.streamingMessageId)
    : null;
  const latestAssistantMessage =
    streamingMessage?.content.trim() || streamingMessage?.actionReceipt
      ? streamingMessage
      : [...options.messages]
          .reverse()
          .find(
            (message) =>
              message.role === "assistant" &&
              (message.content.trim() || message.actionReceipt)
          );

  if (!latestAssistantMessage) {
    return "";
  }

  if (latestAssistantMessage.actionReceipt) {
    return trimTextForContext(
      buildLiveDialogueActionSpeech(latestAssistantMessage.actionReceipt),
      260
    );
  }

  return trimTextForContext(
    stripHiddenTtsHints(latestAssistantMessage.content),
    900
  );
}

export function getLiveDialoguePhaseLabel(phase: LiveDialoguePhase): string {
  switch (phase) {
    case "listening":
      return "Listening";
    case "transcribing":
      return "Transcribing";
    case "thinking":
      return "Thinking";
    case "speaking":
      return "Speaking";
    case "idle":
    default:
      return "Live Dialogue";
  }
}

export function getLiveDialogueOrbTitle(options: {
  phase: LiveDialoguePhase;
  isSessionActive: boolean;
  startLabel: string;
  stopLabel: string;
}): string {
  switch (options.phase) {
    case "listening":
      return "Send current voice turn";
    case "transcribing":
      return "Transcribing voice";
    case "thinking":
      return "Cancel response";
    case "speaking":
      return "Stop speaking";
    case "idle":
    default:
      return options.isSessionActive ? options.stopLabel : options.startLabel;
  }
}

export function getLiveDialogueFallbackText(phase: LiveDialoguePhase): string {
  switch (phase) {
    case "listening":
      return "I am listening.";
    case "transcribing":
      return "Turning your voice into text.";
    case "thinking":
      return "Thinking through your request.";
    case "speaking":
      return "Answering out loud.";
    case "idle":
    default:
      return "Live dialogue is ready.";
  }
}
