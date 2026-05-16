import assert from "node:assert/strict";
import {
  WikiMemoryController,
  actionReceiptToWikiReceipt
} from "../src/wiki/wikiMemoryController";
import type { ActionReceipt, ContexSettings } from "../src/types";

class MemoryAdapter {
  folders = new Set<string>();
  files = new Map<string, string>();

  async exists(path: string): Promise<boolean> {
    return this.folders.has(path) || this.files.has(path);
  }

  async mkdir(path: string): Promise<void> {
    this.folders.add(path);
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async read(path: string): Promise<string> {
    const content = this.files.get(path);

    if (content === undefined) {
      throw new Error(`Missing file: ${path}`);
    }

    return content;
  }
}

const now = "2026-05-13T05:00:00.000Z";

function createController(settings: Partial<ContexSettings> = {}) {
  const adapter = new MemoryAdapter();
  const app = {
    vault: {
      adapter
    }
  };
  const controller = new WikiMemoryController({
    app,
    getSettings: () =>
      ({
        wikiEnabled: true,
        wikiMemoryMode: "auto-safe",
        wikiRootFolder: "Contex Wiki",
        ...settings
      }) as ContexSettings,
    getActiveChatId: () => "chat-1",
    now: () => now
  });

  return { adapter, controller };
}

const ignored = await createController().controller.recordAutopilotMemory({
  userText: "Thanks.",
  assistantText: "No problem."
});

assert.equal(ignored.status, "skipped");
assert.equal(ignored.decision?.shouldWriteWiki, false);
assert.ok(ignored.decision?.misses.some((miss) => miss.includes("No saved")));

const createdReceipt: ActionReceipt = {
  status: "saved",
  label: "Created note",
  detail: "Obsidian/Voice Plan.md",
  path: "Obsidian/Voice Plan.md"
};
const wikiReceipt = actionReceiptToWikiReceipt(createdReceipt, "action-1");

assert.equal(wikiReceipt.kind, "create_note");
assert.equal(wikiReceipt.status, "saved");
assert.equal(wikiReceipt.actionId, "action-1");

const openedReceipt = actionReceiptToWikiReceipt(
  { status: "opened", label: "Opened note", path: "Test/Test.md" },
  "action-2"
);

assert.equal(openedReceipt.kind, "open_note");

const appliedReceipt = actionReceiptToWikiReceipt(
  { status: "done", label: "Applied change", path: "Test/Test.md" },
  "action-3"
);

assert.equal(appliedReceipt.kind, "replace_text");

const { adapter, controller } = createController();
const saved = await controller.recordAutopilotMemory({
  userText: "Create a roadmap note for the local voice workflow with web research.",
  assistantText:
    "The result captures architecture decisions, risks, implementation tasks, and follow-up milestones for live voice mode.",
  receipts: [wikiReceipt],
  sourcePaths: ["Obsidian/Voice Plan.md"],
  webSources: [
    {
      title: "Voice AI 2026",
      url: "https://example.com/voice-ai-2026",
      snippet: "Modern local STT and TTS systems for real-time agents.",
      publishedDate: "2026-05-13"
    }
  ]
});

assert.equal(saved.status, "written");
assert.ok(saved.rawPath);
assert.ok(saved.nodePath);
assert.match(adapter.files.get(saved.rawPath!) ?? "", /# Automatic Wiki Memory/);
assert.match(adapter.files.get(saved.nodePath!) ?? "", /## Sources/);
assert.match(adapter.files.get("Contex Wiki/Schema/nodes.jsonl") ?? "", /Voice Plan/);

const manual = await createController({
  wikiMemoryMode: "manual"
}).controller.recordAutopilotMemory({
  userText: "Create a roadmap note.",
  assistantText: "Saved durable project memory.",
  receipts: [wikiReceipt]
});

assert.equal(manual.status, "manual");

console.log("wikiMemoryController tests passed");
