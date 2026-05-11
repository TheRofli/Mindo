export function getSpeechText(
  content: string,
  readMode: "full" | "short"
): string {
  const plainText = stripMarkdownForSpeech(content);

  if (readMode === "full" || plainText.length <= 700) {
    return plainText;
  }

  const firstParagraphs = plainText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");

  return `${firstParagraphs || plainText.slice(0, 700)}...`;
}

export function stripMarkdownForSpeech(content: string): string {
  return applyTtsPronunciationHints(content)
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripHiddenTtsHints(content: string): string {
  return content
    .replace(/<!--\s*(?:contex-tts|tts)\s*:[\s\S]*?-->/gi, "")
    .replace(/<!--\s*(?:contex-tts|tts)\s*:[\s\S]*$/i, "");
}

export function applyTtsPronunciationHints(content: string): string {
  return content.replace(
    /((?:[A-Za-z][A-Za-z0-9_+\-/]*\s*){1,4})<!--\s*(?:contex-tts|tts)\s*:\s*([^<>]*?)\s*-->/gi,
    (_match, _visible: string, pronunciation: string) => pronunciation.trim()
  );
}

export function prepareSileroSpeechText(
  text: string,
  dictionary: Record<string, string>
): string {
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) ?? []).length;

  if (cyrillicCount === 0) {
    return text;
  }

  const pronunciations = normalizePronunciations(dictionary);
  const latinSafeText = text.replace(/[A-Za-z][A-Za-z0-9_+\-/]*/g, (token) =>
    pronounceLatinTokenForRussian(token, pronunciations)
  );

  return pronounceNumbersForRussian(latinSafeText);
}

function normalizePronunciations(
  dictionary: Record<string, string>
): Record<string, string> {
  const normalized: Record<string, string> = {};

  Object.entries(dictionary ?? {}).forEach(([term, pronunciation]) => {
    const key = term.trim().toLowerCase();
    const value = pronunciation.trim();

    if (key && value) {
      normalized[key] = value;
    }
  });

  return normalized;
}

function pronounceLatinTokenForRussian(
  token: string,
  pronunciations: Record<string, string>
): string {
  const normalized = token.replace(/^[_+\-/]+|[_+\-/]+$/g, "").toLowerCase();

  if (!normalized) {
    return token;
  }

  const parts = normalized.split(/[_+\-/]+/).filter(Boolean);

  if (parts.length > 1) {
    return parts
      .map((part) =>
        pronounceLatinWordForRussian(part, part.toUpperCase(), pronunciations)
      )
      .join(" ");
  }

  return pronounceLatinWordForRussian(normalized, token, pronunciations);
}

function pronounceLatinWordForRussian(
  word: string,
  original: string,
  pronunciations: Record<string, string>
): string {
  if (pronunciations[word]) {
    return pronunciations[word];
  }

  if (/^[A-Z0-9]{2,8}$/.test(original)) {
    return word
      .split("")
      .map(
        (char) =>
          LATIN_LETTER_PRONUNCIATIONS[char] ??
          DIGIT_PRONUNCIATIONS[char] ??
          char
      )
      .join(" ");
  }

  return transliterateLatinForRussian(word);
}

function transliterateLatinForRussian(word: string): string {
  let value = word;

  LATIN_REPLACEMENTS.forEach(([source, replacement]) => {
    value = value.replace(new RegExp(source, "g"), replacement);
  });

  return value
    .split("")
    .map((char) => LATIN_CHAR_PRONUNCIATIONS[char] ?? char)
    .join("");
}

function pronounceNumbersForRussian(text: string): string {
  return text.replace(/\b\d+(?:[.,]\d+)?\b/g, (token) => {
    if (token.includes(".") || token.includes(",")) {
      const [whole, fractional] = token.split(/[.,]/);
      const wholeText = pronounceIntegerForRussian(Number(whole));
      const fractionalText = fractional
        .split("")
        .map((digit) => DIGIT_PRONUNCIATIONS[digit] ?? digit)
        .join(" ");

      return `${wholeText} \u0446\u0435\u043b\u044b\u0445 ${fractionalText}`;
    }

    return pronounceIntegerForRussian(Number(token));
  });
}

