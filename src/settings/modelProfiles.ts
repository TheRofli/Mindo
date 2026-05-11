import {
  DEFAULT_SETTINGS,
  type ContexSettings,
  type LlmModelProfile
} from "../types";

export function createModelProfileFromSettings(
  settings: Pick<
    ContexSettings,
    "baseUrl" | "apiKey" | "model" | "temperature" | "supportsVision"
  >,
  overrides: Partial<Pick<LlmModelProfile, "id" | "name">> = {}
): LlmModelProfile {
  const model = settings.model?.trim() || DEFAULT_SETTINGS.model;

  return {
    id: sanitizeProfileId(overrides.id) || createProfileId(model),
    name: overrides.name?.trim() || model,
    baseUrl: settings.baseUrl?.trim() || DEFAULT_SETTINGS.baseUrl,
    apiKey: settings.apiKey ?? "",
    model,
    temperature: normalizeTemperature(settings.temperature),
    supportsVision: Boolean(settings.supportsVision)
  };
}

export function sanitizeModelProfiles(
  settings: Partial<ContexSettings>
): {
  profiles: LlmModelProfile[];
  activeProfileId: string;
} {
  const rawProfiles = Array.isArray(settings.modelProfiles)
    ? settings.modelProfiles
    : [];
  const profiles = dedupeProfiles(
    rawProfiles
      .map(sanitizeProfile)
      .filter((profile): profile is LlmModelProfile => Boolean(profile))
  );

  if (!profiles.length) {
    const profile = createModelProfileFromSettings({
      baseUrl: settings.baseUrl || DEFAULT_SETTINGS.baseUrl,
      apiKey: settings.apiKey ?? DEFAULT_SETTINGS.apiKey,
      model: settings.model || DEFAULT_SETTINGS.model,
      temperature:
        typeof settings.temperature === "number"
          ? settings.temperature
          : DEFAULT_SETTINGS.temperature,
      supportsVision:
        typeof settings.supportsVision === "boolean"
          ? settings.supportsVision
          : DEFAULT_SETTINGS.supportsVision
    });

    return {
      profiles: [profile],
      activeProfileId: profile.id
    };
  }

  const activeProfileId = profiles.some(
    (profile) => profile.id === settings.activeModelProfileId
  )
    ? String(settings.activeModelProfileId)
    : profiles[0].id;

  return {
    profiles,
    activeProfileId
  };
}

export function getActiveModelProfile(
  settings: ContexSettings
): LlmModelProfile {
  return (
    settings.modelProfiles.find(
      (profile) => profile.id === settings.activeModelProfileId
    ) ??
    settings.modelProfiles[0] ??
    createModelProfileFromSettings(settings)
  );
}

export function applyModelProfile(
  settings: ContexSettings,
  profile: LlmModelProfile
): ContexSettings {
  return {
    ...settings,
    activeModelProfileId: profile.id,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.model,
    temperature: normalizeTemperature(profile.temperature),
    supportsVision: profile.supportsVision
  };
}

export function upsertModelProfile(
  profiles: LlmModelProfile[],
  profile: LlmModelProfile
): LlmModelProfile[] {
  const sanitized = sanitizeProfile(profile) ?? createModelProfileFromSettings(DEFAULT_SETTINGS);
  const existingIndex = profiles.findIndex((item) => item.id === sanitized.id);

  if (existingIndex === -1) {
    return [...profiles, sanitized];
  }

  return profiles.map((item, index) => (index === existingIndex ? sanitized : item));
}

export function deleteModelProfile(
  profiles: LlmModelProfile[],
  profileId: string
): LlmModelProfile[] {
  if (profiles.length <= 1) {
    return profiles;
  }

  return profiles.filter((profile) => profile.id !== profileId);
}

function sanitizeProfile(value: unknown): LlmModelProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<LlmModelProfile>;
  const model = raw.model?.trim();

  if (!model) {
    return null;
  }

  return {
    id: sanitizeProfileId(raw.id) || createProfileId(model),
    name: raw.name?.trim() || model,
    baseUrl: raw.baseUrl?.trim() || DEFAULT_SETTINGS.baseUrl,
    apiKey: raw.apiKey ?? "",
    model,
    temperature: normalizeTemperature(raw.temperature),
    supportsVision:
      typeof raw.supportsVision === "boolean"
        ? raw.supportsVision
        : DEFAULT_SETTINGS.supportsVision
  };
}

function dedupeProfiles(profiles: LlmModelProfile[]): LlmModelProfile[] {
  const seen = new Set<string>();

  return profiles.map((profile) => {
    let id = profile.id;
    let index = 2;

    while (seen.has(id)) {
      id = `${profile.id}-${index}`;
      index += 1;
    }

    seen.add(id);
    return {
      ...profile,
      id
    };
  });
}

function createProfileId(model: string): string {
  const base = sanitizeProfileId(model) || "model-profile";

  return base;
}

function sanitizeProfileId(id?: string): string {
  return (id ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeTemperature(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(parsed)
    ? Math.min(2, Math.max(0, parsed))
    : DEFAULT_SETTINGS.temperature;
}
