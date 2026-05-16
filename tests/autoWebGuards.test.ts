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

console.log("autoWebGuards tests passed");
