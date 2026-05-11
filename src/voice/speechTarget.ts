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
