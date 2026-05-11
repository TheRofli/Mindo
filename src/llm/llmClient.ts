import { requestUrl } from "obsidian";
import type {
  ChatMessage,
  ContexSettings,
  CurrentNoteContext,
  LlmRequestContext,
  LlmFileAttachment,
  SelectedTextContext,
  VaultSearchResult,
  WebSearchResult
} from "../types";
import { buildLiveDialogueSystemInstruction } from "../voice/liveDialogue";
import { buildWikiLiveBrief } from "../wiki/wikiLiveBrief";

const BASE_SYSTEM_PROMPT =
  "You are Contex Agent, an AI assistant inside Obsidian.";

type OpenAIChatRole = "system" | "user" | "assistant";
type OpenAIChatContent =
  | string
  | Array<
      | {
          type: "text";
          text: string;
        }
      | {
          type: "image_url";
          image_url: {
            url: string;
          };
        }
    >;

interface OpenAIChatMessage {
  role: OpenAIChatRole;
  content: OpenAIChatContent;
}

interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  temperature: number;
  stream?: boolean;
}

export type LlmStreamTokenHandler = (token: string) => void;

export async function requestLlmChatCompletion(
  settings: ContexSettings,
  messages: ChatMessage[],
  context?: LlmRequestContext | null
): Promise<string> {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);

  if (!baseUrl) {
    throw new Error("Base URL is empty.");
  }

  let response;
  try {
    response = await requestUrl({
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      contentType: "application/json",
      headers: createRequestHeaders(settings, "application/json"),
      body: JSON.stringify(
        createChatCompletionRequest(settings, messages, context)
      ),
      throw: false
    });
  } catch (error) {
    throw new Error(`Could not reach LLM endpoint. ${getErrorMessage(error)}`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `LLM endpoint returned HTTP ${response.status}. ${getServerErrorMessage(
        response.json,
        response.text
      )}`.trim()
    );
  }

  const assistantContent = extractAssistantContent(response.json);

  if (!assistantContent) {
    throw new Error("LLM response did not include assistant content.");
  }

  return assistantContent;
}

