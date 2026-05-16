import assert from "node:assert/strict";
import {
  buildOnboardingChecklist,
  formatOnboardingChecklist
} from "../src/diagnostics/onboarding";
import type { ContexDoctorReport } from "../src/diagnostics/contexDoctor";

const report: ContexDoctorReport = {
  overall: "warn",
  createdAt: 0,
  checks: [
    {
      id: "llm-endpoint",
      label: "LLM endpoint",
      severity: "ok",
      message: "gemini"
    },
    {
      id: "rust-core",
      label: "Rust core",
      severity: "warn",
      message: "Rust binary not found."
    },
    {
      id: "stt",
      label: "Speech to text",
      severity: "warn",
      message: "STT failed"
    },
    {
      id: "web-search",
      label: "Web search",
      severity: "warn",
      message: "Web search is disabled."
    }
  ]
};

const checklist = buildOnboardingChecklist(report);

assert.equal(checklist.isReady, false);
assert.equal(checklist.steps[0]!.id, "llm-endpoint");
assert.equal(checklist.steps[0]!.status, "done");
assert.equal(checklist.steps.some((step) => step.id === "stt-runtime"), true);
assert.equal(checklist.steps.some((step) => step.advanced), true);

const markdown = formatOnboardingChecklist(checklist);

assert.ok(markdown.includes("Mindo onboarding"));
assert.ok(markdown.includes("[x]"));
assert.ok(markdown.includes("Auto-start or configure STT"));

console.log("onboardingPlan tests passed");
