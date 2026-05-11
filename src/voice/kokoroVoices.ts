export const DEFAULT_KOKORO_VOICE = "af_heart";

export const KOKORO_VOICE_OPTIONS = [
  {
    id: "af_heart",
    label: "Heart - English female"
  },
  {
    id: "af_bella",
    label: "Bella - English female"
  },
  {
    id: "af_nicole",
    label: "Nicole - English female"
  },
  {
    id: "af_sarah",
    label: "Sarah - English female"
  },
  {
    id: "am_fenrir",
    label: "Fenrir - English male"
  },
  {
    id: "am_michael",
    label: "Michael - English male"
  },
  {
    id: "am_puck",
    label: "Puck - English male"
  },
  {
    id: "bf_emma",
    label: "Emma - British female"
  },
  {
    id: "bf_isabella",
    label: "Isabella - British female"
  },
  {
    id: "bm_fable",
    label: "Fable - British male"
  },
  {
    id: "bm_george",
    label: "George - British male"
  }
] as const;

export const SUPPORTED_KOKORO_VOICES: Set<string> = new Set(
  KOKORO_VOICE_OPTIONS.map((voice) => voice.id)
);
