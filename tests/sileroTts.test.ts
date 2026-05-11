import assert from "node:assert/strict";
import {
  DEFAULT_SILERO_VOICE,
  SILERO_VOICE_OPTIONS,
  SUPPORTED_SILERO_VOICES,
  getSileroVoiceModelConfig
} from "../src/voice/sileroVoices";

assert.equal(DEFAULT_SILERO_VOICE, "baya");
assert.ok(SUPPORTED_SILERO_VOICES.has("baya"));
assert.ok(SUPPORTED_SILERO_VOICES.has("eugene"));

assert.deepEqual(
  SILERO_VOICE_OPTIONS.map((voice) => voice.id),
  ["baya", "eugene"]
);

const russianVoice = getSileroVoiceModelConfig("baya");
assert.equal(russianVoice.modelId, "ru-v5_5");
assert.equal(
  russianVoice.modelUrl,
  "https://models.silero.ai/models/tts/ru/v5_5_ru.pt"
);
assert.equal(russianVoice.language, "ru");

assert.equal(
  getSileroVoiceModelConfig("unknown").voice,
  DEFAULT_SILERO_VOICE
);

console.log("sileroTts tests passed");
