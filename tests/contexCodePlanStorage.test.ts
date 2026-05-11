import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import {
  getPlanSidecarPath,
  listContexCodePlans,
  loadContexCodePlan,
  saveContexCodePlan,
} from "../src/contexCode/planStorage";

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

const adapter = new MemoryAdapter();
const plan = makeContexCodePlan();
assert.equal(getPlanSidecarPath(plan.id), ".contex/plans/ccp_20260510_test_plan.json");

await saveContexCodePlan(adapter, plan);
assert.equal(await adapter.exists(".contex"), true);
assert.equal(await adapter.exists(".contex/plans"), true);

const loaded = await loadContexCodePlan(adapter, plan.id);
assert.equal(loaded.title, plan.title);

const listed = await listContexCodePlans(adapter);
assert.equal(listed.length, 1);
assert.equal(listed[0].id, plan.id);

console.log("contexCodePlanStorage tests passed");
