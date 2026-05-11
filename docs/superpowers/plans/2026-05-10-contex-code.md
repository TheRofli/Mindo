# Contex Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Contex Code as a reliable Obsidian-native planning and coding coordination layer: a user can create a structured implementation plan from an Obsidian note, see a beautiful progress block at the top of the project note, generate task packets for an external coding agent or IDE, and sync completed work back into Obsidian without losing context.

**Architecture:** Add a new `src/contexCode/` domain module with pure tested services for plan data, Markdown block rendering/parsing, progress calculation, task packet generation, and vault storage. Integrate it through small commands in `src/main.ts` and a thin UI hook in `src/views/AgentSidebarView.ts`. Keep the first version local-first and file-based; design the data model so a VS Code bridge and automatic sync can be added later without rewriting the core.

**Tech Stack:** TypeScript, Obsidian Plugin API, existing `scripts/run-tests.mjs` auto-discovery, Markdown project notes, JSON sidecars in `.contex/plans/`, existing Wiki/RAG/source modules, optional Rust acceleration only after the TypeScript contract is stable.

---

## Product Shape

Contex Code should feel like a focused project cockpit inside Obsidian:

- A project note contains a compact Contex Code block directly under the title.
- The block shows progress, current phase, active task, status counts, and next actions.
- A command can generate a clean implementation plan from the current note.
- Another command can produce an AI task packet for the current unfinished task.
- Completed work can be marked from Obsidian now, and later from VS Code or another IDE.
- Wiki updates happen automatically from meaningful plan progress, not from manual “save to Wiki” commands.

The initial implementation should avoid building a full IDE extension too early. First we need a stable local data model, reliable Markdown rendering, reliable command behavior, and tests.

## Non-Negotiable Behavior

- File names must be clean and derived from the requested subject, not from instruction text like `создай в папке`.
- Project notes must not duplicate their title as both Obsidian title and first heading unless the content actually needs it.
- The Contex Code block must be idempotent: running sync repeatedly updates one block, not appending duplicates.
- Generated task packets must be compact enough for coding agents and include exact acceptance criteria.
- Sources must be real: vault links open notes, web links open URLs, raw/wiki sources point to actual files.
- All pure logic must be covered by tests before UI wiring.

---

## Data Model

Create `src/contexCode/planTypes.ts` with this public contract:

```ts
export type ContexCodePlanStatus =
  | "draft"
  | "active"
  | "blocked"
  | "review"
  | "done"
  | "archived";

export type ContexCodeTaskStatus =
  | "queued"
  | "ready"
  | "in_progress"
  | "blocked"
  | "review"
  | "done"
  | "skipped";

export type ContexCodeSourceType = "vault" | "web" | "wiki" | "raw" | "attachment" | "manual";

export interface ContexCodeSource {
  id: string;
  type: ContexCodeSourceType;
  title: string;
  path?: string;
  url?: string;
  confidence?: number;
  accessedAt?: string;
}

export interface ContexCodeTask {
  id: string;
  title: string;
  status: ContexCodeTaskStatus;
  summary: string;
  acceptance: string[];
  files?: string[];
  commands?: string[];
  sources?: string[];
  notes?: string;
  updatedAt: string;
}

export interface ContexCodePhase {
  id: string;
  title: string;
  status: ContexCodeTaskStatus;
  summary: string;
  tasks: ContexCodeTask[];
}

export interface ContexCodePlan {
  version: 1;
  id: string;
  title: string;
  status: ContexCodePlanStatus;
  projectNotePath: string;
  currentTaskId?: string;
  phases: ContexCodePhase[];
  sources: ContexCodeSource[];
  createdAt: string;
  updatedAt: string;
}
```

The type file must contain no Obsidian imports.

---

## Milestone 0.1: Core Plan Contract

### Task 0.1.1: Add Plan Types

Files:

- `src/contexCode/planTypes.ts`
- `src/contexCode/index.ts`
- `tests/contexCodePlanTypes.test.ts`

Steps:

- [ ] Add failing test `tests/contexCodePlanTypes.test.ts` that imports `ContexCodePlan`, constructs a valid plan, and asserts task/status fields can be read.
- [ ] Create `src/contexCode/planTypes.ts` with the public types above.
- [ ] Create `src/contexCode/index.ts` exporting all public Contex Code services as they appear.
- [ ] Run `npm run test`.
- [ ] Acceptance: TypeScript compiles and the test runner discovers the new test automatically.

### Task 0.1.2: Stable IDs and Slugs

Files:

- `src/contexCode/planIds.ts`
- `tests/contexCodePlanIds.test.ts`

