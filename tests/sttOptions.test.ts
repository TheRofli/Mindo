import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  type SttBackend
} from "../src/types";
import {
  getSttModelOptionsForBackend,
  sanitizeSttBackend,
  sanitizeSttModelForBackend
} from "../src/voice/sttOptions";

assert.equal(sanitizeSttBackend("parakeet"), "parakeet");
assert.equal(sanitizeSttBackend("whisper.cpp"), "parakeet");
assert.equal(sanitizeSttBackend("unknown"), "parakeet");
assert.equal(
  sanitizeSttModelForBackend("faster-whisper", "large-v3-turbo"),
  "large-v3-turbo"
);
assert.equal(
  sanitizeSttModelForBackend("parakeet", "medium"),
  "nvidia/parakeet-tdt-0.6b-v3"
);
assert.equal(
  sanitizeSttModelForBackend("parakeet", "bad"),
  "nvidia/parakeet-tdt-0.6b-v3"
);
assert.equal(getSttModelOptionsForBackend("parakeet").length, 1);
assert.deepEqual(
  getSttModelOptionsForBackend("parakeet").map((option) => option.value),
  ["nvidia/parakeet-tdt-0.6b-v3"]
);
assert.deepEqual(
  getSttModelOptionsForBackend("faster-whisper").map((option) => option.value),
  ["tiny", "base", "small", "medium", "large-v3", "large-v3-turbo"]
);
assert.equal(DEFAULT_SETTINGS.sttBackend, "parakeet");
assert.equal(DEFAULT_SETTINGS.sttModel, "nvidia/parakeet-tdt-0.6b-v3");
assert.equal(DEFAULT_SETTINGS.sttQualityMode, "quality");
assert.equal(DEFAULT_SETTINGS.sttLanguage, "auto");
assert.equal(
  sanitizeSttBackend("whisper.cpp") satisfies SttBackend,
  "parakeet"
);

console.log("sttOptions tests passed");
