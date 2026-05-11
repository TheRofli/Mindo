import assert from "node:assert/strict";
import { buildContexDoctorReport } from "../src/diagnostics/contexDoctor";
import { DEFAULT_SETTINGS } from "../src/types";

const healthy = buildContexDoctorReport({
  settings: {
    ...DEFAULT_SETTINGS,
    webSearchEnabled: true,
    webSearchProvider: "duckduckgo",
    baseUrl: "http://127.0.0.1:8085/v1"
  },
  activeNotePath: "Obsidian/Test.md",
  rust: {
    mode: "sidecar",
    executablePath: "bin/contex-core.exe",
    documents: 3,
    chunks: 9,
    lastIndexMs: 12,
    lastQueryMs: 3
  },
  services: {
    llm: "ok",
    stt: "ok",
    tts: "ok",
    web: "ok"
  }
});

assert.equal(healthy.overall, "ok");
assert.equal(healthy.checks.some((check) => check.id === "rust-core"), true);
assert.equal(healthy.checks.some((check) => check.id === "web-search"), true);

const broken = buildContexDoctorReport({
  settings: {
    ...DEFAULT_SETTINGS,
    baseUrl: "",
    webSearchEnabled: false
  },
  activeNotePath: null,
  rust: {
    mode: "not-found"
  },
  services: {
    llm: "fail",
    stt: "unknown",
    tts: "unknown",
    web: "disabled"
  }
});

assert.equal(broken.overall, "fail");
assert.ok(
  broken.checks.find((check) => check.id === "llm-endpoint")?.message.includes(
    "Base URL"
  )
);
assert.ok(
  broken.checks.find((check) => check.id === "rust-core")?.message.includes(
    "not found"
  )
);

console.log("contexDoctor tests passed");
