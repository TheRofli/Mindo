export type AttachmentKind = "image" | "pdf" | "text" | "binary";

export function classifyAttachment(
  mimeType: string,
  filename: string
): AttachmentKind {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith("image/")) {
    return "image";
  }

  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    lowerMime.startsWith("text/") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".json")
  ) {
    return "text";
  }

  return "binary";
}

export function extractPdfTextFallback(rawPdfText: string): string {
  const literalMatches = Array.from(
    rawPdfText.matchAll(/\((?:\\.|[^\\()])*\)\s*(?:Tj|'|")/g)
  ).map((match) => {
    const value = match[0].match(/^\(([\s\S]*)\)\s*(?:Tj|'|")$/)?.[1] ?? "";
    return decodePdfLiteralString(value);
  });
  const arrayMatches = Array.from(
    rawPdfText.matchAll(/\[((?:\s*(?:\((?:\\.|[^\\()])*\)|<[\da-fA-F\s]+>|-?\d+(?:\.\d+)?)\s*)+)\]\s*TJ/g)
  ).map((match) => decodePdfTextArray(match[1] ?? ""));
  const hexMatches = Array.from(
    rawPdfText.matchAll(/<([\da-fA-F\s]{4,})>\s*(?:Tj|'|")/g)
  )
    .map((match) => decodePdfHexString(match[1] ?? ""))
    .filter(Boolean);

  return [...literalMatches, ...arrayMatches, ...hexMatches]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodePdfTextArray(value: string): string {
  const parts: string[] = [];
  const tokenPattern = /\((?:\\.|[^\\()])*\)|<[\da-fA-F\s]+>|-?\d+(?:\.\d+)?/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(value)) !== null) {
    const token = match[0];

    if (token.startsWith("(")) {
      parts.push(decodePdfLiteralString(token.slice(1, -1)));
      continue;
    }

    if (token.startsWith("<")) {
      const decoded = decodePdfHexString(token.slice(1, -1));

      if (decoded) {
        parts.push(decoded);
      }

      continue;
    }

    if (Math.abs(Number(token)) >= 80 && parts.length) {
      parts.push(" ");
    }
  }

  return parts.join("").replace(/\s+/g, " ").trim();
}

function decodePdfLiteralString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
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

function decodeUtf16Bytes(bytes: number[], littleEndian: boolean): string {
  const chars: string[] = [];

  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const code = littleEndian
      ? bytes[index] | (bytes[index + 1] << 8)
      : (bytes[index] << 8) | bytes[index + 1];

    if (code) {
      chars.push(String.fromCharCode(code));
    }
  }

  return chars.join("").replace(/\s+/g, " ").trim();
}