Rules:

- Plan ID format: `ccp_<yyyyMMdd>_<slug>`.
- Task ID format: `task_<phaseIndex>_<taskIndex>_<slug>`.
- Slugs must strip command words from file names: `создай`, `сделай`, `файл`, `заметку`, `в папке`, `in folder`, `create`, `make`, `note`, `file`.
- Slugs must preserve meaningful Russian and English words.
- A request like `Создай файл с анекдотами в папке Test` should produce title `Анекдоты`, not `с анекдотами в папке Test`.
- A request like `Создай в текущей папке файл План теста` should produce title `План теста`.

Steps:

- [ ] Add tests for Russian titles, English titles, mixed folder phrases, duplicate spaces, punctuation, and Markdown-invalid characters.
- [ ] Implement `derivePlanTitle(input: string, fallback: string): string`.
- [ ] Implement `createPlanId(title: string, date: Date): string`.
- [ ] Implement `createTaskId(phaseIndex: number, taskIndex: number, title: string): string`.
- [ ] Export these helpers from `src/contexCode/index.ts`.
- [ ] Run `npm run test`.
- [ ] Acceptance: title extraction fixes the known “с анекдотами в папке тест” class of bugs.

---

## Milestone 0.2: Markdown Block Renderer

### Task 0.2.1: Render a Compact Project Block

Files:

- `src/contexCode/planBlock.ts`
- `tests/contexCodePlanBlock.test.ts`

Block format:

```md
<!-- contex-code:start id="ccp_20260510_voice_flow" -->
> [!info] Contex Code
> **Status:** active · **Progress:** 3/12 tasks · **Current:** Implement VAD auto-stop
>
> `█████░░░░░░░░░░░` 25%
>
> **Next:** Generate task packet for `task_1_2_vad_auto_stop`
<!-- contex-code:end -->
```

Rules:

- The block must be readable in Obsidian without custom CSS.
- It must not include raw JSON.
- It must not include fake `[Source 3]` citations.
- It must be replaceable by markers.

Steps:

- [ ] Add snapshot-style tests for a plan with zero tasks, partial progress, blocked tasks, and completed plan.
- [ ] Implement `renderContexCodeBlock(plan: ContexCodePlan): string`.
- [ ] Implement `findContexCodeBlock(markdown: string): { start: number; end: number; text: string } | null`.
- [ ] Implement `upsertContexCodeBlock(markdown: string, plan: ContexCodePlan): string`.
- [ ] Ensure `upsertContexCodeBlock` inserts after frontmatter and first H1 when present.
- [ ] Run `npm run test`.
- [ ] Acceptance: repeated upsert produces identical Markdown after the first update.

### Task 0.2.2: Prevent Duplicate Headings

Files:

- `src/contexCode/projectNote.ts`
- `tests/contexCodeProjectNote.test.ts`

Rules:

- If Obsidian note title is `Анекдоты`, content must not start with `# Анекдоты` unless the user explicitly requested a visible H1.
- Generated note content should begin with the Contex Code block, then the plan body.
- If the LLM returns JSON, fenced JSON, or `{ "title": ..., "content": ... }`, normalize to Markdown before writing.

Steps:

- [ ] Add tests for plain Markdown, fenced JSON, raw JSON object, duplicate H1, and missing title.
- [ ] Implement `normalizeGeneratedProjectMarkdown(input: string, noteTitle: string): string`.
- [ ] Implement `insertProjectBlock(markdown: string, plan: ContexCodePlan): string`.
- [ ] Run `npm run test`.
- [ ] Acceptance: known JSON-in-note regressions cannot reappear.

---

## Milestone 0.3: Progress and State Transitions

### Task 0.3.1: Calculate Progress

Files:

- `src/contexCode/progress.ts`
- `tests/contexCodeProgress.test.ts`

Rules:

- `done` and `skipped` count as completed.
- `blocked` counts as not completed but affects plan status.
- Empty plan returns 0%.
- Current task is first `in_progress`, then first `ready`, then first `queued`.

Steps:

- [ ] Add tests for empty plan, all queued, partial done, blocked, review, all done.
- [ ] Implement `calculatePlanProgress(plan: ContexCodePlan)`.
- [ ] Implement `getCurrentTask(plan: ContexCodePlan)`.
- [ ] Implement `transitionTask(plan, taskId, status, now)`.
- [ ] Run `npm run test`.
- [ ] Acceptance: progress data is deterministic and pure.

### Task 0.3.2: Plan Validation and Migration

Files:

- `src/contexCode/planSchema.ts`
- `tests/contexCodePlanSchema.test.ts`

