import assert from "node:assert/strict";
import {
  createVoiceActivityState,
  getNormalizedAudioLevelFromTimeDomainData,
  reduceVoiceActivity
} from "../src/voice/voiceActivity";

let state = createVoiceActivityState();
state = reduceVoiceActivity(state, {
  type: "level",
  now: 1000,
  level: 0.02,
  silenceMs: 900,
  speechThreshold: 0.08
});
assert.equal(state.shouldAutoStop, false, "silence before speech must not stop");

state = reduceVoiceActivity(state, {
  type: "level",
  now: 1200,
  level: 0.22,
  silenceMs: 900,
  speechThreshold: 0.08
});
assert.equal(state.hasSpeech, true);
assert.equal(state.shouldAutoStop, false);

state = reduceVoiceActivity(state, {
  type: "level",
  now: 1800,
  level: 0.01,
  silenceMs: 900,
  speechThreshold: 0.08
});
assert.equal(state.shouldAutoStop, false);

state = reduceVoiceActivity(state, {
  type: "level",
  now: 2750,
  level: 0.01,
  silenceMs: 900,
  speechThreshold: 0.08
});
assert.equal(state.shouldAutoStop, true);

state = reduceVoiceActivity(state, { type: "reset" });
assert.deepEqual(state, createVoiceActivityState());

state = createVoiceActivityState();
state = reduceVoiceActivity(state, {
  type: "level",
  now: 1000,
  level: 0.3,
  silenceMs: 500,
  speechThreshold: 0.08,
  minSpeechMs: 240,
  minSpeechFrames: 2
});
state = reduceVoiceActivity(state, {
  type: "level",
  now: 1700,
  level: 0.01,
  silenceMs: 500,
  speechThreshold: 0.08,
  minSpeechMs: 240,
  minSpeechFrames: 2
});
assert.equal(
  state.shouldAutoStop,
  false,
  "one loud frame must not auto-send a live voice turn"
);

state = reduceVoiceActivity(state, {
  type: "level",
  now: 1800,
  level: 0.3,
  silenceMs: 500,
  speechThreshold: 0.08,
  minSpeechMs: 240,
  minSpeechFrames: 2
});
state = reduceVoiceActivity(state, {
  type: "level",
  now: 2300,
  level: 0.26,
  silenceMs: 500,
  speechThreshold: 0.08,
  minSpeechMs: 240,
  minSpeechFrames: 2
});
state = reduceVoiceActivity(state, {
  type: "level",
  now: 2900,
  level: 0.01,
  silenceMs: 500,
  speechThreshold: 0.08,
  minSpeechMs: 240,
  minSpeechFrames: 2
});
assert.equal(state.shouldAutoStop, false);
state = reduceVoiceActivity(state, {
  type: "level",
  now: 3450,
  level: 0.01,
  silenceMs: 500,
  speechThreshold: 0.08,
  minSpeechMs: 240,
  minSpeechFrames: 2
});
assert.equal(state.shouldAutoStop, true);

assert.equal(
  getNormalizedAudioLevelFromTimeDomainData(new Uint8Array([128, 128, 128])),
  0
);
assert.ok(
  getNormalizedAudioLevelFromTimeDomainData(new Uint8Array([128, 160, 96])) >
    0.4,
  "time-domain RMS should turn speech-like waveform movement into a strong level"
);

console.log("voiceActivity tests passed");
