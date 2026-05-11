import type { ContexCodePlan } from "../src/contexCode/planTypes";

export function makeContexCodePlan(overrides: Partial<ContexCodePlan> = {}): ContexCodePlan {
  const now = "2026-05-10T00:00:00.000Z";
  return {
    version: 1,
    id: "ccp_20260510_test_plan",
    title: "Test Plan",
    status: "active",
    projectNotePath: "Projects/Test Plan.md",
    currentTaskId: "task_1_1_first_task",
    createdAt: now,
    updatedAt: now,
    sources: [
      {
        id: "src_vault_spec",
        type: "vault",
        title: "Project spec",
        path: "Obsidian/Spec.md",
        confidence: 0.91,
      },
      {
        id: "src_web_docs",
        type: "web",
        title: "External docs",
        url: "https://example.com/docs",
        accessedAt: "2026-05-10",
        confidence: 0.84,
      },
    ],
    phases: [
      {
        id: "phase_1",
        title: "Foundation",
        status: "in_progress",
        summary: "Build the plan contract.",
        tasks: [
          {
            id: "task_1_1_first_task",
            title: "First task",
            status: "in_progress",
            summary: "Create the first stable unit.",
            acceptance: ["Contract is serializable", "Progress can be rendered"],
            files: ["src/contexCode/planTypes.ts"],
            commands: ["npm run test"],
            sources: ["src_vault_spec"],
            updatedAt: now,
          },
          {
            id: "task_1_2_second_task",
            title: "Second task",
            status: "queued",
            summary: "Continue after the first task.",
            acceptance: ["Next task can be prepared"],
            files: ["src/contexCode/taskPacket.ts"],
            sources: ["src_web_docs"],
            updatedAt: now,
          },
        ],
      },
    ],
    ...overrides,
  };
}
