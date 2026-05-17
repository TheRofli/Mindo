# Contex Operating Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Contex Agent from a chat-first Obsidian assistant into a reliable operating layer that plans, executes, verifies, and displays vault actions with fast Rust-backed search and diagnostics.

**Architecture:** Keep Obsidian/Electron UI and Obsidian API integration in TypeScript. Move deterministic, performance-sensitive logic into `tools/contex_core`: vault candidate ranking, fuzzy path resolution, fast RAG indexing/search, diff calculation, and scenario harness support. Route every action through typed plans and typed receipts so the UI only says an action happened after the executor confirms it.

**Tech Stack:** Obsidian plugin TypeScript, Node/Electron child processes, dependency-free Rust core, OpenAI-compatible local LLM endpoints, local STT/TTS helpers, DuckDuckGo/SearXNG web search, Node `assert` tests, Cargo tests.

---

## Non-Negotiable Product Rules

- The agent must not claim that it opened, created, edited, accepted, rejected, or reverted anything until a real tool returns a success receipt.
- `Use current note` and `Use vault search` remain always-on defaults and do not return as visible main UI toggles.
- Main sidebar stays clean. Doctor, benchmarks, low-level logs, and Rust diagnostics live behind `... -> Diagnostics` or Command Palette.
- User-facing destructive actions require confirmation: delete, move, multi-file rewrite, overwrite existing file without generating a unique path.
- Non-destructive actions execute immediately: open, search, create unique note, preview diff, apply user-approved diff, undo own change.
- Router behavior must be semantic, not a growing dictionary of random STT mistakes. Fuzzy rules are allowed only as deterministic fallback after real vault candidates are presented to the router.
- Every action path must be testable without a live LLM by feeding deterministic router JSON and fake vault fixtures.

---

## Current Project Map

### Existing Files To Preserve

- `src/main.ts`: plugin lifecycle, commands, local STT/TTS process controls.
- `src/views/AgentSidebarView.ts`: current sidebar UI, chat state, command flow, voice flow, create note workflow, diff rendering.
- `src/views/semanticLocalCommandPlan.ts`: current JSON parser for semantic local commands.
- `src/tools/localCommandRouter.ts`: maps parsed semantic commands to local action objects.
- `src/rag/vaultRag.ts`: vault document collection and Rust/TypeScript RAG dispatch.
- `src/rag/vectorRag.ts`: TypeScript fallback vector RAG.
- `src/rustCore/indexedSearch.ts`: Rust sidecar lifecycle and indexed search integration.
- `src/rustCore/indexProtocol.ts`: Rust sidecar wire encoders.
- `src/rustCore/protocol.ts`: Rust sidecar JSON response parser.
- `src/search/semanticVaultSearch.ts`: merges keyword and semantic vault search.
- `src/search/vaultSearch.ts`: keyword search.
- `src/search/webSearch.ts`: SearXNG/DuckDuckGo search and result formatting.
- `src/llm/llmClient.ts`: OpenAI-compatible chat/streaming client and context formatting.
- `src/editor/inlineDiff.ts`: existing editor inline diff extension.
- `src/history/changeHistory.ts`: AI change history and rollback.
- `src/voice/voiceClient.ts`: STT/TTS client helpers.
- `src/settings.ts`: settings tab.
- `src/types.ts`: shared settings, chat, source, diff, attachment types.
- `tools/contex_core/src/main.rs`: dependency-free Rust core, one-shot and sidecar protocols.

### New Files To Add

- `src/actions/actionTypes.ts`: canonical action plan, receipt, status, permission, and event types.
- `src/actions/actionExecutor.ts`: executes action plans against Obsidian APIs and emits typed receipts.
- `src/actions/actionTimeline.ts`: small event buffer for UI status and diagnostics.
- `src/actions/permissions.ts`: policy for safe/immediate/confirm-required actions.
- `src/diagnostics/contexDoctor.ts`: pure health-check builder.
- `src/diagnostics/DoctorModal.ts`: hidden detailed doctor UI.
- `src/providers/providerRouter.ts`: endpoint/model/provider config normalization and health checks.
- `src/router/toolRouterV2.ts`: semantic command orchestration around candidates and action planning.
- `src/router/toolRouterPrompt.ts`: compact, testable router prompt builder.
- `src/router/vaultCandidates.ts`: TypeScript adapter to collect real vault folder/file candidates.
- `src/attachments/attachmentPipeline.ts`: attachment reading, classification, text extraction, and vision preparation.
- `src/web/workflowPlanner.ts`: decides when web search/RAG is required.
- `src/diff/diffService.ts`: central diff preview/apply/undo service used by chat, voice, and editor.
- `src/voice/voiceSession.ts`: voice recording state machine, timer, waveform state, stop/send behavior.
- `src/testing/fakeVault.ts`: deterministic fake vault fixtures for tests.
- `src/testing/scenarioHarness.ts`: runs router/executor scenarios without Obsidian UI.
- `tests/contexDoctor.test.ts`
- `tests/providerRouter.test.ts`
- `tests/toolRouterV2.test.ts`
- `tests/actionExecutor.test.ts`
- `tests/permissions.test.ts`
- `tests/workflowPlanner.test.ts`
- `tests/attachmentPipeline.test.ts`
- `tests/diffService.test.ts`
- `tests/voiceSession.test.ts`
- `tests/scenarioHarness.test.ts`
- `tools/contex_core/src/fuzzy.rs`
- `tools/contex_core/src/resolver.rs`
- `tools/contex_core/src/diff.rs`
- `tools/contex_core/src/protocol.rs`

### Existing Files To Modify

- `src/types.ts`: add richer action/event/settings types or re-export from focused files.
- `src/main.ts`: register Doctor command and hidden diagnostics modal; shut down new Rust sessions.
- `src/views/AgentSidebarView.ts`: delegate to new modules, render action receipts, attach files, voice state, and hidden diagnostics.
- `src/views/semanticLocalCommandPlan.ts`: either wrap old parser or retire it behind Tool Router v2.
- `src/tools/localCommandRouter.ts`: shrink into compatibility adapter or replace with Tool Router v2.
- `src/rustCore/indexProtocol.ts`: add resolver and diff command encoders.
- `src/rustCore/indexedSearch.ts`: expose sidecar command method for resolver/diff/diagnostics.
- `tools/contex_core/src/main.rs`: split into modules and support new sidecar commands.
- `package.json`: add `test`, `test:router`, `test:doctor`, `core:bench`, `verify` scripts.
- `tools/contex_core/README.md`: document resolver, diff, diagnostics, packaging.

---

## Implementation Phases

### Phase 1: Stabilize The Ground

Deliverables:
- Doctor command.
- Hidden diagnostics modal.
- Scenario harness baseline.
- No UI regression.

Why first:
- Before adding more power, we need a reliable way to see what is broken.

### Phase 2: Typed Action Core

Deliverables:
- Canonical `ActionPlan`.
- Canonical `ActionReceipt`.
- Action executor.
- Permission policy.
- Timeline events.

Why second:
- This fixes the core complaint: the model must execute, not merely say it executed.

### Phase 3: Router v2 With Real Candidates

Deliverables:
- Vault candidates before LLM routing.
- Correction-aware semantic router.
- Multiple actions in one user command.
- Deterministic tests for corrected phrases.

Why third:
- This solves "open test in folder Test" and "open..., actually create..." without hard-coded STT dictionaries.

### Phase 4: Rust Resolver And Rust Diff

Deliverables:
- Fast fuzzy folder/file resolver in Rust.
- Rust diff service.
- Sidecar commands for candidate ranking.
- TypeScript fallback.

Why fourth:
- This gives speed and determinism without forcing users to install Rust for packaged plugin releases.

### Phase 5: Inline Diff Everywhere

Deliverables:
- Improve/expand selection, voice replace, update note, and research note edits all show editor-level diff.
- Apply/change/reject/undo are backed by the same diff service.

Why fifth:
- This makes editing feel like an IDE and reduces chat clutter.

### Phase 6: Web/RAG Workflows

Deliverables:
- Auto web when freshness is implied.
- Web + vault combined research context.
- Create/update note workflows use web/RAG without `/web` commands.

Why sixth:
- This removes the current "first search, then ask it to write" workflow.

### Phase 7: Voice UX And Attachments

Deliverables:
- Clean recording state machine.
- Waveform/timer fixed.
- Stop inserts transcript; send stops and submits.
- Attachments used in LLM context.

Why seventh:
- Voice and attachments are user-facing polish on top of the reliable action core.

### Phase 8: Release Hardening

Deliverables:
- Full verify script.
- Packaged Rust binary check.
- Migration/compatibility tests.
- Project status note updated.

Why last:
- The system should be easy to ship and hard to accidentally break.

---

## Task 1: Add A Repeatable Test Script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add baseline scripts**

Add these scripts without removing existing scripts:

```json
{
  "test": "node tests/createNoteContent.test.ts && node tests/localCommandRouter.test.ts && node tests/rustCoreIndexProtocol.test.ts && node tests/rustCoreProtocol.test.ts && node tests/rustCoreSearch.test.ts && node tests/rustCoreWireProtocol.test.ts && node tests/semanticLocalCommandPlan.test.ts && node tests/semanticVaultSearchMerge.test.ts && node tests/toolRouterScenarios.test.ts && node tests/vaultRag.test.ts && node tests/vectorRag.test.ts",
  "verify": "npm run test && npm run core:test && npm run build",
  "core:bench": "cargo test --release --manifest-path tools/contex_core/Cargo.toml"
}
```

- [ ] **Step 2: Run existing tests**

Run:

```powershell
npm run test
```

Expected:

```text
All listed Node tests pass.
```

- [ ] **Step 3: Run Rust tests**

Run:

```powershell
npm run core:test
```

Expected:

```text
test result: ok
```

- [ ] **Step 4: Run build**

Run:

```powershell
npm run build
```

Expected:

```text
main.js is rebuilt without TypeScript errors.
```

---

## Task 2: Contex Doctor Pure Diagnostics

**Files:**
- Create: `src/diagnostics/contexDoctor.ts`
- Create: `tests/contexDoctor.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/contexDoctor.test.ts`:

```ts
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
assert.ok(broken.checks.find((check) => check.id === "llm-endpoint")?.message.includes("Base URL"));
assert.ok(broken.checks.find((check) => check.id === "rust-core")?.message.includes("not found"));

console.log("contexDoctor tests passed");
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node tests/contexDoctor.test.ts
```

Expected:

```text
Cannot find module '../src/diagnostics/contexDoctor'
```

- [ ] **Step 3: Implement diagnostics model**

Create `src/diagnostics/contexDoctor.ts`:

```ts
import type { ContexSettings } from "../types";
import type { RustCoreRuntimeDiagnostics } from "../rustCore/indexedSearch";

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

export function buildContexDoctorReport(input: ContexDoctorInput): ContexDoctorReport {
  const checks: ContexDoctorCheck[] = [
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
      message: input.rust.lastError ?? "Rust core failed and TypeScript fallback is active.",
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
    message: `${input.settings.webSearchProvider} via ${input.settings.webSearchEndpoint || "direct"}`
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
```

- [ ] **Step 4: Run test**

Run:

```powershell
node tests/contexDoctor.test.ts
```

Expected:

```text
contexDoctor tests passed
```

---

## Task 3: Hidden Doctor Modal And Command

**Files:**
- Create: `src/diagnostics/DoctorModal.ts`
- Modify: `src/main.ts`
- Modify: `src/views/AgentSidebarView.ts`

- [ ] **Step 1: Create Doctor modal**

Create `src/diagnostics/DoctorModal.ts`:

```ts
import { Modal } from "obsidian";
import type { App } from "obsidian";
import type { ContexDoctorReport } from "./contexDoctor";

export class DoctorModal extends Modal {
  constructor(app: App, private readonly report: ContexDoctorReport) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("contex-doctor-modal");
    contentEl.createEl("h2", { text: "Contex Doctor" });
    contentEl.createEl("p", { text: `Overall: ${this.report.overall}` });

    const list = contentEl.createEl("div", { cls: "contex-doctor-checks" });
    this.report.checks.forEach((check) => {
      const row = list.createEl("div", {
        cls: `contex-doctor-check contex-doctor-${check.severity}`
      });
      row.createEl("strong", { text: check.label });
      row.createEl("span", { text: check.message });
      if (check.detail) {
        row.createEl("code", { text: check.detail });
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
```

- [ ] **Step 2: Add plugin method**

In `src/main.ts`, add imports:

```ts
import { buildContexDoctorReport } from "./diagnostics/contexDoctor";
import { DoctorModal } from "./diagnostics/DoctorModal";
import { getRustCoreRuntimeDiagnostics } from "./rustCore/indexedSearch";
```

Add a command in `onload()`:

```ts
this.addCommand({
  id: "doctor",
  name: "Contex: Doctor",
  callback: async () => {
    await this.openDoctor();
  }
});
```

Add a method on `ContexAgentPlugin`:

```ts
async openDoctor(): Promise<void> {
  const report = buildContexDoctorReport({
    settings: this.settings,
    activeNotePath: this.app.workspace.getActiveFile()?.path ?? null,
    rust: getRustCoreRuntimeDiagnostics(),
    services: {
      llm: this.settings.baseUrl.trim() ? "unknown" : "fail",
      stt: "unknown",
      tts: this.settings.ttsProvider === "disabled" ? "disabled" : "unknown",
      web: this.settings.webSearchEnabled ? "unknown" : "disabled"
    }
  });

  new DoctorModal(this.app, report).open();
}
```

- [ ] **Step 3: Wire diagnostics menu**

In `src/views/AgentSidebarView.ts`, update the existing diagnostics menu action so it calls:

```ts
void this.plugin.openDoctor();
```

- [ ] **Step 4: Build**

Run:

```powershell
npm run build
```

Expected:

```text
main.js rebuilt successfully.
```

---

## Task 4: Canonical Action Types

**Files:**
- Create: `src/actions/actionTypes.ts`
- Modify: `src/types.ts`
- Create: `tests/actionTypes.test.ts`

- [ ] **Step 1: Write type smoke test**

Create `tests/actionTypes.test.ts`:

```ts
import assert from "node:assert/strict";
import type { ContexActionPlan, ContexActionReceipt } from "../src/actions/actionTypes";

const plan: ContexActionPlan = {
  id: "plan-1",
  source: "voice",
  userText: "Open Test in folder Test",
  actions: [
    {
      id: "action-1",
      kind: "open_note",
      query: "Test/Test.md"
    }
  ]
};

const receipt: ContexActionReceipt = {
  actionId: "action-1",
  kind: "open_note",
  status: "opened",
  label: "Opened note",
  path: "Test/Test.md"
};

assert.equal(plan.actions[0].kind, receipt.kind);
assert.equal(receipt.status, "opened");

console.log("actionTypes tests passed");
```

- [ ] **Step 2: Implement action types**

Create `src/actions/actionTypes.ts`:

```ts
export type ContexActionSource = "chat" | "voice" | "button" | "selection" | "system";

export type ContexActionKind =
  | "open_note"
  | "create_note"
  | "replace_text"
  | "replace_selection"
  | "apply_diff"
  | "reject_diff"
  | "undo_change"
  | "search_vault"
  | "search_web"
  | "research_note"
  | "update_note"
  | "read_answer"
  | "attach_file"
  | "none";

export type ContexActionStatus =
  | "planned"
  | "running"
  | "preview"
  | "opened"
  | "saved"
  | "applied"
  | "rejected"
  | "reverted"
  | "done"
  | "failed"
  | "needs_confirmation";

export interface BaseContexAction {
  id: string;
  kind: ContexActionKind;
  reason?: string;
}

export interface OpenNoteAction extends BaseContexAction {
  kind: "open_note";
  query: string;
  folderHint?: string;
  candidatePath?: string;
}

export interface CreateNoteAction extends BaseContexAction {
  kind: "create_note" | "research_note";
  title?: string;
  folderHint?: string;
  path?: string;
  contentPrompt: string;
  requireWeb?: boolean;
}

export interface ReplaceTextAction extends BaseContexAction {
  kind: "replace_text";
  sourcePath?: string;
  replacements: Array<{
    original: string;
    suggested: string;
  }>;
}

export interface DiffAction extends BaseContexAction {
  kind: "apply_diff" | "reject_diff" | "undo_change";
  messageId?: string;
  historyOperationId?: string;
}

export interface SearchAction extends BaseContexAction {
  kind: "search_vault" | "search_web";
  query: string;
}

export interface ReadAnswerAction extends BaseContexAction {
  kind: "read_answer";
  target: "latest_assistant" | "latest_file" | "selected_text";
}

export type ContexAction =
  | OpenNoteAction
  | CreateNoteAction
  | ReplaceTextAction
  | DiffAction
  | SearchAction
  | ReadAnswerAction
  | BaseContexAction;

export interface ContexActionPlan {
  id: string;
  source: ContexActionSource;
  userText: string;
  actions: ContexAction[];
}

export interface ContexActionReceipt {
  actionId: string;
  kind: ContexActionKind;
  status: ContexActionStatus;
  label: string;
  detail?: string;
  path?: string;
  error?: string;
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/actionTypes.test.ts
```

Expected:

```text
actionTypes tests passed
```

---

## Task 5: Permission Policy

**Files:**
- Create: `src/actions/permissions.ts`
- Create: `tests/permissions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/permissions.test.ts`:

```ts
import assert from "node:assert/strict";
import { classifyActionPermission } from "../src/actions/permissions";
import type { ContexAction } from "../src/actions/actionTypes";

const openAction: ContexAction = {
  id: "a",
  kind: "open_note",
  query: "Test/Test.md"
};

const createAction: ContexAction = {
  id: "b",
  kind: "create_note",
  contentPrompt: "Create note",
  path: "Obsidian/Plan.md"
};

const deleteAction: ContexAction = {
  id: "c",
  kind: "none",
  reason: "delete file request"
};

assert.equal(classifyActionPermission(openAction).mode, "immediate");
assert.equal(classifyActionPermission(createAction).mode, "immediate");
assert.equal(classifyActionPermission(deleteAction).mode, "unsupported");

console.log("permissions tests passed");
```

