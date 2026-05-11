const MAX_PDF_FALLBACK_TEXT_CHARS = 12000;
const MAX_PDF_STREAMS_TO_INSPECT = 40;

export function isReadableTextFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return (
    type.startsWith("text/") ||
    type.includes("json") ||
    type.includes("csv") ||
    /\.(md|markdown|txt|json|csv|ts|tsx|js|jsx|css|html|xml|yaml|yml)$/i.test(name)
  );
}

export function renameClipboardFile(file: File): File {
  const extension = mimeTypeToExtension(file.type) || "bin";

  return new File([file], `clipboard-${Date.now()}.${extension}`, {
    type: file.type || "application/octet-stream"
  });
}

export function mimeTypeToExtension(type: string): string | null {
  const normalized = type.toLowerCase();

  if (normalized === "image/png") {
    return "png";
  }

  if (normalized === "image/jpeg") {
    return "jpg";
  }

  if (normalized === "image/webp") {
    return "webp";
  }

  if (normalized === "application/pdf") {
    return "pdf";
  }

  if (normalized.startsWith("text/")) {
    return "txt";
  }

  return null;
}

export function extractPdfTextFallback(rawPdfText: string): string {
  const candidates: string[] = [];
  const literalPattern = /\((?:\\.|[^\\()]){2,}\)/g;
  const hexPattern = /<([0-9a-fA-F\s]{4,})>\s*(?:Tj|TJ|'|")?/g;
  let literalMatch: RegExpExecArray | null;

  while ((literalMatch = literalPattern.exec(rawPdfText)) !== null) {
    candidates.push(decodePdfLiteralString(literalMatch[0].slice(1, -1)));

    if (candidates.join(" ").length > MAX_PDF_FALLBACK_TEXT_CHARS * 2) {
      break;
    }
  }

  let hexMatch: RegExpExecArray | null;
  while ((hexMatch = hexPattern.exec(rawPdfText)) !== null) {
    const decoded = decodePdfHexString(hexMatch[1] ?? "");

    if (decoded) {
      candidates.push(decoded);
    }

    if (candidates.join(" ").length > MAX_PDF_FALLBACK_TEXT_CHARS * 2) {
      break;
    }
  }

  if (!candidates.length) {
    return "";
  }

  const text = candidates
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

  return isUsefulExtractedText(text) ? text : "";
}

export async function extractPdfTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return extractPdfTextFromArrayBuffer(buffer);
}

export async function extractPdfTextFromArrayBuffer(
  buffer: ArrayBuffer
): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const rawPdfText = binaryBytesToString(bytes);
  const candidates = [extractPdfTextFallback(rawPdfText)];
  const flateStreams = findFlatePdfStreams(rawPdfText, bytes);

  for (const streamBytes of flateStreams.slice(0, MAX_PDF_STREAMS_TO_INSPECT)) {
    const inflated = await inflatePdfStream(streamBytes);

    if (!inflated?.length) {
      continue;
    }

    const streamText = binaryBytesToString(inflated);
    const extracted = extractPdfTextFallback(streamText);

    if (extracted) {
      candidates.push(extracted);
    }

    const utf8Text = decodeUtf8Bytes(inflated);
    const utf8Extracted =
      utf8Text && utf8Text !== streamText ? extractPdfTextFallback(utf8Text) : "";

    if (utf8Extracted) {
      candidates.push(utf8Extracted);
    }
  }

  return normalizeExtractedPdfText(candidates.filter(Boolean).join(" "));
}

function decodePdfLiteralString(value: string): string {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      switch (escaped) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        default:
          return escaped;
      }
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8))
    );
}

