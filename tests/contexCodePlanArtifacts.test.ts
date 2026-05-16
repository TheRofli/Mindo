import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import {
  buildContexCodeArtifactPaths,
  renderContexCodeDesignSpec,
  renderContexCodeFullIdePlan,
} from "../src/contexCode/planArtifacts";

const paths = buildContexCodeArtifactPaths(
  "Projects/LiveShare.md",
  "LiveShare",
  "ccp_20260511_liveshare",
);

assert.equal(paths.designSpecPath, "Projects/LiveShare - design.md");
assert.equal(paths.fullPlanPath, ".contex/plans/ccp_20260511_liveshare - ide-plan.md");

const plan = makeContexCodePlan({
  title: "LiveShare",
  projectNotePath: "Projects/LiveShare.md",
  designSpecPath: paths.designSpecPath,
  fullPlanPath: paths.fullPlanPath,
});
const markdown = "# LiveShare\n\nA collaborative Obsidian workspace for shared Markdown sessions.";

const designSpec = renderContexCodeDesignSpec(plan, markdown);
assert.match(designSpec, /^# LiveShare - Design Spec/m);
assert.match(designSpec, /Project note: \[\[Projects\/LiveShare\]\]/);
assert.match(designSpec, /Full IDE plan: \[\[\.contex\/plans\/ccp_20260511_liveshare - ide-plan\]\]/);
assert.match(designSpec, /## Open Questions/);

const fullPlan = renderContexCodeFullIdePlan(plan, markdown);
assert.match(fullPlan, /^# LiveShare Implementation Plan/m);
assert.match(fullPlan, /This is the full Mindo Code plan for IDE and coding-agent handoff/);
assert.match(fullPlan, /### Task 1\.1: First task/);
assert.match(fullPlan, /Acceptance:/);
assert.match(fullPlan, /Verification:/);

console.log("contexCodePlanArtifacts tests passed");
