export function isVaultLocalDescriptionRequest(userRequest: string): boolean {
  const normalized = userRequest.toLocaleLowerCase().replace(/\s+/g, " ").trim();

  if (!normalized || hasExplicitWebIntent(normalized)) {
    return false;
  }

  const localTarget = includesAny(normalized, [
    "открыт",
    "текущ",
    "этот файл",
    "эту заметку",
    "активн",
    "current note",
    "open file",
    "opened file",
    "active note"
  ]);
  const descriptionIntent = includesAny(normalized, [
    "опиши",
    "описать",
    "объясни",
    "объяснить",
    "о чем",
    "что это",
    "summarize",
    "describe",
    "explain",
    "what is this"
  ]);

  return localTarget && descriptionIntent;
}

function hasExplicitWebIntent(normalizedText: string): boolean {
  return includesAny(normalizedText, [
    "в интернете",
    "в вебе",
    "поиск в сети",
    "гугл",
    "web",
    "internet",
    "online"
  ]);
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}
