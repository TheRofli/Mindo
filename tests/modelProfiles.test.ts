import assert from "node:assert/strict";
import {
  applyModelProfile,
  createModelProfileFromSettings,
  sanitizeModelProfiles
} from "../src/settings/modelProfiles";
import { DEFAULT_SETTINGS } from "../src/types";

const migrated = sanitizeModelProfiles({
  ...DEFAULT_SETTINGS,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: "gemini-key",
  model: "gemini-2.5-flash",
  temperature: 0.6,
  supportsVision: true,
  modelProfiles: [],
  activeModelProfileId: ""
});

assert.equal(migrated.profiles.length, 1);
assert.equal(migrated.profiles[0].model, "gemini-2.5-flash");
assert.equal(migrated.profiles[0].baseUrl, "https://generativelanguage.googleapis.com/v1beta/openai");
assert.equal(migrated.activeProfileId, migrated.profiles[0].id);

const localProfile = createModelProfileFromSettings({
  ...DEFAULT_SETTINGS,
  model: "local-test",
  temperature: 0.2
});
const geminiProfile = {
  ...localProfile,
  id: "gemini",
  name: "Gemini Flash",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: "key",
  model: "gemini-2.5-flash",
  temperature: 0.4,
  supportsVision: true
};
const applied = applyModelProfile(DEFAULT_SETTINGS, geminiProfile);

assert.equal(applied.baseUrl, geminiProfile.baseUrl);
assert.equal(applied.model, "gemini-2.5-flash");
assert.equal(applied.temperature, 0.4);
assert.equal(applied.activeModelProfileId, "gemini");

console.log("modelProfiles tests passed");