- [ ] **Step 2: Implement permission policy**

Create `src/actions/permissions.ts`:

```ts
import type { ContexAction } from "./actionTypes";

export type ActionPermissionMode = "immediate" | "confirm" | "unsupported";

export interface ActionPermissionDecision {
  mode: ActionPermissionMode;
  reason: string;
}

const IMMEDIATE_ACTIONS = new Set([
  "open_note",
  "create_note",
  "replace_text",
  "replace_selection",
  "apply_diff",
  "reject_diff",
  "undo_change",
  "search_vault",
  "search_web",
  "research_note",
  "update_note",
  "read_answer",
  "attach_file"
]);

export function classifyActionPermission(action: ContexAction): ActionPermissionDecision {
  if (IMMEDIATE_ACTIONS.has(action.kind)) {
    return {
      mode: "immediate",
      reason: `${action.kind} is a non-destructive Contex action.`
    };
  }

  return {
    mode: "unsupported",
    reason: `${action.kind} is not supported by the current executor.`
  };
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/permissions.test.ts
```

Expected:

```text
permissions tests passed
```

---

## Task 6: Action Timeline Events

**Files:**
- Create: `src/actions/actionTimeline.ts`
- Create: `tests/actionTimeline.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/actionTimeline.test.ts`:

```ts
import assert from "node:assert/strict";
import { ActionTimeline } from "../src/actions/actionTimeline";

const timeline = new ActionTimeline(3);

timeline.push({ type: "thinking", label: "Thinking" });
timeline.push({ type: "running", label: "Opening file", path: "Test/Test.md" });
timeline.push({ type: "done", label: "Opened", path: "Test/Test.md" });
timeline.push({ type: "done", label: "Rendered receipt" });

assert.equal(timeline.latest()?.label, "Rendered receipt");
assert.equal(timeline.all().length, 3);
assert.equal(timeline.all()[0].label, "Opening file");

console.log("actionTimeline tests passed");
```

- [ ] **Step 2: Implement timeline**

Create `src/actions/actionTimeline.ts`:

```ts
export type ActionTimelineEventType =
  | "thinking"
  | "running"
  | "searching"
  | "opening"
  | "editing"
  | "speaking"
  | "done"
  | "failed";

export interface ActionTimelineEvent {
  type: ActionTimelineEventType;
  label: string;
  detail?: string;
  path?: string;
  createdAt?: number;
}

export class ActionTimeline {
  private events: Required<ActionTimelineEvent>[] = [];

  constructor(private readonly limit = 50) {}

  push(event: ActionTimelineEvent): void {
    this.events.push({
      detail: "",
      path: "",
      createdAt: Date.now(),
      ...event
    });

    if (this.events.length > this.limit) {
      this.events = this.events.slice(this.events.length - this.limit);
    }
  }

  latest(): Required<ActionTimelineEvent> | null {
    return this.events.at(-1) ?? null;
  }

  all(): Required<ActionTimelineEvent>[] {
    return [...this.events];
  }
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/actionTimeline.test.ts
```

Expected:

```text
actionTimeline tests passed
```

---

## Task 7: Provider Router

**Files:**
- Create: `src/providers/providerRouter.ts`
- Create: `tests/providerRouter.test.ts`
- Modify: `src/settings.ts`

- [ ] **Step 1: Write provider tests**

Create `tests/providerRouter.test.ts`:

```ts
import assert from "node:assert/strict";
import { normalizeProviderConfig, inferProviderKind } from "../src/providers/providerRouter";

assert.equal(inferProviderKind("http://127.0.0.1:11434/v1"), "ollama");
assert.equal(inferProviderKind("http://127.0.0.1:1234/v1"), "lm-studio");
assert.equal(inferProviderKind("https://api.openai.com/v1"), "openai-compatible");

const config = normalizeProviderConfig({
  baseUrl: "http://127.0.0.1:11434/v1/",
  model: "gemma3:4b",
  temperature: 0.3
});

assert.equal(config.baseUrl, "http://127.0.0.1:11434/v1");
assert.equal(config.kind, "ollama");

console.log("providerRouter tests passed");
```

- [ ] **Step 2: Implement provider router**

Create `src/providers/providerRouter.ts`:

```ts
export type ProviderKind =
  | "ollama"
  | "lm-studio"
  | "openai-compatible"
  | "unknown";

export interface ProviderConfigInput {
  baseUrl: string;
  model: string;
  temperature: number;
}

export interface NormalizedProviderConfig extends ProviderConfigInput {
  kind: ProviderKind;
}

export function normalizeProviderConfig(input: ProviderConfigInput): NormalizedProviderConfig {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, "");

  return {
    ...input,
    baseUrl,
    model: input.model.trim(),
    kind: inferProviderKind(baseUrl)
  };
}

export function inferProviderKind(baseUrl: string): ProviderKind {
  const normalized = baseUrl.toLowerCase();

  if (normalized.includes(":11434")) {
    return "ollama";
  }

  if (normalized.includes(":1234")) {
    return "lm-studio";
  }

  if (normalized.endsWith("/v1")) {
    return "openai-compatible";
  }

  return "unknown";
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/providerRouter.test.ts
```

Expected:

```text
providerRouter tests passed
```

- [ ] **Step 4: Use in settings UI**

In `src/settings.ts`, show a small provider hint near model/base URL:

```ts
const provider = normalizeProviderConfig({
  baseUrl: this.plugin.settings.baseUrl,
  model: this.plugin.settings.model,
  temperature: this.plugin.settings.temperature
});

containerEl.createEl("small", {
  text: `Provider: ${provider.kind}`
});
```

---

## Task 8: Vault Candidate Collection

**Files:**
- Create: `src/router/vaultCandidates.ts`
- Create: `tests/vaultCandidates.test.ts`

- [ ] **Step 1: Write test using pure input**

Create `tests/vaultCandidates.test.ts`:

```ts
import assert from "node:assert/strict";
import { rankVaultCandidatesFromPaths } from "../src/router/vaultCandidates";

const candidates = rankVaultCandidatesFromPaths(
  [
    "Test/Test.md",
    "lumiq/stat1.md",
    "Proton/LLM Engineering.md",
    "Obsidian/Contex Agent.md"
  ],
  "open test in folder test"
);

assert.equal(candidates[0].path, "Test/Test.md");
assert.equal(candidates[0].folder, "Test");

const proton = rankVaultCandidatesFromPaths(
  [
    "Test/Test.md",
    "Proton/LLM Engineering.md"
  ],
  "open LLM Engineering in folder Proton"
);

assert.equal(proton[0].path, "Proton/LLM Engineering.md");

console.log("vaultCandidates tests passed");
```

- [ ] **Step 2: Implement path candidates**

Create `src/router/vaultCandidates.ts`:

```ts
import type { App, TFile } from "obsidian";

export interface VaultCandidate {
  path: string;
  basename: string;
  folder: string;
  score: number;
}

export function collectVaultCandidates(app: App, query: string, limit = 30): VaultCandidate[] {
  return rankVaultCandidatesFromPaths(
    app.vault.getMarkdownFiles().map((file: TFile) => file.path),
    query
  ).slice(0, limit);
}

export function rankVaultCandidatesFromPaths(paths: string[], query: string): VaultCandidate[] {
  const normalizedQuery = normalize(query);
  const queryTokens = tokenize(normalizedQuery);

  return paths
    .map((path) => {
      const basename = path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
      const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      const normalizedPath = normalize(path);
      const normalizedName = normalize(basename);
      const normalizedFolder = normalize(folder);
      const score =
        scoreContains(normalizedQuery, normalizedPath, 30) +
        scoreContains(normalizedQuery, normalizedName, 60) +
        scoreContains(normalizedQuery, normalizedFolder, 40) +
        scoreTokenOverlap(queryTokens, tokenize(normalizedPath)) +
        scoreTokenOverlap(queryTokens, tokenize(normalizedName)) * 2 +
        scoreTokenOverlap(queryTokens, tokenize(normalizedFolder)) * 2;

      return {
        path,
        basename,
        folder,
        score
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
}

function scoreContains(query: string, target: string, weight: number): number {
  if (!target) {
    return 0;
  }

  if (query.includes(target)) {
    return weight;
  }

  if (target.includes(query)) {
    return Math.round(weight / 2);
  }

  return 0;
}

function scoreTokenOverlap(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length * 10;
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9а-яё]+/i)
    .filter(Boolean);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\\/g, "/").replace(/\.md$/g, "").trim();
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/vaultCandidates.test.ts
```

Expected:

```text
vaultCandidates tests passed
```

---

## Task 9: Tool Router v2 Prompt Contract

