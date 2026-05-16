export type OpenAiStreamTokenHandler = (token: string) => void;

export async function readOpenAIStream(
  body: ReadableStream<Uint8Array>,
  onToken: OpenAiStreamTokenHandler,
  signal?: AbortSignal
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new Error("Mindo generation canceled.");
    }

    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const result = parseStreamLine(line);

      if (result.done) {
        return content;
      }

      if (result.content) {
        content += result.content;
        onToken(result.content);
      }
    }
  }

  buffer += decoder.decode();

  for (const line of buffer.split(/\r?\n/)) {
    const result = parseStreamLine(line);

    if (result.done) {
      return content;
    }

    if (result.content) {
      content += result.content;
      onToken(result.content);
    }
  }

  return content;
}

export function readOpenAIStreamText(
  text: string,
  onToken: OpenAiStreamTokenHandler,
  signal?: AbortSignal
): string {
  let content = "";

  for (const line of text.split(/\r?\n/)) {
    if (signal?.aborted) {
      throw new Error("Mindo generation canceled.");
    }

    const result = parseStreamLine(line);

    if (result.done) {
      return content;
    }

    if (result.content) {
      content += result.content;
      onToken(result.content);
    }
  }

  return content;
}

function parseStreamLine(line: string): { done: boolean; content: string | null } {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) {
    return {
      done: false,
      content: null
    };
  }

  const data = trimmed.slice("data:".length).trim();

  if (data === "[DONE]") {
    return {
      done: true,
      content: null
    };
  }

  try {
    return {
      done: false,
      content: extractStreamDelta(JSON.parse(data))
    };
  } catch {
    return {
      done: false,
      content: null
    };
  }
}

function extractStreamDelta(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return null;
  }

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice)) {
    return null;
  }

  const delta = firstChoice.delta;
  if (isRecord(delta)) {
    return normalizeContent(delta.content);
  }

  const message = firstChoice.message;
  if (isRecord(message)) {
    return normalizeContent(message.content);
  }

  return normalizeContent(firstChoice.text);
}

function normalizeContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const text = content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (!isRecord(part)) {
        return "";
      }

      if (typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("");

  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
