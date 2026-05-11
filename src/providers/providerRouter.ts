export type ProviderKind =
  | "ollama"
  | "lm-studio"
  | "openai-compatible"
  | "unknown";

export interface ProviderConfigInput {
  baseUrl: string;
  model: string;
  temperature: number;
}

export interface NormalizedProviderConfig extends ProviderConfigInput {
  kind: ProviderKind;
}

export function normalizeProviderConfig(
  input: ProviderConfigInput
): NormalizedProviderConfig {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, "");

  return {
    ...input,
    baseUrl,
    model: input.model.trim(),
    kind: inferProviderKind(baseUrl)
  };
}

export function inferProviderKind(baseUrl: string): ProviderKind {
  const normalized = baseUrl.toLowerCase();

  if (normalized.includes(":11434")) {
    return "ollama";
  }

  if (normalized.includes(":1234")) {
    return "lm-studio";
  }

  if (normalized.endsWith("/v1")) {
    return "openai-compatible";
  }

  return "unknown";
}
