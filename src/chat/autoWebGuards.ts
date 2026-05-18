export function isVaultLocalDescriptionRequest(userRequest: string): boolean {
  const normalized = normalizeRequestText(userRequest);

  if (!normalized || hasExplicitWebIntent(normalized)) {
    return false;
  }

  const localTarget = includesAny(normalized, [
    "открыт",
    "текущ",
    "этот файл",
    "эту заметку",
    "активн",
    "мой vault",
    "моем vault",
    "моём vault",
    "в vault",
    "из vault",
    "в хранилище",
    "из хранилища",
    "current note",
    "open file",
    "opened file",
    "active note",
    "my vault",
    "in my vault",
    "from my vault"
  ]);
  const descriptionIntent = includesAny(normalized, [
    "опиши",
    "описать",
    "объясни",
    "объяснить",
    "о чем",
    "о чём",
    "что это",
    "найди",
    "найти",
    "покажи",
    "открой",
    "summarize",
    "describe",
    "explain",
    "what is this",
    "find",
    "show",
    "open"
  ]);

  return localTarget && descriptionIntent;
}

export function hasExplicitWebIntent(userRequest: string): boolean {
  const normalized = normalizeRequestText(userRequest);

  return includesAny(normalized, [
    "в интернете",
    "в вебе",
    "поиск в сети",
    "поищи в интернете",
    "загугли",
    "гугл",
    "web",
    "internet",
    "online",
    "search the web",
    "google"
  ]);
}

export function normalizeRequestText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}
