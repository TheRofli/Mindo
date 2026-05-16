import assert from "node:assert/strict";
import {
  getModelProfileMenuItemTitle,
  isModelMenuOpen
} from "../src/views/modelMenuRenderer";
import type { LlmModelProfile } from "../src/types";

const profile: LlmModelProfile = {
  id: "local",
  name: "Local Gemma",
  baseUrl: "http://127.0.0.1:11434/v1",
  apiKey: "",
  model: "gemma-4-e4b-it",
  temperature: 0.6,
  supportsVision: true
};

assert.equal(
  getModelProfileMenuItemTitle(profile),
  "gemma-4-e4b-it | http://127.0.0.1:11434/v1"
);

function createMenuElement(hidden: boolean): HTMLElement {
  const element = {
    classList: {
      contains: (className: string) =>
        hidden && className === "contex-agent__hidden"
    }
  };
  return element as HTMLElement;
}

const hiddenMenu = createMenuElement(true);
const visibleMenu = createMenuElement(false);

assert.equal(isModelMenuOpen(null), false);
assert.equal(isModelMenuOpen(hiddenMenu), false);
assert.equal(isModelMenuOpen(visibleMenu), true);

console.log("modelMenuRenderer tests passed");
