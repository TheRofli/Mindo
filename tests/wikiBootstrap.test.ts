import assert from "node:assert/strict";
import {
  ensureContexWikiStructure,
  getContexWikiPaths,
  getContexWikiStatus,
  normalizeWikiRootFolder
} from "../src/wiki/wikiBootstrap";

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

const adapter = new MemoryAdapter();
const app = {
  vault: {
    adapter
  }
};

async function main(): Promise<void> {
  assert.equal(normalizeWikiRootFolder("  /Mindo Wiki//  "), "Mindo Wiki");
  assert.equal(normalizeWikiRootFolder("../bad"), "Mindo Wiki");

  const paths = getContexWikiPaths("Knowledge/Core");

  assert.equal(paths.root, "Knowledge/Core");
  assert.ok(paths.raw.web.endsWith("/Raw/Web"));
  assert.ok(paths.wiki.projects.endsWith("/Wiki/Projects"));
  assert.ok(paths.wiki.prompts.endsWith("/Wiki/Prompts"));
  assert.ok(paths.schema.nodes.endsWith("/Schema/nodes.jsonl"));
  assert.ok(paths.schema.prompts.endsWith("/Schema/prompts.jsonl"));
  assert.ok(paths.schema.contexCodeEvents.endsWith("/Schema/contex-code-events.jsonl"));
  assert.ok(paths.inbox.proposedUpdates.endsWith("/Inbox/Proposed Updates"));

  const before = await getContexWikiStatus(app as never, {
    wikiRootFolder: "Mindo Wiki"
  });

  assert.equal(before.initialized, false);
  assert.ok(before.missingFolders.includes("Mindo Wiki/Raw/Web"));
  assert.ok(before.missingFiles.includes("Mindo Wiki/Schema/nodes.jsonl"));

  const after = await ensureContexWikiStructure(app as never, {
    wikiRootFolder: "Mindo Wiki"
  });

  assert.equal(after.initialized, true);
  assert.equal(adapter.files.get("Mindo Wiki/Schema/nodes.jsonl"), "");
  assert.equal(adapter.files.get("Mindo Wiki/Schema/contex-code-events.jsonl"), "");
  assert.equal(adapter.files.get("Mindo Wiki/Schema/aliases.json"), "{}\n");
  assert.ok(
    adapter.files
      .get("Mindo Wiki/Schema/prompts.jsonl")
      ?.includes('"id":"create-note-intent"')
  );
  assert.ok(
    adapter.files
      .get("Mindo Wiki/Schema/prompts.jsonl")
      ?.includes('"id":"contex-code-plan-seed"')
  );
  assert.ok(
    adapter.files
      .get("Mindo Wiki/Wiki/Prompts/Prompt Library.md")
      ?.includes("Create note intent")
  );
  assert.ok(
    adapter.files
      .get("Mindo Wiki/Wiki/Prompts/Prompt Library.md")
      ?.includes("Mindo Code Prompt Library")
  );
}

void main();
