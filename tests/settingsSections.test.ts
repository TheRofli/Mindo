import assert from "node:assert/strict";
import {
  CONTEX_SETTINGS_SECTIONS,
  sanitizeContexSettingsSection
} from "../src/settings/settingSections";

assert.deepEqual(
  CONTEX_SETTINGS_SECTIONS.map((section) => section.id),
  ["model", "dialogue", "voice", "web", "wiki"]
);
assert.equal(sanitizeContexSettingsSection("dialogue"), "dialogue");
assert.equal(sanitizeContexSettingsSection("voice"), "voice");
assert.equal(sanitizeContexSettingsSection("bad"), "model");

console.log("settingsSections tests passed");