function decodePdfHexString(value: string): string {
  const hex = value.replace(/\s+/g, "");

  if (hex.length < 4 || hex.length % 2 !== 0) {
    return "";
  }

  const bytes = Array.from({ length: hex.length / 2 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  );

  if (bytes.some((byte) => Number.isNaN(byte))) {
    return "";
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16Bytes(bytes.slice(2), false);
  }

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return decodeUtf16Bytes(bytes.slice(2), true);
  }

  const zeroByteCount = bytes.filter((byte) => byte === 0).length;
  if (zeroByteCount >= Math.floor(bytes.length / 3)) {
    return decodeUtf16Bytes(bytes, false);
  }

  return bytes
    .map((byte) => String.fromCharCode(byte))
    .join("")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]+/g, " ")
    .trim();
}

function findFlatePdfStreams(
  rawPdfText: string,
  bytes: Uint8Array
): Uint8Array[] {
  const streams: Uint8Array[] = [];
  const streamPattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(rawPdfText)) !== null) {
    const dictionaryStart = Math.max(0, match.index - 2200);
    const dictionary = rawPdfText.slice(dictionaryStart, match.index);

    if (!/\/Filter\s*(?:\/FlateDecode|\[[^\]]*\/FlateDecode[^\]]*\])/i.test(dictionary)) {
      continue;
    }

    const streamStart = match.index + match[0].length;
    const streamEnd = rawPdfText.indexOf("endstream", streamStart);

    if (streamEnd <= streamStart) {
      continue;
    }

    let start = streamStart;
    let end = streamEnd;

    while (start < end && (bytes[start] === 0x0d || bytes[start] === 0x0a)) {
      start += 1;
    }

    while (end > start && (bytes[end - 1] === 0x0d || bytes[end - 1] === 0x0a)) {
      end -= 1;
    }

    if (end > start) {
      streams.push(bytes.slice(start, end));
    }
  }

  return streams;
}

async function inflatePdfStream(bytes: Uint8Array): Promise<Uint8Array | null> {
  const formats = ["deflate", "deflate-raw"] as const;

  for (const format of formats) {
    try {
      if (typeof DecompressionStream === "undefined") {
        return null;
      }

      const streamBytes = new Uint8Array(bytes.byteLength);
      streamBytes.set(bytes);
      const stream = new Blob([streamBytes.buffer as ArrayBuffer]).stream().pipeThrough(
        new DecompressionStream(format)
      );
      const buffer = await new Response(stream).arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      // Try the next stream format.
    }
  }

  return null;
}

function binaryBytesToString(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(
      String.fromCharCode(...bytes.slice(index, index + chunkSize))
    );
  }

  return chunks.join("");
}

function decodeUtf8Bytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

function normalizeExtractedPdfText(text: string): string {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

  return isUsefulExtractedText(normalized)
    ? normalized.slice(0, MAX_PDF_FALLBACK_TEXT_CHARS)
    : "";
}

function decodeUtf16Bytes(bytes: number[], littleEndian: boolean): string {
  const chars: string[] = [];

  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const code = littleEndian
      ? bytes[index] | (bytes[index + 1] << 8)
      : (bytes[index] << 8) | bytes[index + 1];

    if (code > 0) {
      chars.push(String.fromCharCode(code));
    }
  }

  return chars.join("").replace(/\s+/g, " ").trim();
}

function isUsefulExtractedText(text: string): boolean {
  const compact = text.replace(/\s+/g, "");

  if (compact.length < 4) {
    return false;
  }

  const readableChars = Array.from(compact).filter((char) =>
    /[\p{L}\p{N}.,;:!?()[\]'"«»%/-]/u.test(char)
  ).length;

  return readableChars / compact.length >= 0.72;
}

export function inferMimeType(filename: string): string {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return "text/markdown";
  }

  if (lower.endsWith(".json")) {
    return "application/json";
  }

  return "application/octet-stream";
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read attached file."));
      }
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Could not read attached file."));
    });
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${formatCompactDecimal(kb, kb < 10 ? 1 : 0)} KB`;
  }

  const mb = kb / 1024;

  return `${formatCompactDecimal(mb, mb < 10 ? 1 : 0)} MB`;
}

function formatCompactDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0$/, "");
}
