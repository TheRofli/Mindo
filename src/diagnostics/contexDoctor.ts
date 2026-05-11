import type { RustCoreRuntimeDiagnostics } from "../rustCore/indexedSearch";
import type { ContexSettings } from "../types";

export type DoctorSeverity = "ok" | "warn" | "fail";
export type ServiceHealth = "ok" | "fail" | "disabled" | "unknown";

export interface ContexDoctorInput {
  settings: ContexSettings;
  activeNotePath: string | null;
  rust: RustCoreRuntimeDiagnostics;
  services: {
    llm: ServiceHealth;
    stt: ServiceHealth;
    tts: ServiceHealth;
    web: ServiceHealth;
  };
}

export interface ContexDoctorCheck {
  id: string;
  label: string;
  severity: DoctorSeverity;
  message: string;
  detail?: string;
}

export interface ContexDoctorReport {
  overall: DoctorSeverity;
  checks: ContexDoctorCheck[];
  createdAt: number;
}

export function buildContexDoctorReport(
  input: ContexDoctorInput
): ContexDoctorReport {
  const checks = [
    checkLlmEndpoint(input),
    checkRustCore(input),
    checkActiveNote(input),
    checkWebSearch(input),
    checkStt(input),
    checkTts(input)
  ];

  return {
    overall: summarizeSeverity(checks),
    checks,
    createdAt: Date.now()
  };
}

function checkLlmEndpoint(input: ContexDoctorInput): ContexDoctorCheck {
  const baseUrl = input.settings.baseUrl.trim();

  if (!baseUrl) {
    return {
      id: "llm-endpoint",
      label: "LLM endpoint",
      severity: "fail",
      message: "Base URL is empty."
    };
  }

  if (input.services.llm === "fail") {
    return {
      id: "llm-endpoint",
      label: "LLM endpoint",
      severity: "fail",
      message: `LLM endpoint is not reachable: ${baseUrl}`
    };
  }

  return {
    id: "llm-endpoint",
    label: "LLM endpoint",
    severity: "ok",
    message: `${input.settings.model} at ${baseUrl}`
  };
}

function checkRustCore(input: ContexDoctorInput): ContexDoctorCheck {
  if (input.rust.mode === "sidecar") {
    return {
      id: "rust-core",
      label: "Rust core",
      severity: "ok",
      message: `Rust sidecar active: ${input.rust.documents ?? 0} docs, ${input.rust.chunks ?? 0} chunks.`,
      detail: input.rust.executablePath
    };
  }

  if (input.rust.mode === "error") {
    return {
      id: "rust-core",
      label: "Rust core",
      severity: "warn",
      message:
        input.rust.lastError ?? "Rust core failed and TypeScript fallback is active.",
      detail: input.rust.executablePath
    };
  }

  if (input.rust.mode === "typescript-fallback") {
    return {
      id: "rust-core",
      label: "Rust core",
      severity: "warn",
      message: "TypeScript RAG fallback is active."
    };
  }

  return {
    id: "rust-core",
    label: "Rust core",
    severity: "warn",
    message: "Rust binary not found. TypeScript fallback will be used."
  };
}

function checkActiveNote(input: ContexDoctorInput): ContexDoctorCheck {
  return input.activeNotePath
    ? {
        id: "active-note",
        label: "Active note",
        severity: "ok",
        message: input.activeNotePath
      }
    : {
        id: "active-note",
        label: "Active note",
        severity: "warn",
        message: "No active Markdown note."
      };
}

function checkWebSearch(input: ContexDoctorInput): ContexDoctorCheck {
  if (!input.settings.webSearchEnabled) {
    return {
      id: "web-search",
      label: "Web search",
      severity: "warn",
      message: "Web search is disabled."
    };
  }

  return {
    id: "web-search",
    label: "Web search",
    severity: input.services.web === "fail" ? "warn" : "ok",
    message: `${input.settings.webSearchProvider} via ${
      input.settings.webSearchEndpoint || "direct"
    }`
  };
}

function checkStt(input: ContexDoctorInput): ContexDoctorCheck {
  return {
    id: "stt",
    label: "Speech to text",
    severity: input.services.stt === "fail" ? "warn" : "ok",
    message: `${input.settings.sttModel} at ${input.settings.sttEndpoint}`
  };
}

function checkTts(input: ContexDoctorInput): ContexDoctorCheck {
  return {
    id: "tts",
    label: "Text to speech",
    severity: input.services.tts === "fail" ? "warn" : "ok",
    message: `${input.settings.ttsProvider}`
  };
}

function summarizeSeverity(checks: ContexDoctorCheck[]): DoctorSeverity {
  if (checks.some((check) => check.severity === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.severity === "warn")) {
    return "warn";
  }

  return "ok";
}