**Files:**
- Create: `src/router/toolRouterPrompt.ts`
- Create: `tests/toolRouterPrompt.test.ts`

- [ ] **Step 1: Write prompt contract test**

Create `tests/toolRouterPrompt.test.ts`:

```ts
import assert from "node:assert/strict";
import { buildToolRouterPrompt } from "../src/router/toolRouterPrompt";

const prompt = buildToolRouterPrompt({
  userText: "open test in folder Test, actually create a new note about it",
  activeNotePath: "Test/Test.md",
  candidates: [
    {
      path: "Test/Test.md",
      basename: "Test",
      folder: "Test",
      score: 100
    }
  ]
});

assert.ok(prompt.includes("Return JSON only"));
assert.ok(prompt.includes("Test/Test.md"));
assert.ok(prompt.includes("corrected"));
assert.ok(prompt.includes("create_note"));

console.log("toolRouterPrompt tests passed");
```

- [ ] **Step 2: Implement compact router prompt**

Create `src/router/toolRouterPrompt.ts`:

```ts
import type { VaultCandidate } from "./vaultCandidates";

export interface ToolRouterPromptInput {
  userText: string;
  activeNotePath: string | null;
  candidates: VaultCandidate[];
}

export function buildToolRouterPrompt(input: ToolRouterPromptInput): string {
  return [
    "You are Contex Tool Router.",
    "Return JSON only.",
    "Do not answer the user conversationally.",
    "Choose actions by meaning, including corrections like 'actually', 'no wait', 'instead', 'точнее', 'нет', 'лучше'.",
    "If the user corrects themselves, prefer the final corrected intent.",
    "Use provided vault candidates when opening or editing existing notes.",
    "Supported actions: open_file, create_note, research_note, replace_text, replace_selection, search_vault, research_web, update_note, read_last_answer, stop_speaking, none.",
    "For multiple user requests, return {\"actions\":[...]}.",
    "For create_note or research_note, include query with the full user request and folder/title hints if present.",
    `Active note: ${input.activeNotePath ?? "none"}`,
    "Vault candidates:",
    ...input.candidates.map((candidate, index) =>
      `${index + 1}. ${candidate.path} | folder=${candidate.folder} | title=${candidate.basename} | score=${candidate.score}`
    ),
    "User text:",
    input.userText
  ].join("\n");
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/toolRouterPrompt.test.ts
```

Expected:

```text
toolRouterPrompt tests passed
```

---

## Task 10: Tool Router v2 Parser And Planner

**Files:**
- Create: `src/router/toolRouterV2.ts`
- Create: `tests/toolRouterV2.test.ts`
- Modify: `src/views/semanticLocalCommandPlan.ts`

- [ ] **Step 1: Write tests**

Create `tests/toolRouterV2.test.ts`:

```ts
import assert from "node:assert/strict";
import { parseToolRouterResponse, routerCommandsToActionPlan } from "../src/router/toolRouterV2";

const parsed = parseToolRouterResponse(JSON.stringify({
  actions: [
    {
      action: "open_file",
      query: "Test/Test.md"
    },
    {
      action: "replace_text",
      replacements: [
        {
          original: "old",
          suggested: "new"
        }
      ]
    }
  ]
}));

assert.equal(parsed.length, 2);

const plan = routerCommandsToActionPlan({
  source: "voice",
  userText: "open and replace",
  commands: parsed
});

assert.equal(plan.actions[0].kind, "open_note");
assert.equal(plan.actions[1].kind, "replace_text");

const corrected = parseToolRouterResponse(JSON.stringify({
  action: "create_note",
  query: "create a note in Obsidian about Contex"
}));

assert.equal(corrected[0].action, "create_note");

console.log("toolRouterV2 tests passed");
```

- [ ] **Step 2: Implement parser/planner**

Create `src/router/toolRouterV2.ts`:

```ts
import type { ContexActionPlan, ContexActionSource } from "../actions/actionTypes";
import type { SemanticLocalCommand } from "../views/semanticLocalCommandPlan";
import { parseSemanticLocalCommandPlan } from "../views/semanticLocalCommandPlan";

export function parseToolRouterResponse(response: string): SemanticLocalCommand[] {
  return parseSemanticLocalCommandPlan(response) ?? [];
}

export function routerCommandsToActionPlan(input: {
  source: ContexActionSource;
  userText: string;
  commands: SemanticLocalCommand[];
}): ContexActionPlan {
  return {
    id: createId("plan"),
    source: input.source,
    userText: input.userText,
    actions: input.commands.map((command) => {
      const id = createId("action");

      if (command.action === "open_file") {
        return {
          id,
          kind: "open_note",
          query: command.query ?? input.userText
        };
      }

      if (command.action === "create_note" || command.action === "research_note") {
        return {
          id,
          kind: command.action === "research_note" ? "research_note" : "create_note",
          contentPrompt: command.query ?? input.userText,
          requireWeb: command.action === "research_note"
        };
      }

      if (command.action === "replace_text") {
        return {
          id,
          kind: "replace_text",
          replacements: command.replacements?.length
            ? command.replacements
            : command.original && command.suggested
              ? [{ original: command.original, suggested: command.suggested }]
              : []
        };
      }

      if (command.action === "research_web") {
        return {
          id,
          kind: "search_web",
          query: command.query ?? input.userText
        };
      }

      if (command.action === "search_vault" || command.action === "semantic_vault") {
        return {
          id,
          kind: "search_vault",
          query: command.query ?? input.userText
        };
      }

      if (command.action === "read_last_answer") {
        return {
          id,
          kind: "read_answer",
          target: "latest_assistant"
        };
      }

      return {
        id,
        kind: "none",
        reason: `Unsupported router command: ${command.action}`
      };
    })
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
```

- [ ] **Step 3: Run tests**

Run:

```powershell
node tests/toolRouterV2.test.ts
```

Expected:

```text
toolRouterV2 tests passed
```

---

## Task 11: Scenario Harness

**Files:**
- Create: `src/testing/fakeVault.ts`
- Create: `src/testing/scenarioHarness.ts`
- Create: `tests/scenarioHarness.test.ts`

- [ ] **Step 1: Write scenario tests**

Create `tests/scenarioHarness.test.ts`:

```ts
import assert from "node:assert/strict";
import { runContexScenario } from "../src/testing/scenarioHarness";

const openResult = await runContexScenario({
  userText: "Open test in folder Test",
  vaultPaths: ["Test/Test.md", "lumiq/stat1.md"],
  routerResponse: {
    action: "open_file",
    query: "Test/Test.md"
  }
});

assert.equal(openResult.receipts[0].status, "opened");
assert.equal(openResult.receipts[0].path, "Test/Test.md");

const corrected = await runContexScenario({
  userText: "Open Obsidian, actually create a plan for Contex Agent in folder Obsidian",
  vaultPaths: ["Obsidian/Existing.md"],
  routerResponse: {
    action: "create_note",
    query: "create a plan for Contex Agent in folder Obsidian"
  }
});

assert.equal(corrected.plan.actions[0].kind, "create_note");

console.log("scenarioHarness tests passed");
```

- [ ] **Step 2: Implement fake harness**

Create `src/testing/scenarioHarness.ts`:

```ts
import type { ContexActionPlan, ContexActionReceipt } from "../actions/actionTypes";
import { parseToolRouterResponse, routerCommandsToActionPlan } from "../router/toolRouterV2";

export interface ContexScenarioInput {
  userText: string;
  vaultPaths: string[];
  routerResponse: object;
}

export interface ContexScenarioResult {
  plan: ContexActionPlan;
  receipts: ContexActionReceipt[];
}

export async function runContexScenario(input: ContexScenarioInput): Promise<ContexScenarioResult> {
  const commands = parseToolRouterResponse(JSON.stringify(input.routerResponse));
  const plan = routerCommandsToActionPlan({
    source: "chat",
    userText: input.userText,
    commands
  });

  return {
    plan,
    receipts: plan.actions.map((action) => {
      if (action.kind === "open_note") {
        const path = "query" in action ? action.query : undefined;
        return {
          actionId: action.id,
          kind: action.kind,
          status: input.vaultPaths.includes(path ?? "") ? "opened" : "failed",
          label: input.vaultPaths.includes(path ?? "") ? "Opened note" : "Open failed",
          path
        };
      }

      if (action.kind === "create_note" || action.kind === "research_note") {
        return {
          actionId: action.id,
          kind: action.kind,
          status: "saved",
          label: "Created note",
          path: "Obsidian/Plan.md"
        };
      }

      return {
        actionId: action.id,
        kind: action.kind,
        status: "done",
        label: "Done"
      };
    })
  };
}
```

Create `src/testing/fakeVault.ts`:

```ts
export interface FakeVaultFile {
  path: string;
  content: string;
}

export function createFakeVault(paths: string[]): FakeVaultFile[] {
  return paths.map((path) => ({
    path,
    content: `# ${path.split("/").pop()?.replace(/\.md$/i, "") ?? path}`
  }));
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/scenarioHarness.test.ts
```

Expected:

```text
scenarioHarness tests passed
```

---

## Task 12: Action Executor Skeleton

**Files:**
- Create: `src/actions/actionExecutor.ts`
- Create: `tests/actionExecutor.test.ts`

- [ ] **Step 1: Write executor test with injected operations**

Create `tests/actionExecutor.test.ts`:

```ts
import assert from "node:assert/strict";
import { executeContexActionPlan } from "../src/actions/actionExecutor";
import type { ContexActionPlan } from "../src/actions/actionTypes";

const opened: string[] = [];
const created: string[] = [];

const plan: ContexActionPlan = {
  id: "p1",
  source: "chat",
  userText: "open and create",
  actions: [
    {
      id: "a1",
      kind: "open_note",
      query: "Test/Test.md"
    },
    {
      id: "a2",
      kind: "create_note",
      path: "Obsidian/Plan.md",
      contentPrompt: "Create plan"
    }
  ]
};

const receipts = await executeContexActionPlan(plan, {
  openNote: async (query) => {
    opened.push(query);
    return "Test/Test.md";
  },
  createNote: async (action) => {
    created.push(action.path ?? "");
    return action.path ?? "Untitled.md";
  }
});

assert.deepEqual(opened, ["Test/Test.md"]);
assert.deepEqual(created, ["Obsidian/Plan.md"]);
assert.equal(receipts[0].status, "opened");
assert.equal(receipts[1].status, "saved");

console.log("actionExecutor tests passed");
```

- [ ] **Step 2: Implement injected executor**

Create `src/actions/actionExecutor.ts`:

```ts
import type {
  ContexActionPlan,
  ContexActionReceipt,
  CreateNoteAction,
  OpenNoteAction
} from "./actionTypes";
import { classifyActionPermission } from "./permissions";

export interface ContexActionExecutorOps {
  openNote?: (query: string, action: OpenNoteAction) => Promise<string>;
  createNote?: (action: CreateNoteAction) => Promise<string>;
}

