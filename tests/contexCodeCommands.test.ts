import assert from "node:assert/strict";
import {
  createContexCodePlanFromActiveNote,
  markCurrentContexCodeTaskDone,
  prepareCurrentContexCodeTaskPacket,
  syncCurrentContexCodePlan,
} from "../src/contexCode/planCommands";

class MemoryAdapter {
  files = new Map<string, string>();
  folders = new Set<string>();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.folders.has(path);
  }

  async mkdir(path: string): Promise<void> {
    this.folders.add(path);
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async read(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error(`Missing file: ${path}`);
    return content;
  }

  async list(path: string): Promise<string[]> {
    return [...this.files.keys()].filter((filePath) => filePath.startsWith(`${path}/`));
  }
}

const activeFile = { path: "Projects/Context Code.md", basename: "Context Code", name: "Context Code.md" };
const adapter = new MemoryAdapter();
adapter.files.set(activeFile.path, "# Context Code\n\nBuild a bridge between Obsidian and coding agents.");

const app = {
  vault: {
    adapter,
    async read(file: { path: string }): Promise<string> {
      return adapter.read(file.path);
    },
    async modify(file: { path: string }, content: string): Promise<void> {
      await adapter.write(file.path, content);
    },
  },
  workspace: {
    getActiveFile() {
      return activeFile;
    },
  },
};

const created = await createContexCodePlanFromActiveNote(app);
assert.equal(created.status, "saved");
assert.equal(created.path, activeFile.path);
assert.match(await adapter.read(activeFile.path), /\[!contex-code\]/);
assert.equal(created.plan.designSpecPath, "Projects/Context Code - design.md");
assert.ok(created.plan.fullPlanPath);
const createdDesignSpecPath = created.plan.designSpecPath;
const createdFullPlanPath = created.plan.fullPlanPath;
assert.ok(createdDesignSpecPath);
assert.ok(createdFullPlanPath);
assert.match(await adapter.read(createdDesignSpecPath), /# Context Code - Design Spec/);
assert.match(await adapter.read(createdFullPlanPath), /# Context Code Implementation Plan/);

const packet = await prepareCurrentContexCodeTaskPacket(app);
assert.equal(packet.status, "done");
assert.match(packet.packet, /Mindo Code Task Packet/);

const marked = await markCurrentContexCodeTaskDone(app);
assert.equal(marked.status, "saved");
assert.match(await adapter.read(activeFile.path), /100%/);

const synced = await syncCurrentContexCodePlan(app);
assert.equal(synced.status, "saved");

const liveShareFile = {
  path: "Test/только предложить правку.md",
  basename: "только предложить правку",
  name: "только предложить правку.md",
};
adapter.files.set(
  liveShareFile.path,
  "# LiveShare\n\nObsidian plugin for collaborative Markdown workspaces.\n\n## Workflow\nShare, comment, vote, and merge changes.",
);
const liveShareApp = {
  ...app,
  workspace: {
    getActiveFile() {
      return liveShareFile;
    },
  },
};
const liveSharePlan = await createContexCodePlanFromActiveNote(liveShareApp);
assert.equal(liveSharePlan.plan.title, "LiveShare");
const liveShareNote = await adapter.read(liveShareFile.path);
assert.match(liveShareNote, /Mindo Code ·/);
assert.match(liveShareNote, /\*\*Project\*\* LiveShare/);
assert.match(liveShareNote, /full IDE plan/);

const aiDraftFile = {
  path: "Projects/LiveShare.md",
  basename: "LiveShare",
  name: "LiveShare.md",
};
adapter.files.set(
  aiDraftFile.path,
  "# LiveShare\n\nCollaborative Obsidian workspace.",
);
const aiDraftApp = {
  ...app,
  workspace: {
    getActiveFile() {
      return aiDraftFile;
    },
  },
};
const aiDraftPlan = await createContexCodePlanFromActiveNote(aiDraftApp, {
  planDraft: {
    title: "LiveShare Engineering Plan",
    phases: [
      {
        title: "MVP Collaboration Core",
        summary: "Build the shared-note foundation.",
        tasks: [
          {
            title: "Define share session contract",
            summary: "Specify IDs, permissions, and merge boundaries.",
            acceptance: ["Session schema is documented.", "Unsafe writes are blocked."],
          },
          {
            title: "Implement suggestion workflow",
            summary: "Add propose, review, accept, and reject flows.",
            acceptance: ["Diff proposals can be accepted.", "Rejected proposals leave no edits."],
          },
        ],
      },
    ],
  },
});
assert.equal(aiDraftPlan.plan.title, "LiveShare Engineering Plan");
assert.equal(aiDraftPlan.plan.phases[0]?.title, "MVP Collaboration Core");
assert.equal(aiDraftPlan.plan.phases[0]?.tasks.length, 2);

console.log("contexCodeCommands tests passed");
