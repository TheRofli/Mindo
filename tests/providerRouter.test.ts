import assert from "node:assert/strict";
import {
  inferProviderKind,
  normalizeProviderConfig
} from "../src/providers/providerRouter";

assert.equal(inferProviderKind("http://127.0.0.1:11434/v1"), "ollama");
assert.equal(inferProviderKind("http://127.0.0.1:1234/v1"), "lm-studio");
assert.equal(inferProviderKind("https://api.openai.com/v1"), "openai-compatible");

const config = normalizeProviderConfig({
  baseUrl: "http://127.0.0.1:11434/v1/",
  model: "gemma3:4b",
  temperature: 0.3
});

assert.equal(config.baseUrl, "http://127.0.0.1:11434/v1");
assert.equal(config.kind, "ollama");

console.log("providerRouter tests passed");
