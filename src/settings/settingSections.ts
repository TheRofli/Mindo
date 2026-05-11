export type ContexSettingsSectionId = "model" | "voice" | "web" | "wiki";

export interface ContexSettingsSection {
  id: ContexSettingsSectionId;
  label: string;
}

export const CONTEX_SETTINGS_SECTIONS: ContexSettingsSection[] = [
  {
    id: "model",
    label: "Model"
  },
  {
    id: "voice",
    label: "Voice"
  },
  {
    id: "web",
    label: "Web/RAG"
  },
  {
    id: "wiki",
    label: "Wiki"
  }
];

export function sanitizeContexSettingsSection(
  value: unknown
): ContexSettingsSectionId {
  return CONTEX_SETTINGS_SECTIONS.some((section) => section.id === value)
    ? (value as ContexSettingsSectionId)
    : "model";
}
