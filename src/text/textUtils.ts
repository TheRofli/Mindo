export function trimTextForContext(text: string, maxChars: number): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}
