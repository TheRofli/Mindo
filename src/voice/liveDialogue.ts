import type { ActionReceipt } from "../types";

export type LiveDialogueAcknowledgementKind =
  | "thinking"
  | "opening"
  | "editing"
  | "researching";

export function createLiveDialogueGreeting(): string {
  return "Привет, я слушаю. Чем помочь?";
}

export function buildLiveDialogueSystemInstruction(): string {
  return [
    "You are in Mindo Live Dialogue mode.",
    "Reply like a spoken assistant, not like a long document.",
    "Keep answers concise, warm, and easy to listen to.",
    "Keep normal replies under 45 words unless the user explicitly asks for a long explanation.",
    "Prefer one short paragraph or 2-3 very short bullets.",
    "If the user asks what is in the current note or says things like \"перескажи\", \"что здесь\", \"what is here\", summarize the note instead of reading it verbatim.",
    "If current note context is provided, treat it as direct access to that note's text: summarize, explain, or answer from it, and do not say you lack access to the file.",
    "Prefer 2-5 short spoken points for note summaries.",
    "Never read a whole note aloud unless the user explicitly asks for exact full text.",
    "If the user asks for a long task, briefly say what you will do, perform the action, then give a short spoken result.",
    "When the user is exploring, ask one brief useful follow-up question instead of ending with a generic offer.",
    "If the user hesitates, says they are thinking, or pauses mid-thought, wait for the actual request and do not rush into a long answer.",
    "When a file or note action is needed, prefer doing the action through tools/local actions over explaining how the user could do it manually.",
    "If the user interrupts, stop the previous answer and follow the new request.",
    "Do not paste full source sections unless the user explicitly asks for exact text.",
    "For vault actions, say briefly what happened and what the user can do next.",
    "If a tool/action result is shown in the UI, do not repeat every detail aloud; summarize the outcome."
  ].join(" ");
}

export function buildLiveDialogueAcknowledgement(
  kind: LiveDialogueAcknowledgementKind
): string {
  switch (kind) {
    case "opening":
      return "Открываю.";
    case "editing":
      return "Сейчас поменяю.";
    case "researching":
      return "Посмотрю свежие данные.";
    case "thinking":
    default:
      return "Секунду.";
  }
}

export function shouldAcceptLiveBargeInTranscript(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (isLiveStopOnlyCommand(normalized)) {
    return true;
  }

  if (normalized.length < 4) {
    return false;
  }

  return /[\p{L}\p{N}]/u.test(normalized);
}

export function isLiveStopOnlyCommand(text: string): boolean {
  const normalized = normalizeBargeInText(text);

  if (!normalized) {
    return false;
  }

  const stopPhrases = new Set([
    "стоп",
    "остановись",
    "останови",
    "хватит",
    "не надо",
    "нет",
    "подожди",
    "погоди",
    "перестань",
    "cancel",
    "stop",
    "wait",
    "hold on",
    "never mind",
    "nevermind"
  ]);

  if (stopPhrases.has(normalized)) {
    return true;
  }

  const words = normalized.split(" ").filter(Boolean);
  const politeOrStopWords = new Set([
    "\u043d\u0435\u0442",
    "\u0441\u0442\u043e\u043f",
    "\u043f\u043e\u0434\u043e\u0436\u0434\u0438",
    "\u043f\u043e\u0433\u043e\u0434\u0438",
    "\u043f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430",
    "\u0441\u0435\u043a\u0443\u043d\u0434\u0443",
    "wait",
    "stop",
    "cancel",
    "please"
  ]);

  return (
    words.length <= 3 &&
    words.every((word) => politeOrStopWords.has(word)) &&
    /^(?:\u043d\u0435\u0442|\u0441\u0442\u043e\u043f|\u043f\u043e\u0434\u043e\u0436\u0434\u0438|\u043f\u043e\u0433\u043e\u0434\u0438|wait|stop|cancel)(?:$|\s)/u.test(normalized)
  );
}

export interface LiveBargeInDecisionInput {
  transcript: string;
  assistantText?: string | null;
  isLiveDialogueActive: boolean;
  isAssistantBusy: boolean;
  isRecording: boolean;
  now: number;
  lastHandledAt?: number;
}

export function shouldHandleLiveBargeIn(
  input: LiveBargeInDecisionInput
): boolean {
  if (
    !input.isLiveDialogueActive ||
    !input.isAssistantBusy ||
    input.isRecording
  ) {
    return false;
  }

  if ((input.lastHandledAt ?? 0) && input.now - (input.lastHandledAt ?? 0) < 900) {
    return false;
  }

  if (!shouldAcceptLiveBargeInTranscript(input.transcript)) {
    return false;
  }

  return !shouldRejectAssistantEcho(
    input.transcript,
    input.assistantText ?? ""
  );
}

export function shouldRejectAssistantEcho(
  transcript: string,
  assistantText: string
): boolean {
  const transcriptNormalized = normalizeBargeInText(transcript);
  const assistantNormalized = normalizeBargeInText(assistantText);

  if (!transcriptNormalized || !assistantNormalized) {
    return false;
  }

  if (
    transcriptNormalized.length >= 12 &&
    assistantNormalized.includes(transcriptNormalized)
  ) {
    return true;
  }

  const transcriptWords = getMeaningfulBargeInWords(transcriptNormalized);
  const assistantWords = new Set(getMeaningfulBargeInWords(assistantNormalized));

  if (transcriptWords.length < 3 || assistantWords.size < 3) {
    return false;
  }

  const matchingWords = transcriptWords.filter((word) => assistantWords.has(word));
  const overlap = matchingWords.length / Math.max(1, transcriptWords.length);

  return matchingWords.length >= 3 && overlap >= 0.72;
}

function normalizeBargeInText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeaningfulBargeInWords(text: string): string[] {
  return text
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

export function buildLiveDialogueActionSpeech(
  receipt: ActionReceipt | null | undefined
): string {
  if (!receipt) {
    return "Готово. Что дальше?";
  }

  if (receipt.status === "failed") {
    return "Не смог безопасно выполнить это действие. Уточни файл, папку или текст, и я попробую ещё раз.";
  }

  const label = receipt.label.toLowerCase();
  const path = receipt.path ? ` ${receipt.path}` : "";

  if (label.includes("open")) {
    return `Открыл файл${path}. Что дальше?`;
  }

  if (label.includes("created") || label.includes("saved")) {
    return `Создал заметку${path}. Что добавить или поменять?`;
  }

  if (label.includes("applied") || label.includes("change")) {
    return "Готово, применил изменение. Если передумаешь, можно откатить.";
  }

  if (label.includes("preview") || label.includes("drafted")) {
    return "Я подготовил черновик или правку. Проверь, и можешь сказать: принять, изменить или отклонить.";
  }

  return "Готово. Что дальше?";
}
