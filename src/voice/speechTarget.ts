export function findLatestAssistantSpeechMessage<
  T extends { role: string; content: string; createdAt: number }
>(messages: T[]): T | null {
  return (
    [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" && message.content.trim().length > 0
      ) ?? null
  );
}

export interface SpeechTarget {
  id: string;
  content: string;
}

export interface SpeechTargetFileContext {
  content: string;
}

export type SpeechTargetFileReader = (
  path: string
) => Promise<SpeechTargetFileContext | null>;

interface SpeechTargetMessage {
  id: string;
  role: string;
  content: string;
  createdAt: number;
  actionReceipt?: {
    label: string;
    path?: string;
  };
  diffPreview?: {
    suggested: string;
  };
  vaultSearchResults?: unknown[];
}

export async function findLatestSpeechTargetFromMessages<
  T extends SpeechTargetMessage
>(
  messages: T[],
  readMarkdownFileContext?: SpeechTargetFileReader
): Promise<SpeechTarget | null> {
  const latestAnswer = findLatestAssistantSpeechMessage(
    messages.filter(
      (message) =>
        message.actionReceipt?.label !== "Reading latest answer" &&
        !message.actionReceipt &&
        !message.vaultSearchResults
    )
  );

  if (latestAnswer) {
    return {
      id: latestAnswer.id,
      content: latestAnswer.content
    };
  }

  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") {
      continue;
    }

    if (message.actionReceipt?.label === "Reading latest answer") {
      continue;
    }

    if (message.diffPreview?.suggested.trim()) {
      return {
        id: `${message.id}-diff-speech`,
        content: message.diffPreview.suggested
      };
    }

    if (message.actionReceipt?.path && readMarkdownFileContext) {
      const context = await readMarkdownFileContext(message.actionReceipt.path);

      if (context?.content.trim()) {
        return {
          id: `${message.id}-file-speech`,
          content: context.content
        };
      }
    }

    if (message.content.trim() && !message.vaultSearchResults) {
      return {
        id: message.id,
        content: message.content
      };
    }
  }

  return null;
}