Rules:

- Unknown task statuses normalize to `queued`.
- Missing `version` migrates to `1`.
- Missing `updatedAt` uses current time supplied by caller.
- Invalid plan title falls back to `Untitled Contex Code Plan`.

Steps:

- [ ] Add tests for incomplete sidecar JSON and malformed status values.
- [ ] Implement `normalizeContexCodePlan(input: unknown, now: string): ContexCodePlan`.
- [ ] Implement `serializeContexCodePlan(plan: ContexCodePlan): string`.
- [ ] Run `npm run test`.
- [ ] Acceptance: corrupt sidecar files degrade safely instead of breaking the plugin.

---

## Milestone 0.4: Vault Storage

### Task 0.4.1: JSON Sidecar Storage

Files:

- `src/contexCode/planStorage.ts`
- `tests/contexCodePlanStorage.test.ts`

Storage layout:

```text
.contex/
  plans/
    ccp_20260510_voice_flow.json
```

Rules:

- The Markdown note is user-facing.
- The JSON sidecar is machine-facing.
- Sidecar path is derived from plan ID.
- No hidden state should be stored only in memory.

Steps:

- [ ] Build a fake vault adapter test double with `read`, `write`, `exists`, `mkdir`.
- [ ] Implement `getPlanSidecarPath(planId: string): string`.
- [ ] Implement `saveContexCodePlan(vaultLike, plan)`.
- [ ] Implement `loadContexCodePlan(vaultLike, planId, now)`.
- [ ] Implement `listContexCodePlans(vaultLike, now)`.
- [ ] Run `npm run test`.
- [ ] Acceptance: plan data survives plugin reload.

### Task 0.4.2: Link Plan to Project Note

Files:

- `src/contexCode/projectNote.ts`
- `tests/contexCodeProjectNote.test.ts`

Rules:

- Markdown block marker stores the plan ID.
- If sidecar exists, sidecar is source of truth for task state.
- If sidecar is missing, parse enough from block to show a repair message later.

Steps:

- [ ] Add tests for extracting plan ID from block marker.
- [ ] Implement `getPlanIdFromProjectNote(markdown: string): string | null`.
- [ ] Implement `syncProjectNoteWithPlan(markdown: string, plan: ContexCodePlan): string`.
- [ ] Run `npm run test`.
- [ ] Acceptance: project note can reconnect to its sidecar.

---

## Milestone 0.5: Task Packet Generation

### Task 0.5.1: Generate AI Coding Task Packet

Files:

- `src/contexCode/taskPacket.ts`
- `tests/contexCodeTaskPacket.test.ts`

Packet format:

```md
# Task: Implement VAD auto-stop

## Context
Project: Contex Agent
Plan: Voice Dialogue v2
Current task: task_1_2_vad_auto_stop

## Goal
Implement automatic stop after a natural pause in live dialogue.

## Files
- src/voice/LiveDialogueController.ts
- src/voice/voiceActivity.ts

## Acceptance Criteria
- Speaking for 1 second does not stop recording.
- A natural pause longer than the configured threshold stops recording.
- Assistant speech does not trigger user speech detection.

## Verification
- npm run test
- npm run build
```

Rules:

- No vague instructions.
- Include only relevant sources and files.
- Keep packet under a configurable character budget.
- Add “Do not revert unrelated user changes” boilerplate.

Steps:

- [ ] Add tests for packet content, truncation, source formatting, and empty file list.
- [ ] Implement `buildTaskPacket(plan, taskId, options)`.
- [ ] Implement `copyTaskPacketToClipboard` only in UI wiring, not pure module.
- [ ] Run `npm run test`.
- [ ] Acceptance: packet is directly useful for Codex, Cursor, Continue, or another coding agent.

### Task 0.5.2: Task Packet Sources

Files:

- `src/contexCode/taskPacket.ts`
- `tests/contexCodeTaskPacket.test.ts`

Rules:

- Vault source renders as `[[path/to/note.md|Title]]`.
- Web source renders as `[Title](https://example.com)`.
- Raw/wiki source renders as `[[Contex Wiki/...|Title]]`.
- Do not render `Source 1` without a clickable target.

Steps:

- [ ] Add tests for each source type.
- [ ] Implement `formatContexCodeSource(source)`.
- [ ] Run `npm run test`.
- [ ] Acceptance: no fake citations appear in generated task packets.

---

## Milestone 0.6: Commands

### Task 0.6.1: Command Handlers

Files:

- `src/contexCode/planCommands.ts`
- `tests/contexCodeCommands.test.ts`

Commands:

