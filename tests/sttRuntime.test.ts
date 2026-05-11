import assert from "node:assert/strict";
import {
  getSttRuntimeConfig,
  shouldAutoStartSttBackend
} from "../src/voice/sttRuntime";

assert.equal(shouldAutoStartSttBackend("faster-whisper"), true);
assert.equal(shouldAutoStartSttBackend("parakeet"), true);

assert.equal(getSttRuntimeConfig("faster-whisper").requirementsFile, "requirements-faster-whisper.txt");
assert.equal(getSttRuntimeConfig("parakeet").requirementsFile, "requirements-parakeet.txt");

assert.equal(
  getSttRuntimeConfig("parakeet").startupLabel.includes("Parakeet"),
  true
);

console.log("sttRuntime tests passed");