function pronounceIntegerForRussian(value: number): string {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return String(value);
  }

  if (value < 20) {
    return NUMBER_UNDER_20[value];
  }

  if (value < 100) {
    const ten = Math.floor(value / 10);
    const rest = value % 10;
    return [TENS[ten], rest ? NUMBER_UNDER_20[rest] : ""]
      .filter(Boolean)
      .join(" ");
  }

  if (value < 1000) {
    const hundred = Math.floor(value / 100);
    const rest = value % 100;
    return [HUNDREDS[hundred], rest ? pronounceIntegerForRussian(rest) : ""]
      .filter(Boolean)
      .join(" ");
  }

  if (value < 1_000_000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    return [
      pronounceThousandsForRussian(thousands),
      rest ? pronounceIntegerForRussian(rest) : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  return tokenDigitsForRussian(String(value));
}

function pronounceThousandsForRussian(value: number): string {
  const base =
    value === 1
      ? "\u043e\u0434\u043d\u0430"
      : value === 2
        ? "\u0434\u0432\u0435"
        : pronounceIntegerForRussian(value);

  const lastTwo = value % 100;
  const last = value % 10;
  const suffix =
    lastTwo >= 11 && lastTwo <= 14
      ? "\u0442\u044b\u0441\u044f\u0447"
      : last === 1
        ? "\u0442\u044b\u0441\u044f\u0447\u0430"
        : last >= 2 && last <= 4
          ? "\u0442\u044b\u0441\u044f\u0447\u0438"
          : "\u0442\u044b\u0441\u044f\u0447";

  return `${base} ${suffix}`;
}

function tokenDigitsForRussian(value: string): string {
  return value
    .split("")
    .map((digit) => DIGIT_PRONUNCIATIONS[digit] ?? digit)
    .join(" ");
}

const LATIN_LETTER_PRONUNCIATIONS: Record<string, string> = {
  a: "\u044d\u0439",
  b: "\u0431\u0438",
  c: "\u0441\u0438",
  d: "\u0434\u0438",
  e: "\u0438",
  f: "\u044d\u0444",
  g: "\u0434\u0436\u0438",
  h: "\u044d\u0439\u0447",
  i: "\u0430\u0439",
  j: "\u0434\u0436\u0435\u0439",
  k: "\u043a\u0435\u0439",
  l: "\u044d\u043b",
  m: "\u044d\u043c",
  n: "\u044d\u043d",
  o: "\u043e\u0443",
  p: "\u043f\u0438",
  q: "\u043a\u044c\u044e",
  r: "\u0430\u0440",
  s: "\u044d\u0441",
  t: "\u0442\u0438",
  u: "\u044e",
  v: "\u0432\u0438",
  w: "\u0434\u0430\u0431\u043b \u044e",
  x: "\u0438\u043a\u0441",
  y: "\u0432\u0430\u0439",
  z: "\u0437\u044d\u0434"
};

const DIGIT_PRONUNCIATIONS: Record<string, string> = {
  "0": "\u043d\u043e\u043b\u044c",
  "1": "\u043e\u0434\u0438\u043d",
  "2": "\u0434\u0432\u0430",
  "3": "\u0442\u0440\u0438",
  "4": "\u0447\u0435\u0442\u044b\u0440\u0435",
  "5": "\u043f\u044f\u0442\u044c",
  "6": "\u0448\u0435\u0441\u0442\u044c",
  "7": "\u0441\u0435\u043c\u044c",
  "8": "\u0432\u043e\u0441\u0435\u043c\u044c",
  "9": "\u0434\u0435\u0432\u044f\u0442\u044c"
};

const NUMBER_UNDER_20 = [
  "\u043d\u043e\u043b\u044c",
  "\u043e\u0434\u0438\u043d",
  "\u0434\u0432\u0430",
  "\u0442\u0440\u0438",
  "\u0447\u0435\u0442\u044b\u0440\u0435",
  "\u043f\u044f\u0442\u044c",
  "\u0448\u0435\u0441\u0442\u044c",
  "\u0441\u0435\u043c\u044c",
  "\u0432\u043e\u0441\u0435\u043c\u044c",
  "\u0434\u0435\u0432\u044f\u0442\u044c",
  "\u0434\u0435\u0441\u044f\u0442\u044c",
  "\u043e\u0434\u0438\u043d\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0434\u0432\u0435\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0442\u0440\u0438\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0447\u0435\u0442\u044b\u0440\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u043f\u044f\u0442\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0448\u0435\u0441\u0442\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0441\u0435\u043c\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0432\u043e\u0441\u0435\u043c\u043d\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0434\u0435\u0432\u044f\u0442\u043d\u0430\u0434\u0446\u0430\u0442\u044c"
];

const TENS = [
  "",
  "\u0434\u0435\u0441\u044f\u0442\u044c",
  "\u0434\u0432\u0430\u0434\u0446\u0430\u0442\u044c",
  "\u0442\u0440\u0438\u0434\u0446\u0430\u0442\u044c",
  "\u0441\u043e\u0440\u043e\u043a",
  "\u043f\u044f\u0442\u044c\u0434\u0435\u0441\u044f\u0442",
  "\u0448\u0435\u0441\u0442\u044c\u0434\u0435\u0441\u044f\u0442",
  "\u0441\u0435\u043c\u044c\u0434\u0435\u0441\u044f\u0442",
  "\u0432\u043e\u0441\u0435\u043c\u044c\u0434\u0435\u0441\u044f\u0442",
  "\u0434\u0435\u0432\u044f\u043d\u043e\u0441\u0442\u043e"
];

const HUNDREDS = [
  "",
  "\u0441\u0442\u043e",
  "\u0434\u0432\u0435\u0441\u0442\u0438",
  "\u0442\u0440\u0438\u0441\u0442\u0430",
  "\u0447\u0435\u0442\u044b\u0440\u0435\u0441\u0442\u0430",
  "\u043f\u044f\u0442\u044c\u0441\u043e\u0442",
  "\u0448\u0435\u0441\u0442\u044c\u0441\u043e\u0442",
  "\u0441\u0435\u043c\u044c\u0441\u043e\u0442",
  "\u0432\u043e\u0441\u0435\u043c\u044c\u0441\u043e\u0442",
  "\u0434\u0435\u0432\u044f\u0442\u044c\u0441\u043e\u0442"
];

const LATIN_REPLACEMENTS: Array<[string, string]> = [
  ["sch", "\u0449"],
  ["sh", "\u0448"],
  ["ch", "\u0447"],
  ["zh", "\u0436"],
  ["yo", "\u0439\u043e"],
  ["yu", "\u044e"],
  ["ya", "\u044f"],
  ["ph", "\u0444"],
  ["th", "\u0441"],
  ["ck", "\u043a"],
  ["qu", "\u043a\u0432"]
];

const LATIN_CHAR_PRONUNCIATIONS: Record<string, string> = {
  a: "\u0430",
  b: "\u0431",
  c: "\u043a",
  d: "\u0434",
  e: "\u0435",
  f: "\u0444",
  g: "\u0433",
  h: "\u0445",
  i: "\u0438",
  j: "\u0434\u0436",
  k: "\u043a",
  l: "\u043b",
  m: "\u043c",
  n: "\u043d",
  o: "\u043e",
  p: "\u043f",
  q: "\u043a",
  r: "\u0440",
  s: "\u0441",
  t: "\u0442",
  u: "\u0443",
  v: "\u0432",
  w: "\u0432",
  x: "\u043a\u0441",
  y: "\u0438",
  z: "\u0437"
};

export function guessSpeechLanguage(text: string): string {
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latinCount = (text.match(/[A-Za-z]/g) ?? []).length;

  return cyrillicCount >= latinCount ? "ru-RU" : "en-US";
}

export function isMostlyEnglishSpeech(text: string): boolean {
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latinCount = (text.match(/[A-Za-z]/g) ?? []).length;

  return latinCount > Math.max(30, cyrillicCount * 2);
}

export function findSpeechVoice(language: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const languagePrefix = language.split("-")[0].toLowerCase();

  return (
    voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase()) ??
    voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(`${languagePrefix}-`)
    ) ??
    null
  );
}