- `createContexCodePlanFromActiveNote`
- `prepareCurrentContexCodeTaskPacket`
- `markCurrentContexCodeTaskDone`
- `syncCurrentContexCodePlan`

Rules:

- Commands return structured results, not UI strings.
- UI decides how to display success/failure.
- Command handlers must never write JSON into the Markdown note body.

Steps:

- [ ] Add fake app/workspace/vault tests for active note present, no active note, existing plan, and malformed plan.
- [ ] Implement command handlers using `planStorage`, `projectNote`, and `taskPacket`.
- [ ] Add `ContexCodeCommandResult` with `kind`, `message`, `path`, and optional `planId`.
- [ ] Run `npm run test`.
- [ ] Acceptance: commands can be called from plugin UI and from tests without Obsidian runtime.

### Task 0.6.2: Register Commands in Plugin

Files:

- `src/main.ts`
- `src/i18n.ts`
- `tests/pluginCommandRegistration.test.ts` if command registration has existing test helpers; otherwise skip this test and verify with build.

Command IDs:

- `contex-create-code-plan`
- `contex-prepare-ai-task-packet`
- `contex-mark-code-task-done`
- `contex-sync-code-plan`

Steps:

- [ ] Inspect existing command registration style in `src/main.ts`.
- [ ] Add labels in English and Russian through existing i18n patterns.
- [ ] Register commands with small wrappers that call `planCommands`.
- [ ] Ensure failures produce a clear notice and chat action chip if sidebar is open.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Acceptance: commands appear in Obsidian Command Palette.

---

## Milestone 0.7: Sidebar Integration

### Task 0.7.1: More Actions Entries

Files:

- `src/views/AgentSidebarView.ts`
- `src/views/controllers/ChatController.ts` if More Actions were already extracted
- `src/i18n.ts`

Menu entries:

- `Create code plan`
- `Prepare task packet`
- `Sync code plan`
- `Mark task done`

Rules:

- Do not clutter the main input row.
- Keep entries under the existing three-dot menu.
- Add concise action chips in chat after actions:
  - `Created plan Obsidian/Project.md`
  - `Copied task packet task_1_2_vad_auto_stop`
  - `Synced plan 4/12`

Steps:

- [ ] Locate current More Actions implementation.
- [ ] Wire menu entries to command handlers.
- [ ] Reuse existing small action card/chip rendering.
- [ ] Run `npm run build`.
- [ ] Acceptance: user can operate Contex Code without opening settings.

### Task 0.7.2: Prompt Improvement Hook

Files:

- `src/prompt/*`
- `src/contexCode/taskPacket.ts`
- `src/views/AgentSidebarView.ts`

Rules:

- If the input describes coding work, More Actions > Improve prompt should be able to convert it into a stronger plan seed.
- It should not create files automatically.

Steps:

- [ ] Add a tiny prompt template: “turn this into a Contex Code plan seed”.
- [ ] Keep it separate from note creation.
- [ ] Run `npm run test`.
- [ ] Acceptance: this improves workflow without adding another visible main button.

---

## Milestone 0.8: Wiki Integration

### Task 0.8.1: Automatic Wiki Events

Files:

- `src/wiki/*`
- `src/contexCode/planCommands.ts`
- `tests/contexCodeWikiEvents.test.ts`

Events:

- `contex_code_plan_created`
- `contex_code_task_started`
- `contex_code_task_done`
- `contex_code_plan_completed`

Rules:

- Auto-save must be on by default for meaningful events.
- Wiki updates should be small and structured.
- No manual “remember note” command is required.

Steps:

- [ ] Inspect existing Wiki auto-save settings and event APIs.
- [ ] Add a thin adapter `src/contexCode/wikiEvents.ts`.
- [ ] Tests should use a fake wiki writer.
- [ ] Run `npm run test`.
- [ ] Acceptance: creating and completing plan tasks can update Wiki automatically.

### Task 0.8.2: Prompt Library in Wiki

Files:

- `src/wiki/*`
- `src/contexCode/promptLibrary.ts`
- `tests/contexCodePromptLibrary.test.ts`

Initial prompt categories:

- `planning`
- `coding`
- `review`
- `debugging`
- `refactor`
- `docs`
- `release`

Rules:

- Initial Build should seed prompt nodes.
- Imported Copilot prompts can become Wiki prompt nodes later, but first version should ship with built-in core prompts.
- Prompts should be discoverable by RAG and reusable by the router.

Steps:

- [ ] Implement `getBuiltInContexCodePrompts()`.
- [ ] Add tests for stable IDs and categories.
- [ ] Add Wiki seed hook used by Initial Build.
- [ ] Run `npm run test`.
- [ ] Acceptance: Wiki has a reusable prompt base without depending on old Copilot files.