export async function executeContexActionPlan(
  plan: ContexActionPlan,
  ops: ContexActionExecutorOps
): Promise<ContexActionReceipt[]> {
  const receipts: ContexActionReceipt[] = [];

  for (const action of plan.actions) {
    const permission = classifyActionPermission(action);

    if (permission.mode !== "immediate") {
      receipts.push({
        actionId: action.id,
        kind: action.kind,
        status: permission.mode === "confirm" ? "needs_confirmation" : "failed",
        label: permission.reason
      });
      continue;
    }

    try {
      if (action.kind === "open_note") {
        const path = await ops.openNote?.(action.query, action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "opened",
          label: "Opened note",
          path
        });
        continue;
      }

      if (action.kind === "create_note" || action.kind === "research_note") {
        const path = await ops.createNote?.(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "saved",
          label: "Created note",
          path
        });
        continue;
      }

      receipts.push({
        actionId: action.id,
        kind: action.kind,
        status: "done",
        label: "Done"
      });
    } catch (error) {
      receipts.push({
        actionId: action.id,
        kind: action.kind,
        status: "failed",
        label: "Action failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return receipts;
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/actionExecutor.test.ts
```

Expected:

```text
actionExecutor tests passed
```

---

## Task 13: Integrate Executor Into Sidebar

**Files:**
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `src/actions/actionExecutor.ts`

- [ ] **Step 1: Add sidebar operations**

In `AgentSidebarView.ts`, make the existing execution methods callable by the executor:

```ts
private async executeActionPlan(plan: ContexActionPlan): Promise<void> {
  const receipts = await executeContexActionPlan(plan, {
    openNote: async (query) => {
      return this.openFileByVaultQuery(query);
    },
    createNote: async (action) => {
      return this.createNoteFromCommandText(action.contentPrompt, {
        forcePath: action.path,
        requireWeb: action.kind === "research_note" || action.requireWeb
      });
    }
  });

  receipts.forEach((receipt) => {
    this.appendActionReceipt({
      status: mapReceiptStatus(receipt.status),
      label: receipt.label,
      detail: receipt.detail ?? receipt.error,
      path: receipt.path
    });
  });
}
```

- [ ] **Step 2: Update existing command path**

Update `handleLocalCommandText` so semantic router output becomes `ContexActionPlan`, then goes through `executeActionPlan`.

Expected behavior:

```text
The old direct path remains as fallback only if Tool Router v2 returns no action.
```

- [ ] **Step 3: Build**

Run:

```powershell
npm run build
```

Expected:

```text
No TypeScript errors.
```

---

## Task 14: Rust Core Module Split

**Files:**
- Modify: `tools/contex_core/src/main.rs`
- Create: `tools/contex_core/src/protocol.rs`
- Create: `tools/contex_core/src/fuzzy.rs`
- Create: `tools/contex_core/src/resolver.rs`
- Create: `tools/contex_core/src/diff.rs`

- [ ] **Step 1: Move protocol helpers**

Create `tools/contex_core/src/protocol.rs`:

```rust
pub fn escape_json(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t")
}
```

- [ ] **Step 2: Add fuzzy module tests**

Create `tools/contex_core/src/fuzzy.rs`:

```rust
pub fn normalize(value: &str) -> String {
    value
        .to_lowercase()
        .replace('\\', "/")
        .replace(".md", "")
        .trim()
        .to_string()
}

pub fn token_overlap_score(query: &str, target: &str) -> i32 {
    let query_tokens: Vec<&str> = query.split(|c: char| !c.is_alphanumeric()).filter(|v| !v.is_empty()).collect();
    let target_tokens: Vec<&str> = target.split(|c: char| !c.is_alphanumeric()).filter(|v| !v.is_empty()).collect();

    query_tokens
        .iter()
        .filter(|token| target_tokens.contains(token))
        .count() as i32
        * 10
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlap_scores_matching_folder_and_file() {
        assert!(token_overlap_score("open test in folder test", "Test/Test.md") >= 20);
    }
}
```

- [ ] **Step 3: Add resolver module tests**

Create `tools/contex_core/src/resolver.rs`:

```rust
use crate::fuzzy::{normalize, token_overlap_score};

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedPath {
    pub path: String,
    pub score: i32,
}

pub fn resolve_paths(query: &str, paths: &[String], limit: usize) -> Vec<ResolvedPath> {
    let normalized_query = normalize(query);
    let mut scored: Vec<ResolvedPath> = paths
        .iter()
        .map(|path| {
            let normalized_path = normalize(path);
            let mut score = token_overlap_score(&normalized_query, &normalized_path);

            if normalized_query.contains(&normalized_path) {
                score += 100;
            }

            ResolvedPath {
                path: path.clone(),
                score
            }
        })
        .filter(|item| item.score > 0)
        .collect();

    scored.sort_by(|left, right| right.score.cmp(&left.score).then(left.path.cmp(&right.path)));
    scored.truncate(limit);
    scored
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_test_folder_before_unrelated_stat_file() {
        let paths = vec!["lumiq/stat1.md".to_string(), "Test/Test.md".to_string()];
        let results = resolve_paths("open test in folder test", &paths, 3);
        assert_eq!(results[0].path, "Test/Test.md");
    }
}
```

- [ ] **Step 4: Add diff module tests**

Create `tools/contex_core/src/diff.rs`:

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct DiffLine {
    pub kind: &'static str,
    pub text: String,
}

pub fn line_diff(original: &str, suggested: &str) -> Vec<DiffLine> {
    if original == suggested {
        return vec![DiffLine {
            kind: "same",
            text: original.to_string()
        }];
    }

    vec![
        DiffLine {
            kind: "remove",
            text: original.to_string()
        },
        DiffLine {
            kind: "add",
            text: suggested.to_string()
        }
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_simple_replace_diff() {
        let diff = line_diff("old", "new");
        assert_eq!(diff[0].kind, "remove");
        assert_eq!(diff[1].kind, "add");
    }
}
```

- [ ] **Step 5: Update main module declarations**

At the top of `tools/contex_core/src/main.rs`, add:

```rust
mod diff;
mod fuzzy;
mod protocol;
mod resolver;
```

Then replace local JSON escape helper with:

```rust
use protocol::escape_json;
```

- [ ] **Step 6: Run Rust tests**

Run:

```powershell
npm run core:test
```

Expected:

```text
All Rust tests pass.
```

---

## Task 15: Rust Resolver Sidecar Command

**Files:**
- Modify: `tools/contex_core/src/main.rs`
- Modify: `src/rustCore/indexProtocol.ts`
- Modify: `src/rustCore/indexedSearch.ts`
- Create: `tests/rustCoreResolverProtocol.test.ts`

- [ ] **Step 1: Define TypeScript encoder test**

Create `tests/rustCoreResolverProtocol.test.ts`:

```ts
import assert from "node:assert/strict";
import { encodeRustCoreResolveWireRequest } from "../src/rustCore/indexProtocol";

const request = encodeRustCoreResolveWireRequest("open test", ["Test/Test.md"], 5);

assert.ok(request.startsWith("CTXCORE_RESOLVE_V1\n"));
assert.ok(request.includes("open test"));
assert.ok(request.includes("Test/Test.md"));

console.log("rustCoreResolverProtocol tests passed");
```

- [ ] **Step 2: Add encoder**

In `src/rustCore/indexProtocol.ts`, add:

```ts
export function encodeRustCoreResolveWireRequest(
  query: string,
  paths: string[],
  limit: number
): string {
  return [
    "CTXCORE_RESOLVE_V1",
    String(limit),
    query,
    String(paths.length),
    ...paths
  ].join("\n") + "\n";
}
```

- [ ] **Step 3: Add Rust command**

In `tools/contex_core/src/main.rs`, add a sidecar branch:

```rust
"CTXCORE_RESOLVE_V1" => {
    let limit = read_usize_line(&mut lines)?;
    let query = read_line(&mut lines)?;
    let path_count = read_usize_line(&mut lines)?;
    let mut paths = Vec::new();
    for _ in 0..path_count {
        paths.push(read_line(&mut lines)?);
    }
    let results = resolver::resolve_paths(&query, &paths, limit);
    println!("{}", format_resolve_response(results));
}
```

Add formatter:

```rust
fn format_resolve_response(results: Vec<resolver::ResolvedPath>) -> String {
    let items = results
        .iter()
        .map(|item| format!("{{\"path\":\"{}\",\"score\":{}}}", escape_json(&item.path), item.score))
        .collect::<Vec<String>>()
        .join(",");
    format!("{{\"version\":1,\"results\":[{}]}}", items)
}
```

- [ ] **Step 4: Run protocol and Rust tests**

Run:

```powershell
node tests/rustCoreResolverProtocol.test.ts
npm run core:test
```

Expected:

```text
rustCoreResolverProtocol tests passed
test result: ok
```

---

## Task 16: TypeScript Resolver Adapter

**Files:**
- Create: `src/rustCore/resolverSearch.ts`
- Create: `tests/rustCoreResolverSearch.test.ts`
- Modify: `src/router/vaultCandidates.ts`

- [ ] **Step 1: Write adapter test around fallback**

Create `tests/rustCoreResolverSearch.test.ts`:

```ts
import assert from "node:assert/strict";
import { parseRustCoreResolveResponse } from "../src/rustCore/resolverSearch";

const parsed = parseRustCoreResolveResponse({
  version: 1,
  results: [
    {
      path: "Test/Test.md",
      score: 42
    }
  ]
});

assert.equal(parsed[0].path, "Test/Test.md");
assert.equal(parsed[0].score, 42);

console.log("rustCoreResolverSearch tests passed");
```

- [ ] **Step 2: Implement parser**

Create `src/rustCore/resolverSearch.ts`:

```ts
export interface RustResolvedPath {
  path: string;
  score: number;
}

export function parseRustCoreResolveResponse(value: unknown): RustResolvedPath[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const response = value as { results?: unknown };
  if (!Array.isArray(response.results)) {
    return [];
  }

  return response.results
    .map((item) => {
      const candidate = item as Partial<RustResolvedPath>;
      return typeof candidate.path === "string" && typeof candidate.score === "number"
        ? {
            path: candidate.path,
            score: candidate.score
          }
        : null;
    })
    .filter((item): item is RustResolvedPath => Boolean(item));
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/rustCoreResolverSearch.test.ts
```

Expected:

```text
rustCoreResolverSearch tests passed
```

---

## Task 17: Web/RAG Workflow Planner

**Files:**
- Create: `src/web/workflowPlanner.ts`
- Create: `tests/workflowPlanner.test.ts`

- [ ] **Step 1: Write workflow tests**

Create `tests/workflowPlanner.test.ts`:

```ts
import assert from "node:assert/strict";
import { planContextWorkflow } from "../src/web/workflowPlanner";

assert.equal(planContextWorkflow("Проверь актуальность текущей заметки на 6 мая 2026").requiresWeb, true);
assert.equal(planContextWorkflow("Create a modern page about local LLM features this year").requiresWeb, true);
assert.equal(planContextWorkflow("Summarize current note").requiresWeb, false);
assert.equal(planContextWorkflow("Update this note using current project context").requiresVault, true);

console.log("workflowPlanner tests passed");
```

- [ ] **Step 2: Implement planner**

Create `src/web/workflowPlanner.ts`:

```ts
export interface ContextWorkflowPlan {
  requiresWeb: boolean;
  requiresVault: boolean;
  reason: string;
}

const WEB_SIGNALS = [
  "latest",
  "current",
  "modern",
  "this year",
  "today",
  "2026",
  "актуаль",
  "современ",
  "сегодня",
  "в этом году",
  "на 6 мая 2026",
  "проверь свежесть"
];

const VAULT_SIGNALS = [
  "current note",
  "active note",
  "project context",
  "vault",
  "текущ",
  "заметк",
  "проект",
  "хранилищ"
];

export function planContextWorkflow(text: string): ContextWorkflowPlan {
  const normalized = text.toLowerCase();
  const requiresWeb = WEB_SIGNALS.some((signal) => normalized.includes(signal));
  const requiresVault = VAULT_SIGNALS.some((signal) => normalized.includes(signal)) || !requiresWeb;

  return {
    requiresWeb,
    requiresVault,
    reason: requiresWeb
      ? "The request depends on freshness or time-sensitive information."
      : "The request can be answered from local context."
  };
}
```

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/workflowPlanner.test.ts
```

Expected:

```text
workflowPlanner tests passed
```

---

## Task 18: Use Workflow Planner In Chat, Create, And Update

**Files:**
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `src/llm/llmClient.ts`

- [ ] **Step 1: Import planner**

In `src/views/AgentSidebarView.ts`:

```ts
import { planContextWorkflow } from "../web/workflowPlanner";
```

- [ ] **Step 2: Replace scattered web decision calls**

Where `buildAutoWebContextForRequest` or `shouldUseWebForResearchWorkflow` is called, compute:

```ts
const workflow = planContextWorkflow(userText);
```

Then:

```ts
if (workflow.requiresWeb) {
  const webContext = await this.buildAutoWebContextForRequest(userText);
  this.attachAutoWebContext(context, webContext);
}
```

- [ ] **Step 3: Make create/update workflows use planner**

For create note and update note:

```ts
const workflow = planContextWorkflow(commandText);
const proposal = workflow.requiresWeb
  ? await this.prepareResearchNoteProposal(commandText)
  : await this.prepareCreateNoteProposal(commandText);
```

- [ ] **Step 4: Build**

Run:

```powershell
npm run build
```

Expected:

```text
No TypeScript errors.
```

---

## Task 19: Attachment Pipeline

**Files:**
- Create: `src/attachments/attachmentPipeline.ts`
- Create: `tests/attachmentPipeline.test.ts`
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `src/llm/llmClient.ts`

- [ ] **Step 1: Write attachment tests**

Create `tests/attachmentPipeline.test.ts`:

```ts
import assert from "node:assert/strict";
import { classifyAttachment, extractPdfTextFallback } from "../src/attachments/attachmentPipeline";

assert.equal(classifyAttachment("image/png", "screen.png"), "image");
assert.equal(classifyAttachment("application/pdf", "paper.pdf"), "pdf");
assert.equal(classifyAttachment("text/markdown", "note.md"), "text");
assert.equal(classifyAttachment("", "unknown.bin"), "binary");

const pdfText = extractPdfTextFallback("(Hello) Tj (World) Tj");
assert.ok(pdfText.includes("Hello"));
assert.ok(pdfText.includes("World"));

console.log("attachmentPipeline tests passed");
```

- [ ] **Step 2: Implement attachment helpers**

Create `src/attachments/attachmentPipeline.ts`:

```ts
export type AttachmentKind = "image" | "pdf" | "text" | "binary";

export function classifyAttachment(mimeType: string, filename: string): AttachmentKind {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith("image/")) {
    return "image";
  }

  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    lowerMime.startsWith("text/") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".json")
  ) {
    return "text";
  }

  return "binary";
}

export function extractPdfTextFallback(rawPdfText: string): string {
  const matches = Array.from(rawPdfText.matchAll(/\(([^()]*)\)\s*Tj/g));
  return matches.map((match) => decodePdfLiteralString(match[1] ?? "")).join(" ").trim();
}

function decodePdfLiteralString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}
```

- [ ] **Step 3: Wire current sidebar helpers**

Move existing `isReadableTextFile`, `isPdfFile`, and `extractPdfTextFallback` logic from `AgentSidebarView.ts` into `attachmentPipeline.ts`.

- [ ] **Step 4: Run test and build**

Run:

```powershell
node tests/attachmentPipeline.test.ts
npm run build
```

Expected:

```text
attachmentPipeline tests passed
No TypeScript errors.
```

---

## Task 20: Voice Session State Machine

**Files:**
- Create: `src/voice/voiceSession.ts`
- Create: `tests/voiceSession.test.ts`
- Modify: `src/views/AgentSidebarView.ts`

- [ ] **Step 1: Write voice state tests**

Create `tests/voiceSession.test.ts`:

```ts
import assert from "node:assert/strict";
import { createVoiceSessionState, reduceVoiceSession } from "../src/voice/voiceSession";

