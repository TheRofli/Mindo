import type {
  ContexDoctorCheck,
  ContexDoctorReport,
  DoctorSeverity
} from "./contexDoctor";

export type OnboardingStepStatus = "done" | "todo" | "optional";

export interface OnboardingStep {
  id: string;
  label: string;
  status: OnboardingStepStatus;
  message: string;
  action: string;
  advanced: boolean;
}

export interface OnboardingChecklist {
  isReady: boolean;
  steps: OnboardingStep[];
}

export function buildOnboardingChecklist(
  report: ContexDoctorReport
): OnboardingChecklist {
  const byId = new Map(report.checks.map((check) => [check.id, check]));
  const steps = [
    buildStep(
      byId.get("llm-endpoint"),
      "llm-endpoint",
      "Connect an LLM",
      "Set Base URL, API key/profile, model and temperature.",
      false
    ),
    buildStep(
      byId.get("active-note"),
      "active-note",
      "Open a Markdown note",
      "Open any Markdown note so Contex can ground actions in the active file.",
      false
    ),
    buildStep(
      byId.get("stt"),
      "stt-runtime",
      "Auto-start or configure STT",
      "Enable bundled STT auto-start or set a working STT endpoint.",
      false
    ),
    buildStep(
      byId.get("tts"),
      "tts-runtime",
      "Auto-start or configure TTS",
      "Enable Silero/Kokoro runtime or use browser fallback.",
      false
    ),
    buildStep(
      byId.get("web-search"),
      "web-search",
      "Enable web search",
      "Use DuckDuckGo direct or configure a SearXNG endpoint.",
      false
    ),
    buildStep(
      byId.get("rust-core"),
      "rust-core",
      "Enable Rust acceleration",
      "Ship or build the Rust sidecar binary; TypeScript fallback remains available.",
      true
    )
  ];

  return {
    isReady: steps.every((step) => step.status === "done" || step.advanced),
    steps
  };
}

export function formatOnboardingChecklist(
  checklist: OnboardingChecklist
): string {
  return [
    "# Contex onboarding",
    "",
    checklist.isReady
      ? "Core setup is ready."
      : "Finish the open items below to make Contex reliable.",
    "",
    ...checklist.steps.map((step) => {
      const marker = step.status === "done" ? "x" : " ";
      const advanced = step.advanced ? " (advanced)" : "";
      return `- [${marker}] ${step.label}${advanced}: ${step.action}`;
    })
  ].join("\n");
}

function buildStep(
  check: ContexDoctorCheck | undefined,
  id: string,
  label: string,
  action: string,
  advanced: boolean
): OnboardingStep {
  const severity = check?.severity ?? "warn";

  return {
    id,
    label,
    status: getStepStatus(severity, advanced),
    message: check?.message ?? "Not checked yet.",
    action,
    advanced
  };
}

function getStepStatus(
  severity: DoctorSeverity,
  advanced: boolean
): OnboardingStepStatus {
  if (severity === "ok") {
    return "done";
  }

  return advanced ? "optional" : "todo";
}
