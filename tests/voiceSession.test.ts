import assert from "node:assert/strict";
import {
  createVoiceSessionState,
  reduceVoiceSession
} from "../src/voice/voiceSession";

let state = createVoiceSessionState();
state = reduceVoiceSession(state, { type: "start", now: 1000 });
assert.equal(state.status, "recording");
assert.equal(state.elapsedMs, 0);

state = reduceVoiceSession(state, { type: "tick", now: 2500 });
assert.equal(state.elapsedMs, 1500);

state = reduceVoiceSession(state, { type: "stop_insert", now: 3000 });
assert.equal(state.status, "transcribing");
assert.equal(state.stopMode, "insert");

state = reduceVoiceSession(createVoiceSessionState(), { type: "start", now: 1000 });
state = reduceVoiceSession(state, { type: "send", now: 2000 });
assert.equal(state.stopMode, "send");
assert.equal(state.status, "transcribing");
assert.equal(state.elapsedMs, 1000);

state = reduceVoiceSession(state, { type: "finish" });
assert.equal(state.status, "idle");
assert.equal(state.elapsedMs, 0);

console.log("voiceSession tests passed");
