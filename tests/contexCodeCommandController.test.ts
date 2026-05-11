import assert from "node:assert/strict";
import { ContexCodeCommandController } from "../src/contexCode/commandController";

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

    if (content === undefined) {
      throw new Error(`Missing file: ${path}`);
    }

    return content;
  }

  async list(path: string): Promise<string[]> {
    return [...this.files.keys()].filter((filePath) => filePath.startsWith(`${path}/`));
  }
}

const adapter = new MemoryAdapter();
const activeFile = {
  path: "Projects/LiveCollab.md",
  basename: "LiveCollab",
  name: "LiveCollab.md"
};
adapter.files.set(activeFile.path, "# LiveCollab\n\nCollaborative Markdown workspace.");

const app = {
  vault: {
    adapter,
    async read(file: { path: string }): Promise<string> {
      return adapter.read(file.path);
    },
    async modify(file: { path: string }, content: string): Promise<void> {
      await adapter.write(file.path, content);
    }
  },
  workspace: {
    getActiveFile() {
      return activeFile;
    }
  }
};

async function main(): Promise<void> {
  const controller = new ContexCodeCommandController(app, {
    wikiEnabled: true,
    wikiRootFolder: "Contex Wiki"
  });

  const created = await controller.createPlan({
    title: "LiveCollab",
    phases: [
      {
        title: "Foundation",
        tasks: [{ title: "Implement session manager" }]
      }
    ]
  });

  assert.equal(created.status, "saved");
  assert.equal(created.plan.title, "LiveCollab");

  const packet = await controller.prepareTaskPacket();
  assert.match(packet.packet, /Implement session manager/);

  await controller.markTaskDone();
  await controller.syncPlan();

  const events = adapter.files
    .get("Contex Wiki/Schema/contex-code-events.jsonl")
    ?.split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

  assert.equal(events?.length, 4);
  assert.deepEqual(
    events?.map((event) => event.type),
    [
      "contex_code.plan_created",
      "contex_code.task_packet_prepared",
      "contex_code.task_completed",
      "contex_code.plan_synced"
    ]
  );
}

void main();
