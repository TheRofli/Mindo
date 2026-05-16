import assert from "node:assert/strict";
import {
  getContexCodeMenuItems,
  getMoreActionsMenuItems
} from "../src/views/sidebarMenus";

const t = (key: string) => `label:${key}`;

assert.deepEqual(
  getMoreActionsMenuItems(t).map((item) => ({
    id: item.id,
    title: item.title,
    icon: item.icon
  })),
  [
    {
      id: "improve-prompt",
      title: "label:improvePrompt",
      icon: "wand-sparkles"
    },
    {
      id: "turn-chat-into-note",
      title: "label:turnChatIntoNote",
      icon: "file-plus-2"
    },
    {
      id: "research-web",
      title: "label:researchWeb",
      icon: "globe"
    },
    {
      id: "semantic-vault-search",
      title: "label:semanticVaultSearch",
      icon: "brain"
    },
    {
      id: "check-health",
      title: "label:checkHealth",
      icon: "refresh-cw"
    },
    {
      id: "diagnostics",
      title: "label:diagnostics",
      icon: "activity"
    }
  ]
);

assert.deepEqual(
  getContexCodeMenuItems(t).map((item) => ({
    id: item.id,
    title: item.title,
    icon: item.icon
  })),
  [
    {
      id: "create-code-plan",
      title: "label:createCodePlan",
      icon: "list-todo"
    },
    {
      id: "prepare-code-task-packet",
      title: "label:prepareCodeTaskPacket",
      icon: "clipboard-list"
    },
    {
      id: "mark-code-task-done",
      title: "label:markCodeTaskDone",
      icon: "check-check"
    },
    {
      id: "sync-code-plan",
      title: "label:syncCodePlan",
      icon: "refresh-cw"
    }
  ]
);

console.log("sidebarMenus tests passed");