---

## Milestone 0.9: IDE Bridge Preparation

This milestone prepares contracts only. Do not build a full VS Code extension yet.

### Task 0.9.1: Bridge Types

Files:

- `src/contexCode/bridgeTypes.ts`
- `tests/contexCodeBridgeTypes.test.ts`

Events:

- `task_packet_requested`
- `task_started`
- `task_progress`
- `task_done`
- `task_failed`
- `files_changed`

Steps:

- [ ] Add bridge type definitions.
- [ ] Add validation helpers for inbound bridge events.
- [ ] Run `npm run test`.
- [ ] Acceptance: future IDE extension has a stable local protocol.

### Task 0.9.2: Manual Sync Import

Files:

- `src/contexCode/bridgeImport.ts`
- `tests/contexCodeBridgeImport.test.ts`

Rules:

- User can paste an AI completion report.
- Parser extracts completed task IDs, changed files, verification commands, and notes.
- Unknown task IDs do not mutate the plan.

Steps:

- [ ] Add tests for Codex-like final summaries and plain bullet reports.
- [ ] Implement `parseTaskCompletionReport(markdown: string)`.
- [ ] Implement `applyTaskCompletionReport(plan, report, now)`.
- [ ] Run `npm run test`.
- [ ] Acceptance: even before VS Code integration, progress can be synced from pasted reports.

---

## Milestone 1.0: Release Readiness

### Task 1.0.1: Documentation

Files:

- `README.md`
- `docs/CONTEXT_CODE.md`
- `docs/RELEASE.md`

Docs must include:

- What Contex Code is.
- How to create a plan.
- How to generate a task packet.
- How to sync progress.
- What data is stored in `.contex/plans/`.
- Privacy notes: all plan data stays in the vault unless user sends it to an external model.

Steps:

- [ ] Add `docs/CONTEXT_CODE.md`.
- [ ] Update README feature list.
- [ ] Update release checklist.
- [ ] Run `npm run release:check`.
- [ ] Acceptance: a new user can understand the feature without reading code.

### Task 1.0.2: Verification Pack

Files:

- `tests/contexCode*.test.ts`
- `scripts/run-tests.mjs` if needed

Manual test scenarios:

- Create code plan in current folder.
- Create code plan in explicitly named folder.
- Create code plan from a Russian prompt.
- Create code plan from an English prompt.
- Re-run sync three times and confirm no duplicate block.
- Generate task packet and paste it into a coding agent.
- Mark task done and confirm progress updates.
- Reload Obsidian and confirm sidecar reconnects.
- Confirm Wiki receives automatic update.

Steps:

- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Run `npm run release:check`.
- [ ] Acceptance: all commands pass before calling feature complete.

---

## Future Milestones After 1.0

These are intentionally not part of the first implementation pass.

### 1.1: VS Code Companion

- Small VS Code extension.
- Shows current Contex Code plan.
- One-click “send task packet to active AI tool”.
- Reads changed files and suggests progress sync.

### 1.2: Local Bridge Server

- Local localhost bridge with explicit user opt-in.
- No auth for local MVP, but bind only to `127.0.0.1`.
- Later add token if needed.

### 1.3: Git Integration

- Detect branch name.
- Link tasks to commits.
- Generate PR notes from completed task evidence.

### 1.4: Rust Acceleration

Only after behavior is stable:

- Move hot Markdown block scanning to Rust if profiling shows it matters.
- Move fuzzy plan/task lookup to Rust if large vaults make it slow.
- Keep all Obsidian UI and command orchestration in TypeScript.

---

## Implementation Order

Recommended order:

1. `planTypes`
2. `planIds`
3. `planBlock`
4. `projectNote`
5. `progress`
6. `planSchema`
7. `planStorage`
8. `taskPacket`
9. `planCommands`
10. `main.ts` command registration
11. Sidebar More Actions
12. Wiki events
13. Docs
14. Verification

Do not start UI before pure tests pass. The feature should be boringly reliable before it becomes visually rich.

---

## Definition of Done

Contex Code v1 is done when:

- `npm run test` passes.
- `npm run build` passes.
- `npm run verify` passes.
- `npm run release:check` passes.
- A user can create a plan from the active note.
- A user can generate a task packet.
- A user can mark progress.
- The project note shows one clean Contex Code block.
- The sidecar persists across reloads.
- Wiki receives automatic structured memory updates.
- No generated note contains raw JSON unless the user explicitly asked for JSON.
