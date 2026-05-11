import assert from "node:assert/strict";
import {
  createVoiceDialogueV2State,
  reduceVoiceDialogueV2,
  shouldFlushStreamingTtsChunk
} from "../src/voice/voiceDialogueV2";

let state = createVoiceDialogueV2State();

state = reduceVoiceDialogueV2(state, { type: "start_listening", now: 1000 });
assert.equal(state.phase, "listening");

state = reduceVoiceDialogueV2(state, {
  type: "partial_transcript",
  text: "открой тест",
  now: 1200
});
assert.equal(state.partialTranscript, "открой тест");

state = reduceVoiceDialogueV2(state, {
  type: "audio_level",
  level: 0.5,
  speechThreshold: 0.2,
  silenceMs: 600,
  now: 1300
});
state = reduceVoiceDialogueV2(state, {
  type: "audio_level",
  level: 0.01,
  speechThreshold: 0.2,
  silenceMs: 600,
  now: 1400
});
state = reduceVoiceDialogueV2(state, {
  type: "audio_level",
  level: 0.01,
  speechThreshold: 0.2,
  silenceMs: 600,
  now: 2101
});

assert.equal(state.shouldAutoStopRecording, true);

state = createVoiceDialogueV2State({ phase: "speaking" });
state = reduceVoiceDialogueV2(state, {
  type: "barge_in_transcript",
  text: "подожди открой другой файл",
  now: 3000
});

assert.equal(state.shouldCancelAssistantSpeech, true);
assert.equal(state.phase, "listening");

state = createVoiceDialogueV2State({ phase: "listening" });
state = reduceVoiceDialogueV2(state, { type: "send_pressed", now: 4000 });
assert.equal(state.shouldSubmitVoiceTurn, true);
assert.equal(state.phase, "transcribing");

assert.equal(
  shouldFlushStreamingTtsChunk("one two three four five six seven"),
  false
);
assert.equal(
  shouldFlushStreamingTtsChunk("one two three four five six seven eight"),
  true
);
assert.equal(shouldFlushStreamingTtsChunk("Коротко. Готово."), true);

console.log("voiceDialogueV2 tests passed");
