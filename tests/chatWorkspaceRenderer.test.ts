import assert from "node:assert/strict";
import {
  getChatWorkspaceAriaLabel,
  getChatWorkspaceClassNames
} from "../src/views/chatWorkspaceRenderer";

assert.deepEqual(getChatWorkspaceClassNames(), {
  suggestions: "contex-agent__suggestions",
  chat: "contex-agent__chat"
});

assert.equal(getChatWorkspaceAriaLabel(), "Chat messages");

console.log("chatWorkspaceRenderer tests passed");
