import assert from "node:assert/strict";
import { isVaultLocalDescriptionRequest } from "../src/chat/autoWebGuards";

assert.equal(
  isVaultLocalDescriptionRequest(
    "Можешь описать быстрый файл, который сейчас у меня открыт? О чем он вообще?"
  ),
  true
);

assert.equal(
  isVaultLocalDescriptionRequest(
    "Опиши текущую заметку и проверь в интернете свежие данные"
  ),
  false
);

assert.equal(isVaultLocalDescriptionRequest("latest local LLM releases"), false);

assert.equal(isVaultLocalDescriptionRequest("What is this active note about?"), true);

assert.equal(
  isVaultLocalDescriptionRequest("Explain the opened file and use my vault notes."),
  true
);

assert.equal(
  isVaultLocalDescriptionRequest("Find qore systems strategy in my vault"),
  true
);

assert.equal(
  isVaultLocalDescriptionRequest("Search the web for qore systems strategy"),
  false
);

console.log("autoWebGuards tests passed");
