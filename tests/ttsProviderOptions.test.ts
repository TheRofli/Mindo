import assert from "node:assert/strict";
import {
  TTS_PROVIDER_OPTIONS,
  sanitizeTtsProvider
} from "../src/voice/ttsProviders";

const providerIds = TTS_PROVIDER_OPTIONS.map((provider) => provider.value);

assert.deepEqual(providerIds, [
  "browser",
  "disabled",
  "kokoro",
  "silero"
]);

assert.equal(sanitizeTtsProvider("silero"), "silero");
assert.equal(sanitizeTtsProvider("legacy-multilingual"), "silero");
assert.equal(sanitizeTtsProvider("voxcpm2"), "silero");
assert.equal(sanitizeTtsProvider("fun-cosyvoice3"), "silero");
assert.equal(sanitizeTtsProvider(""), "silero");

console.log("ttsProviderOptions tests passed");
