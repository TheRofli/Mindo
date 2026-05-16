import type {
  ChatMessage,
  ContexSettings,
  LlmRequestContext
} from "../types";

export type LlmStreamCompletion = (
  settings: ContexSettings,
  messages: ChatMessage[],
  context: LlmRequestContext | null | undefined,
  onToken: (token: string) => void,
  signal?: AbortSignal
) => Promise<string>;

export type LlmRequestCompletion = (
  settings: ContexSettings,
  messages: ChatMessage[],
  context?: LlmRequestContext | null
) => Promise<string>;

export interface LlmResponseSpeechQueue {
  pushToken(token: string): void;
}

export interface RunLlmAssistantResponseOptions {
  settings: ContexSettings;
  requestMessages: ChatMessage[];
  requestContext?: LlmRequestContext | null;
  assistantMessage: ChatMessage;
  abortSignal: AbortSignal;
  speechQueue?: LlmResponseSpeechQueue | null;
  onToken: () => void;
  onStreamingFallback: () => void;
  streamCompletion: LlmStreamCompletion;
  requestCompletion: LlmRequestCompletion;
}

export async function runLlmAssistantResponse({
  settings,
  requestMessages,
  requestContext,
  assistantMessage,
  abortSignal,
  speechQueue,
  onToken,
  onStreamingFallback,
  streamCompletion,
  requestCompletion
}: RunLlmAssistantResponseOptions): Promise<void> {
  try {
    const streamedContent = await streamCompletion(
      settings,
      requestMessages,
      requestContext,
      (token) => {
        if (abortSignal.aborted) {
          return;
        }

        assistantMessage.content += token;
        speechQueue?.pushToken(token);
        onToken();
      },
      abortSignal
    );

    assertGenerationActive(abortSignal);

    if (streamedContent.trim()) {
      assistantMessage.content = streamedContent;
    }
  } catch (streamError) {
    if (assistantMessage.content.trim()) {
      throw streamError;
    }

    onStreamingFallback();
    await requestFallbackAnswer({
      settings,
      requestMessages,
      requestContext,
      assistantMessage,
      abortSignal,
      speechQueue,
      requestCompletion
    });
  }

  if (!assistantMessage.content.trim()) {
    await requestFallbackAnswer({
      settings,
      requestMessages,
      requestContext,
      assistantMessage,
      abortSignal,
      speechQueue,
      requestCompletion
    });
  }
}

async function requestFallbackAnswer({
  settings,
  requestMessages,
  requestContext,
  assistantMessage,
  abortSignal,
  speechQueue,
  requestCompletion
}: {
  settings: ContexSettings;
  requestMessages: ChatMessage[];
  requestContext?: LlmRequestContext | null;
  assistantMessage: ChatMessage;
  abortSignal: AbortSignal;
  speechQueue?: LlmResponseSpeechQueue | null;
  requestCompletion: LlmRequestCompletion;
}): Promise<void> {
  assistantMessage.content = await requestCompletion(
    settings,
    requestMessages,
    requestContext
  );
  speechQueue?.pushToken(assistantMessage.content);
  assertGenerationActive(abortSignal);
}

function assertGenerationActive(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new Error("Mindo generation canceled.");
  }
}