let state = createVoiceSessionState();
state = reduceVoiceSession(state, { type: "start", now: 1000 });
assert.equal(state.status, "recording");
assert.equal(state.elapsedMs, 0);

state = reduceVoiceSession(state, { type: "tick", now: 2500 });
assert.equal(state.elapsedMs, 1500);

state = reduceVoiceSession(state, { type: "stop_insert", now: 3000 });
assert.equal(state.status, "transcribing");
assert.equal(state.stopMode, "insert");

state = reduceVoiceSession(createVoiceSessionState(), { type: "start", now: 1000 });
state = reduceVoiceSession(state, { type: "send", now: 2000 });
assert.equal(state.stopMode, "send");

console.log("voiceSession tests passed");
```

- [ ] **Step 2: Implement reducer**

Create `src/voice/voiceSession.ts`:

```ts
export type VoiceSessionStatus = "idle" | "recording" | "transcribing";
export type VoiceStopMode = "insert" | "send";

export interface VoiceSessionState {
  status: VoiceSessionStatus;
  startedAt: number;
  elapsedMs: number;
  stopMode: VoiceStopMode;
}

export type VoiceSessionEvent =
  | { type: "start"; now: number }
  | { type: "tick"; now: number }
  | { type: "stop_insert"; now: number }
  | { type: "send"; now: number }
  | { type: "finish" };

export function createVoiceSessionState(): VoiceSessionState {
  return {
    status: "idle",
    startedAt: 0,
    elapsedMs: 0,
    stopMode: "insert"
  };
}

export function reduceVoiceSession(
  state: VoiceSessionState,
  event: VoiceSessionEvent
): VoiceSessionState {
  if (event.type === "start") {
    return {
      status: "recording",
      startedAt: event.now,
      elapsedMs: 0,
      stopMode: "insert"
    };
  }

  if (event.type === "tick" && state.status === "recording") {
    return {
      ...state,
      elapsedMs: Math.max(0, event.now - state.startedAt)
    };
  }

  if (event.type === "stop_insert") {
    return {
      ...state,
      status: "transcribing",
      elapsedMs: Math.max(0, event.now - state.startedAt),
      stopMode: "insert"
    };
  }

  if (event.type === "send") {
    return {
      ...state,
      status: "transcribing",
      elapsedMs: Math.max(0, event.now - state.startedAt),
      stopMode: "send"
    };
  }

  if (event.type === "finish") {
    return createVoiceSessionState();
  }

  return state;
}
```

- [ ] **Step 3: Wire UI behavior**

In `AgentSidebarView.ts`:

- Mic button while idle: starts recording.
- Mic button while recording: stops and inserts transcript.
- Chat/send button while recording: stops recording and sends transcript after transcription.
- Waveform replaces model name row during recording.
- Timer replaces attachment icon during recording.

- [ ] **Step 4: Run tests and build**

Run:

```powershell
node tests/voiceSession.test.ts
npm run build
```

Expected:

```text
voiceSession tests passed
No TypeScript errors.
```

---

## Task 21: Central Diff Service

**Files:**
- Create: `src/diff/diffService.ts`
- Create: `tests/diffService.test.ts`
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `src/editor/inlineDiff.ts`

- [ ] **Step 1: Write diff service tests**

Create `tests/diffService.test.ts`:

```ts
import assert from "node:assert/strict";
import { buildTextReplacementDiffPreview } from "../src/diff/diffService";

const preview = buildTextReplacementDiffPreview({
  title: "Voice replacement preview",
  sourcePath: "Test/Test.md",
  original: "I am old",
  suggested: "I am new"
});

assert.equal(preview.status, "pending");
assert.equal(preview.original, "I am old");
assert.equal(preview.suggested, "I am new");

console.log("diffService tests passed");
```

- [ ] **Step 2: Implement service factory**

Create `src/diff/diffService.ts`:

```ts
import type { TextDiffPreview } from "../types";

export interface TextReplacementDiffInput {
  title: string;
  sourcePath: string;
  original: string;
  suggested: string;
  userPrompt?: string;
}

export function buildTextReplacementDiffPreview(
  input: TextReplacementDiffInput
): TextDiffPreview {
  return {
    title: input.title,
    sourcePath: input.sourcePath,
    operationType: "text-replacement",
    original: input.original,
    suggested: input.suggested,
    status: "pending",
    userPrompt: input.userPrompt
  };
}
```

- [ ] **Step 3: Route voice/improve/update through diff service**

Update:

- `previewVoiceTextReplacement`
- `previewVoiceMultiTextReplacement`
- `sendSelectedTextDiffAction`
- `updateCurrentNote`

All should build `TextDiffPreview` through `buildTextReplacementDiffPreview`.

- [ ] **Step 4: Render editor inline diff for all previews**

After creating a pending diff message, call:

```ts
await this.showInlineDiffForMessage(message.id);
```

Expected:

```text
Diff is visible in editor for selection improve, expand, voice replace, and update note.
```

---

## Task 22: Reliable Latest Answer TTS

**Files:**
- Modify: `src/views/AgentSidebarView.ts`
- Create: `tests/speechTarget.test.ts`

- [ ] **Step 1: Extract speech target selector**

Create a pure helper in `AgentSidebarView.ts` or a new file `src/voice/speechTarget.ts`:

```ts
export function findLatestAssistantSpeechMessage<T extends { role: string; content: string; createdAt: number }>(
  messages: T[]
): T | null {
  return [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.content.trim().length > 0) ?? null;
}
```

- [ ] **Step 2: Write test**

Create `tests/speechTarget.test.ts`:

```ts
import assert from "node:assert/strict";
import { findLatestAssistantSpeechMessage } from "../src/voice/speechTarget";

const target = findLatestAssistantSpeechMessage([
  { role: "assistant", content: "first", createdAt: 1 },
  { role: "user", content: "read", createdAt: 2 },
  { role: "assistant", content: "latest", createdAt: 3 }
]);

assert.equal(target?.content, "latest");

console.log("speechTarget tests passed");
```

- [ ] **Step 3: Update `speakLatestAssistantMessage`**

Use:

```ts
const target = findLatestAssistantSpeechMessage(this.messages);
```

If there is a recently created note receipt but no assistant text, read the latest created note summary only when the user explicitly asks to read the file.

- [ ] **Step 4: Run test and build**

Run:

```powershell
node tests/speechTarget.test.ts
npm run build
```

Expected:

```text
speechTarget tests passed
No TypeScript errors.
```

---

## Task 23: Chat UI Receipts And Status Feedback

**Files:**
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `styles.css`

- [ ] **Step 1: Add compact status renderer**

Add a sidebar method:

```ts
private renderTimelineStatus(parentEl: HTMLElement): void {
  const latest = this.actionTimeline.latest();

  if (!latest || latest.type === "done") {
    return;
  }

  const row = parentEl.createEl("div", { cls: "contex-status-chip" });
  row.createEl("span", { cls: "contex-thinking-dots", text: "..." });
  row.createEl("span", { text: latest.label });
}
```

- [ ] **Step 2: Remove duplicate busy indicator**

Keep the animated dots on send/chat button and assistant typing row. Remove the extra top bar/stripe indicator.

- [ ] **Step 3: Add CSS**

In `styles.css`:

```css
.contex-status-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px 0;
}

.contex-thinking-dots {
  display: inline-flex;
  letter-spacing: 2px;
  animation: contex-pulse-dots 1s infinite ease-in-out;
}

@keyframes contex-pulse-dots {
  0%, 100% { opacity: 0.35; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-1px); }
}
```

- [ ] **Step 4: Build**

Run:

```powershell
npm run build
```

Expected:

```text
No TypeScript errors.
```

---

## Task 24: Create Note Without Preview By Default

**Files:**
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `src/actions/permissions.ts`
- Create: `tests/createNotePolicy.test.ts`

- [ ] **Step 1: Write policy test**

Create `tests/createNotePolicy.test.ts`:

```ts
import assert from "node:assert/strict";
import { classifyActionPermission } from "../src/actions/permissions";

assert.equal(
  classifyActionPermission({
    id: "create",
    kind: "create_note",
    path: "Obsidian/Plan.md",
    contentPrompt: "Create plan"
  }).mode,
  "immediate"
);

