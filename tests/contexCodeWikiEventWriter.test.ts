import assert from "node:assert/strict";
import { buildContexCodeWikiEvent } from "../src/contexCode/wikiEvents";
import { createContexCodeWikiEventWriter } from "../src/contexCode/wikiEventWriter";
import type { ContexCodePlan } from "../src/contexCode/planTypes";

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

const plan: ContexCodePlan = {
  id: "ccp_livecollab",
  title: "LiveCollab",
  status: "active",
  mode: "coding task plan for IDE / agent handoff",
  projectNotePath: "Projects/LiveCollab.md",
  currentTaskId: "task_1",
  sections: [
    {
      id: "section_1",
      title: "Foundation",
      tasks: [
        {
          id: "task_1",
          title: "Implement session manager",
          status: "run"
        }
      ]
    }
  ],
  createdAt: "2026-05-11T00:00:00.000Z",
  updatedAt: "2026-05-11T00:00:00.000Z"
};

async function main(): Promise<void> {
  const writer = createContexCodeWikiEventWriter(app as never, {
    wikiEnabled: true,
    wikiRootFolder: "Contex Wiki"
  });

  await writer.writeContexCodeEvent?.(
    buildContexCodeWikiEvent(
      plan,
      "plan_created",
      "2026-05-11T01:00:00.000Z",
      plan.sections[0]?.tasks[0]
    )
  );

  const eventLog = adapter.files.get("Contex Wiki/Schema/contex-code-events.jsonl");

  assert.ok(eventLog);
  assert.equal(eventLog?.split("\n").filter(Boolean).length, 1);

  const event = JSON.parse(eventLog.trim()) as Record<string, unknown>;

  assert.equal(event.type, "contex_code.plan_created");
  assert.equal(event.planId, "ccp_livecollab");
  assert.equal(event.taskTitle, "Implement session manager");
  assert.equal(event.projectNotePath, "Projects/LiveCollab.md");

  await writer.writeContexCodeEvent?.(
    buildContexCodeWikiEvent(
      plan,
      "plan_created",
      "2026-05-11T01:00:00.000Z",
      plan.sections[0]?.tasks[0]
    )
  );

  assert.equal(
    adapter.files
      .get("Contex Wiki/Schema/contex-code-events.jsonl")
      ?.split("\n")
      .filter(Boolean).length,
    1
  );
}

void main();
