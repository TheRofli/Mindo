import { cleanJsonLikeResponse } from "../llm/jsonResponse";

export function parseSemanticQueryVariants(response: string): string[] {
  const cleaned = cleanJsonLikeResponse(response);

  try {
    const parsed = JSON.parse(cleaned) as { queries?: unknown };

    if (!Array.isArray(parsed.queries)) {
      return [];
    }

    return parsed.queries
      .map((query) => (typeof query === "string" ? query.trim() : ""))
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return response
      .split(/\r?\n|,/)
      .map((query) => query.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }
}

export function parseWebResearchQueryRewrite(
  response: string,
  fallbackQuery: string
): string {
  const cleaned = cleanJsonLikeResponse(response);

  try {
    const parsed = JSON.parse(cleaned) as { query?: unknown };
    const query = typeof parsed.query === "string" ? parsed.query.trim() : "";

    return normalizeWebResearchQuery(query) || fallbackQuery;
  } catch {
    return normalizeWebResearchQuery(response) || fallbackQuery;
  }
}

export function fallbackWebResearchQuery(query: string): string {
  const trimmed = query.trim();
  const year = new Date().getFullYear();
  const asksForFreshInfo =
    /\b(latest|current|today|news|recent)\b/i.test(trimmed) ||
    /новост|последн|сегодня|свеж/i.test(trimmed);
  const asksAboutLocalLlm =
    /\bllm\b|large language model|local model|локальн.*модел/i.test(trimmed);

  if (asksAboutLocalLlm) {
    return asksForFreshInfo
      ? `local LLM large language model release announcement changelog official blog ${year}`
      : `${trimmed} large language model local inference`;
  }

  return asksForFreshInfo && !/\b20\d{2}\b/.test(trimmed)
    ? `${trimmed} ${year}`
    : trimmed;
}

export function normalizeWebResearchQuery(query: string): string {
  return query
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim()
    .slice(0, 180);
}