console.log("createNotePolicy tests passed");
```

- [ ] **Step 2: Update create workflow**

Change command-created notes:

```ts
const proposal = await this.prepareCreateNoteProposal(commandText);
const path = await this.applyCreateNoteProposal(proposal, {
  openAfterCreate: true,
  skipPreview: true
});
```

Only show modal preview when:

- User clicked a UI action that explicitly asks for preview.
- Existing file would be overwritten.
- Action is destructive.

- [ ] **Step 3: Ensure file opens after create**

After saving:

```ts
const file = this.app.vault.getAbstractFileByPath(path);
if (file instanceof TFile) {
  await this.openVaultFile(file);
}
```

- [ ] **Step 4: Run build**

Run:

```powershell
npm run build
```

Expected:

```text
No TypeScript errors.
```

---

## Task 25: Note Title Deduplication Fix

**Files:**
- Modify: `src/views/AgentSidebarView.ts`
- Create: `tests/createNoteTitle.test.ts`

- [ ] **Step 1: Extract title/body cleaner**

Create pure helper:

```ts
export function removeDuplicateLeadingTitle(title: string, content: string): string {
  const lines = content.split(/\r?\n/);
  const normalizedTitle = title.trim().replace(/^#+\s*/, "").toLowerCase();
  const firstTextLineIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstTextLineIndex === -1) {
    return content;
  }

  const firstLine = lines[firstTextLineIndex].trim().replace(/^#+\s*/, "").toLowerCase();

  if (firstLine === normalizedTitle) {
    lines.splice(firstTextLineIndex, 1);
    return lines.join("\n").replace(/^\s+/, "");
  }

  return content;
}
```

- [ ] **Step 2: Write test**

Create `tests/createNoteTitle.test.ts`:

```ts
import assert from "node:assert/strict";
import { removeDuplicateLeadingTitle } from "../src/views/createNoteContent";

assert.equal(
  removeDuplicateLeadingTitle("Plan Contex", "# Plan Contex\n\nBody"),
  "Body"
);

assert.equal(
  removeDuplicateLeadingTitle("Plan Contex", "Body"),
  "Body"
);

console.log("createNoteTitle tests passed");
```

- [ ] **Step 3: Use helper before save**

Before writing content in create note workflow:

```ts
const cleanContent = removeDuplicateLeadingTitle(proposal.title, proposal.content);
```

- [ ] **Step 4: Run test and build**

Run:

```powershell
node tests/createNoteTitle.test.ts
npm run build
```

Expected:

```text
createNoteTitle tests passed
No TypeScript errors.
```

---

## Task 26: Project Status And Migration Notes

**Files:**
- Modify: `Contex_Project_Status.md`
- Modify: `tools/contex_core/README.md`
- Modify: `Contex_Agent_Next_Chat_Handoff.md`

- [ ] **Step 1: Update project status**

Add sections:

```markdown
## Operating Core Roadmap

- Doctor: planned
- Typed action receipts: planned
- Tool Router v2: planned
- Rust resolver: planned
- Inline diff everywhere: planned
- Web/RAG workflows: planned
- Voice state machine: planned
- Attachments v1: planned
```

- [ ] **Step 2: Update Rust README**

Add supported commands:

```markdown
## Planned Sidecar Commands

- `CTXCORE_RESOLVE_V1`: rank vault file paths for a user query.
- `CTXCORE_DIFF_V1`: build simple line-level diff for editor preview.
- `CTXCORE_STATUS_V1`: report sidecar health.
```

- [ ] **Step 3: Update handoff**

Add:

```markdown
## Next Implementation Plan

See `docs/superpowers/plans/2026-05-06-contex-operating-core.md`.
```

---

## Task 27: Full Verification Gate

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Include new tests in `npm run test`**

Add all new tests:

```json
{
  "test": "node tests/actionExecutor.test.ts && node tests/actionTimeline.test.ts && node tests/actionTypes.test.ts && node tests/attachmentPipeline.test.ts && node tests/contexDoctor.test.ts && node tests/createNoteContent.test.ts && node tests/createNotePolicy.test.ts && node tests/createNoteTitle.test.ts && node tests/localCommandRouter.test.ts && node tests/permissions.test.ts && node tests/providerRouter.test.ts && node tests/rustCoreIndexProtocol.test.ts && node tests/rustCoreProtocol.test.ts && node tests/rustCoreResolverProtocol.test.ts && node tests/rustCoreResolverSearch.test.ts && node tests/rustCoreSearch.test.ts && node tests/rustCoreWireProtocol.test.ts && node tests/scenarioHarness.test.ts && node tests/semanticLocalCommandPlan.test.ts && node tests/semanticVaultSearchMerge.test.ts && node tests/speechTarget.test.ts && node tests/toolRouterPrompt.test.ts && node tests/toolRouterScenarios.test.ts && node tests/toolRouterV2.test.ts && node tests/vaultCandidates.test.ts && node tests/vaultRag.test.ts && node tests/vectorRag.test.ts && node tests/voiceSession.test.ts && node tests/workflowPlanner.test.ts"
}
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm run verify
```

Expected:

```text
All Node tests pass.
All Rust tests pass.
TypeScript build passes.
```

- [ ] **Step 3: Install Rust binary**

Run:

```powershell
npm run core:build
npm run core:install
```

Expected:

```text
bin/contex-core.exe is updated.
```

---

## Manual QA Script

Run inside Obsidian after build and reload:

1. Open `Test/Test.md` manually.
2. Say or type: `Open test in folder Test`.
3. Expected: active editor opens `Test/Test.md`; chat shows compact receipt `Opened note Test/Test.md`.
4. Say or type: `Open LLM Engineering in folder Proton`.
5. Expected: active editor opens `Proton/LLM Engineering.md`; chat receipt includes folder and query.
6. Say or type: `Create in folder Obsidian a plan for Contex Agent`.
7. Expected: file is created under `Obsidian/`, opens immediately, no preview modal, no duplicated title.
8. Say or type: `Open Obsidian, actually create a new note about Contex voice flow in folder Obsidian`.
9. Expected: final corrected intent wins; creates a note, does not open random Obsidian note.
10. Select text in a note and click `Improve selection`.
11. Expected: editor inline diff appears with accept/change/reject.
12. Say or type: `Replace "I am old" with "I am new"`.
13. Expected: editor inline diff appears before apply; accept changes file; undo restores old text.
14. Say or type: `Create a modern page about local LLM features this year`.
15. Expected: web research runs automatically, note is created, web sources are included.
16. Press mic.
17. Expected: waveform appears in bottom row; timer counts seconds; mic stop inserts transcript; chat send stops recording and submits.
18. Attach an image via paperclip.
19. Expected: attachment pill appears; request includes image when `supportsVision` is true.
20. Open `... -> Diagnostics`.
21. Expected: Doctor modal shows LLM, Rust, RAG, STT, TTS, web, active note.

---

## Risk Register

- `AgentSidebarView.ts` is already very large. Each task should extract logic into new files instead of adding more helper functions to the view.
- Rust sidecar spawn can fail in restricted environments. TypeScript fallback must remain.
- Router v2 must not over-route normal questions. The old `isQuestionAboutLocalCommand` guard should stay until Router v2 has enough scenario coverage.
- Web search quality varies. Results need source display and fallback notes.
- PDF extraction fallback is intentionally basic. It should be treated as `best effort` until a stronger extractor is added.
- Inline diff in editor must not modify the file until user accepts.
- Voice send-after-recording must avoid double-submit by making stop mode explicit.

---

## Execution Order Summary

1. Task 1: repeatable test script.
2. Task 2-3: Doctor and hidden modal.
3. Task 4-6: action types, permission policy, timeline.
4. Task 7: provider router.
5. Task 8-11: vault candidates, router prompt, router v2, scenario harness.
6. Task 12-13: action executor and sidebar integration.
7. Task 14-16: Rust module split, resolver protocol, TypeScript adapter.
8. Task 17-18: web/RAG planner and workflow integration.
9. Task 19: attachments.
10. Task 20: voice state machine.
11. Task 21: central diff service.
12. Task 22: latest answer TTS fix.
13. Task 23: status UI polish.
14. Task 24-25: create note immediate flow and duplicated title fix.
15. Task 26-27: docs and verification gate.

---

## Definition Of Done

- `npm run verify` passes.
- `npm run core:build` passes.
- `npm run core:install` updates `bin/contex-core.exe`.
- Manual QA script passes at least steps 1-17.
- Doctor is hidden but accessible.
- No visible `Use current note` or `Use vault search` toggles return.
- Chat receipts are compact and reflect real execution only.
- The agent can handle corrected commands and multiple actions in one sentence.
- Rust resolver improves file/folder selection but TypeScript fallback remains usable.

---

## Execution Result - 2026-05-06

Completed in code:

- Tasks 1-27 were implemented as Operating Core v1.
- The test runner now includes `tests/rustCoreDiffProtocol.test.ts`.
- The Rust core supports indexed search, path resolution, and diff protocol commands.
- The sidebar is wired to the action timeline, vault candidates, Router v2 prompt, Rust path resolver, auto web/RAG planner, attachment pipeline, voice session state, central diff service, and latest-answer TTS targeting.
- Create-note and edit-note flows now prefer real execution with compact receipts instead of assistant-only claims.
- The Rust release sidecar was installed to `bin/contex-core.exe`.

Verification:

```text
npm run test       -> passed
npm run core:test  -> passed
npm run build      -> passed
npm run core:build -> passed
npm run core:install -> copied bin/contex-core.exe
npm run verify     -> passed
```

Manual QA still required inside Obsidian after plugin reload.
