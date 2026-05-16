export function replaceUnsafePdfControlCharacters(text: string): string {
  let sanitized = "";

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    sanitized += isUnsafePdfControlCode(code) ? " " : text[index];
  }

  return sanitized;
}

function isUnsafePdfControlCode(code: number): boolean {
  return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31);
}
