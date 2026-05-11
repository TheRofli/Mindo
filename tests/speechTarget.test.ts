import assert from "node:assert/strict";
import { findLatestAssistantSpeechMessage } from "../src/voice/speechTarget";

const target = findLatestAssistantSpeechMessage([
  { role: "assistant", content: "first", createdAt: 1 },
  { role: "user", content: "read", createdAt: 2 },
  { role: "assistant", content: "latest", createdAt: 3 }
]);

assert.equal(target?.content, "latest");

console.log("speechTarget tests passed");
