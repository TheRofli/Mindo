import assert from "node:assert/strict";
import {
  COMPOSER_FILE_ACCEPT,
  VOICE_WAVEFORM_BAR_COUNT,
  getComposerFileAcceptValue,
  getVoiceWaveformBarIndexes
} from "../src/views/inputComposerRenderer";

assert.equal(getComposerFileAcceptValue(), COMPOSER_FILE_ACCEPT);
assert.equal(getVoiceWaveformBarIndexes().length, VOICE_WAVEFORM_BAR_COUNT);
assert.deepEqual(getVoiceWaveformBarIndexes().slice(0, 4), [0, 1, 2, 3]);
assert.equal(
  getVoiceWaveformBarIndexes().at(-1),
  VOICE_WAVEFORM_BAR_COUNT - 1
);

console.log("inputComposerRenderer tests passed");