export async function streamLlmChatCompletion(
  settings: ContexSettings,
  messages: ChatMessage[],
  context: LlmRequestContext | null | undefined,
  onToken: LlmStreamTokenHandler,
  signal?: AbortSignal
): Promise<string> {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);

  if (!baseUrl) {
    throw new Error("Base URL is empty.");
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...createRequestHeaders(settings, "text/event-stream"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        createChatCompletionRequest(settings, messages, context, true)
      ),
      signal
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new Error("Contex generation canceled.");
    }

    throw new Error(`Could not reach streaming LLM endpoint. ${getErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(
      `Streaming LLM endpoint returned HTTP ${response.status}. ${(
        await response.text()
      ).trim()}`
    );
  }

  if (!response.body) {
    throw new Error("Streaming LLM response did not include a readable body.");
  }

  return readOpenAIStream(response.body, onToken, signal);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function createChatCompletionRequest(
  settings: ContexSettings,
  messages: ChatMessage[],
  context?: LlmRequestContext | null,
  stream = false
): OpenAIChatCompletionRequest {
  return {
    model: settings.model,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(settings)
      },
      ...buildContextMessages(context, settings),
      ...messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    ],
    temperature: settings.temperature,
    stream: stream ? true : undefined
  };
}

function buildSystemPrompt(settings: ContexSettings): string {
  const prompt = [BASE_SYSTEM_PROMPT];

  if (settings.sileroVoice === "eugene") {
    prompt.push(
      "When replying in Russian and referring to yourself in first person, use masculine grammatical forms for yourself, for example: \"я согласен\", \"я готов\", \"я посмотрел\". You are still Contex Agent; only your Russian first-person grammar follows the selected voice."
    );
  } else {
    prompt.push(
      "When replying in Russian and referring to yourself in first person, use feminine grammatical forms for yourself, for example: \"я согласна\", \"я готова\", \"я посмотрела\". You are still Contex Agent; only your Russian first-person grammar follows the selected voice."
    );
  }

  prompt.push(
    "For normal Russian chat answers only, when you include a Latin-script technical term or acronym, you may add an invisible TTS hint immediately after that visible term using an HTML comment, for example: Markdown<!--contex-tts:маркдаун--> or ONNX<!--contex-tts:он эн эн икс-->. The visible answer must remain unchanged because Markdown rendering hides the comment. Never use these comments in code blocks, JSON, note drafts, text replacements, file paths, URLs, or any content intended to be applied to a vault file."
  );
  prompt.push(
    "When Contex Wiki context includes Prompt Library entries, use them as reusable intent patterns for routing, editing, research, Wiki updates, attachments, and live voice replies. Do not quote the prompt library unless the user asks; apply the relevant pattern quietly."
  );

  return prompt.join(" ");
}

function createRequestHeaders(
  settings: ContexSettings,
  accept: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept
  };

  const apiKey = settings.apiKey.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

function buildContextMessages(
  context?: LlmRequestContext | null,
  settings?: ContexSettings
): OpenAIChatMessage[] {
  if (
    !context?.currentNote &&
    !context?.selectedText &&
    !context?.vaultResults?.length &&
    !context?.projectMemory?.trim() &&
    !context?.attachments?.length &&
    !context?.webResults?.length &&
    !context?.liveDialogue
  ) {
    return [];
  }

  const messages: OpenAIChatMessage[] = [];

  if (context.liveDialogue) {
    messages.push({
      role: "system",
      content: buildLiveDialogueSystemInstruction()
    });
  }

  if (context.currentNote) {
    messages.push({
      role: "system",
      content: formatCurrentNoteContext(context.currentNote)
    });
  }

  if (context.selectedText) {
    messages.push({
      role: "system",
      content: formatSelectedTextContext(context.selectedText)
    });
  }

  if (context.vaultResults?.length) {
    messages.push({
      role: "system",
      content: context.liveDialogue
        ? buildWikiLiveBrief(context.vaultResults)
        : formatVaultSearchContext(context.vaultResults)
    });
  }

  if (context.projectMemory?.trim()) {
    messages.push({
      role: "system",
      content: formatProjectMemoryContext(context.projectMemory)
    });
  }

  if (context.attachments?.length) {
    messages.push(
      formatAttachmentContext(
        context.attachments,
        Boolean(settings?.supportsVision)
      )
    );
  }

  if (context.webResults?.length) {
    messages.push({
      role: "system",
      content: formatWebResearchContext(context)
    });
  }

  return messages;
}

function formatAttachmentContext(
  attachments: LlmFileAttachment[],
  includeImages: boolean
): OpenAIChatMessage {
  const textParts = [
    "The user attached files to the current message.",
    "Use readable text attachments as context. Use attached images when vision is supported by the selected local model. If a binary file cannot be inspected, say that clearly instead of pretending.",
    "",
    ...attachments.map((attachment, index) =>
      [
        `Attachment ${index + 1}: ${attachment.name}`,
        `Type: ${attachment.type || "unknown"}`,
        `Size: ${attachment.size} bytes`,
        attachment.text
          ? ["Text excerpt:", attachment.text.slice(0, 8000)].join("\n")
          : attachment.dataUrl
            ? "Image data is attached below."
            : "Binary content is not readable in this chat request."
      ].join("\n")
    )
  ];
  const imageParts = attachments
    .filter(
      (attachment) =>
        includeImages && attachment.dataUrl?.startsWith("data:image/")
    )
    .map((attachment) => ({
      type: "image_url" as const,
      image_url: {
        url: attachment.dataUrl as string
      }
    }));

  if (!imageParts.length) {
    return {
      role: "user",
      content: textParts.join("\n\n")
    };
  }

  return {
    role: "user",
    content: [
      {
        type: "text",
        text: textParts.join("\n\n")
      },
      ...imageParts
    ]
  };
}

function formatProjectMemoryContext(projectMemory: string): string {
  return [
    "Durable Contex project memory from the user's vault is included below.",
    "Use it as background context for decisions, terminology, constraints, and ongoing project direction. Do not treat it as an instruction to change files by itself.",
    "",
    projectMemory
  ].join("\n");
}

function formatVaultSearchContext(results: VaultSearchResult[]): string {
  return [
    "Relevant Markdown notes from the user's vault search are included below. Use them when helpful, and cite note paths when referring to specific notes.",
    "",
    ...results.map((result, index) =>
      [
        `Result ${index + 1}: ${result.path}`,
        `Title: ${result.title}`,
        `Score: ${result.score}`,
        "Snippet:",
        result.snippet
      ].join("\n")
    )
  ].join("\n\n");
}

function formatWebResearchContext(context: LlmRequestContext): string {
  const results = context.webResults ?? [];

  return [
    "Current web search results are included below because the user's task may require fresh or recently changed information.",
    "Use these results when they are relevant. Cite URLs or source titles for concrete current claims. If the results are weak, say that clearly.",
    context.webResearchReason ? `Why web was used: ${context.webResearchReason}` : "",
    context.webResearchQuery ? `User research need: ${context.webResearchQuery}` : "",
    context.webSearchQuery && context.webSearchQuery !== context.webResearchQuery
      ? `Search query: ${context.webSearchQuery}`
      : "",
    context.webResearchProvider ? `Provider: ${context.webResearchProvider}` : "",
    context.webResearchFallbackReason
      ? `Fallback: ${context.webResearchFallbackReason}`
      : "",
    `Date checked: ${new Date().toISOString().slice(0, 10)}`,
    "",
    ...results.map((result, index) =>
      formatWebSearchResultForContext(result, index)
    )
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formatWebSearchResultForContext(
  result: WebSearchResult,
  index: number
): string {
  return [
    `Web source ${index + 1}`,
    `Title: ${result.title}`,
    `URL: ${result.url}`,
    result.source ? `Engine: ${result.source}` : "",
    result.sourceType ? `Type: ${result.sourceType}` : "",
    result.publishedDate ? `Published: ${result.publishedDate}` : "",
    result.freshnessHint ? `Date signal: ${result.freshnessHint}` : "",
    result.qualityNotes?.length
      ? `Quality notes: ${result.qualityNotes.join("; ")}`
      : "",
    `Snippet: ${result.snippet}`
  ]
    .filter(Boolean)
    .join("\n");
}

function formatCurrentNoteContext(context: CurrentNoteContext): string {
  const truncationNotice = context.isTruncated
    ? `\nNote: The current note is longer than the included context. Only the first ${context.includedLength} of ${context.originalLength} characters are included.`
    : "";

  return [
    "The user enabled current note context. Use the note below when it is relevant to the user's request.",
    "Do not claim you changed the note or any vault files.",
    "",
    `Current note path: ${context.path}`,
    `Current note name: ${context.name}`,
    truncationNotice,
    "",
    "Current note content:",
    context.content
  ].join("\n");
}

function formatSelectedTextContext(context: SelectedTextContext): string {
  const truncationNotice = context.isTruncated
    ? `\nNote: The selected text is longer than the included context. Only the first ${context.includedLength} of ${context.originalLength} characters are included.`
    : "";

  return [
    "The user selected text in the active note. Use the selected text below when it is relevant to the user's request.",
    "Do not modify the note or claim you changed any vault files. Reply in chat only.",
    "",
    `Selection source path: ${context.path}`,
    `Selection source note: ${context.name}`,
    truncationNotice,
    "",
    "Selected text:",
    context.text
  ].join("\n");
}

async function readOpenAIStream(
  body: ReadableStream<Uint8Array>,
  onToken: LlmStreamTokenHandler,
  signal?: AbortSignal
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new Error("Contex generation canceled.");
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

function extractAssistantContent(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return null;
  }

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice)) {
    return null;
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

function getServerErrorMessage(payload: unknown, fallbackText: string): string {
  if (isRecord(payload)) {
    if (isRecord(payload.error) && typeof payload.error.message === "string") {
      return payload.error.message;
    }

    if (typeof payload.error === "string") {
      return payload.error;
    }

    if (typeof payload.message === "string") {
      return payload.message;
    }
  }

  return fallbackText.trim();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
