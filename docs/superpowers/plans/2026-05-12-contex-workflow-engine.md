# Contex Workflow Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Contex “Superpowers” workflow engine that automatically turns complex user requests into step-by-step workflows connected to Wiki, RAG, web research, vault actions, attachments, voice, and Contex Code.

**Architecture:** Add a focused `src/workflows/` layer between chat/router and tools. It will classify user intent, select a workflow skill, build context, run steps, execute tools through the existing action executor, verify outcomes, and write meaningful memory into Contex Wiki. Existing modules stay useful; this plan connects them into one reliable operating system.

**Tech Stack:** TypeScript, Obsidian API, existing Contex modules (`router`, `actions`, `rag`, `wiki`, `contexCode`, `voice`, `attachments`, `sources`), fake LLM/STT/web test harness, Rust search acceleration where already available.

---

## Product Definition

Contex Superpowers is not a separate button. It is the default orchestration layer for meaningful work.

When a user writes or says:

- “создай заметку про идею”
- “сделай план”
- “проверь актуальность”
- “улучши выделенный текст”
- “открой файл и поменяй текст”
- “нет, лучше создай новую заметку и сделай web research”
- “помоги придумать архитектуру”

Contex should not just answer in chat. It should choose the correct workflow, gather context, ask questions only when useful, execute real vault actions, verify the result, show compact receipts, and update Wiki memory automatically.

---

## Key Rules

1. **No fake completion.** If Contex says it opened, created, edited, or saved something, the action must actually happen.
2. **Ask only when needed.** Simple note creation should not ask questions. Project planning should ask questions one by one.
3. **Use all context.** Active note, selected text, attachments, vault candidates, RAG, Wiki memory, web research, and chat state should be available to workflows.
4. **Do not spam the UI.** Receipts and sources are collapsed by default.
5. **Wiki updates automatically.** User should not need to say “save this to Wiki.”
6. **User-facing language follows Obsidian UI language.** Internal IDE plans can remain English.
7. **Dangerous actions need confirmation.** Delete/move/destructive operations require explicit confirmation.
8. **Safe edits use diff.** Edits should prefer inline diff / preview / undo.

---

## File Structure

### Create

- `src/workflows/workflowTypes.ts`  
  Shared types for workflow intent, workflow state, workflow step, context bundle, receipts, and memory events.

- `src/workflows/workflowRegistry.ts`  
  Registry of built-in workflows and their selection metadata.

- `src/workflows/workflowRouter.ts`  
  Selects the best workflow from user input, current UI state, candidates, and model output.

- `src/workflows/contextBuilder.ts`  
  Builds the context bundle from active note, selection, attachments, RAG, Wiki, web policy, and vault candidates.

- `src/workflows/workflowRuntime.ts`  
  Runs workflows step-by-step, stores pending workflow state, handles answers to workflow questions, resumes interrupted flows.

- `src/workflows/workflowSkills.ts`  
  Built-in workflow implementations: note creation, project planning, research update, safe edit, vault action, debugging/review, Wiki update.

- `src/workflows/workflowReceipts.ts`  
  Converts workflow actions into compact chat receipts.

- `src/workflows/workflowVerification.ts`  
  Verifies that created/opened/edited files really changed.

- `src/workflows/workflowMemory.ts`  
  Converts workflow outcomes into Wiki raw events and structured proposals.

- `src/workflows/workflowPrompts.ts`  
  System prompts for workflow classification, question generation, file naming, and plan generation.

- `src/workflows/workflowTests.test.ts`  
  Main tests for router/runtime/context builder.

- `src/workflows/workflowGoldenCorpus.test.ts`  
  Golden corpus for Russian/English/STT-noisy commands.

### Modify

- `src/views/AgentSidebarView.ts`  
  Route chat submission through `WorkflowRuntime` before falling back to ordinary chat.

- `src/views/controllers/ChatController.ts`  
  Show pending workflow states and compact receipts.

- `src/views/controllers/VoiceController.ts`  
  Send voice final transcripts through workflow runtime.

- `src/views/controllers/LiveDialogueController.ts`  
  Use workflow runtime for live action requests and keep voice replies short.

- `src/router/toolRouterV2.ts`  
  Keep as lower-level action parser; workflow router calls it for direct actions.

- `src/actions/actionExecutor.ts`  
  Ensure all workflow actions go through one execution/verification path.

- `src/wiki/wikiAutopilot.ts`  
  Accept workflow memory events and write useful Wiki updates automatically.

- `src/contexCode/commandController.ts`  
  Use workflow question flow for Contex Code planning.

- `src/views/createNotePathUtils.ts`  
  Reuse file naming helpers from workflow prompts and naming tests.

- `src/settings.ts` and `src/settings/settingSections.ts`  
  Add workflow toggles only where needed: debug logs, auto Wiki memory, web auto-research policy.

---

## Milestone 0.1 — Workflow Types And Registry

**Goal:** Establish the contract for everything else.

**Files:**

- Create: `src/workflows/workflowTypes.ts`
- Create: `src/workflows/workflowRegistry.ts`
- Create: `src/workflows/workflowTests.test.ts`
- Modify: `src/views/sidebarTypes.ts`

### Tasks

- [ ] Define `WorkflowIntent` with values:
  - `chat`
  - `vault_action`
  - `note_creation`
  - `safe_edit`
  - `research_update`
  - `project_brainstorm`
  - `code_plan`
  - `debugging`
  - `review`
  - `wiki_memory`
  - `live_dialogue`

- [ ] Define `WorkflowContextBundle`:
  - user input;
  - UI language;
  - active note;
  - selected text;
  - attachments;
  - vault candidates;
  - RAG snippets;
  - Wiki snippets;
  - web snippets;
  - recent chat state.

- [ ] Define `WorkflowState`:
  - workflow id;
  - intent;
  - current step;
  - pending question;
  - collected answers;
  - action receipts;
  - memory events;
  - status: `idle | asking | executing | verifying | complete | failed | cancelled`.

- [ ] Define `WorkflowReceipt`:
  - `Opened`
  - `Created`
  - `Edited`
  - `Saved`
  - `Undone`
  - `Searched`
  - `Indexed`
  - `Failed`

- [ ] Register built-in workflows with `id`, `name`, `whenToUse`, `riskLevel`, `requiresConfirmation`.

### Tests

- [ ] Test registry returns all built-in workflows.
- [ ] Test each workflow has stable id and user-facing name.
- [ ] Test dangerous workflow metadata requires confirmation.

### Done Criteria

- Workflows exist as typed contracts.
- No UI behavior changes yet.
- `npm run verify` passes.

---

## Milestone 0.2 — Context Builder

**Goal:** Give workflows the full current situation before any decision.

**Files:**

- Create: `src/workflows/contextBuilder.ts`
- Modify: `src/context/currentNoteContext.ts`
- Modify: `src/context/selectedTextContext.ts`
- Modify: `src/attachments/attachmentContext.ts`
- Modify: `src/rag/wikiFirstRag.ts`
- Modify: `src/router/vaultCandidates.ts`

### Tasks

- [ ] Build active note context with path, folder, title, excerpt, word count, selected text if available.
- [ ] Build vault candidates using real files, not model memory.
- [ ] Include folder candidates separately from note candidates.
- [ ] Include attachments metadata and extracted text.
- [ ] Include Wiki snippets if enabled.
- [ ] Include RAG snippets only when useful.
- [ ] Add web need signal, but do not search yet.

### Critical Behavior

For the prompt:

```text
Открой тест в папке Test.
```

The context bundle must include:

```text
folderCandidates: ["Test"]
noteCandidates: ["Test/Test.md"]
```

For the prompt:

```text
Создай в текущей папке план.
```

The context bundle must include current active folder.

### Tests

- [ ] Active note in `Test/Test.md` gives current folder `Test`.
- [ ] Duplicate note names in different folders are both visible.
- [ ] Selection context is present when Obsidian selection exists.
- [ ] Attachments are included as compact summaries.

### Done Criteria

- Every workflow receives one normalized context object.
- File/folder ambiguity is represented explicitly.
- `npm run verify` passes.

---

## Milestone 0.3 — Skill Router

**Goal:** Decide which workflow to run from meaning, not simple keyword priority.

**Files:**

- Create: `src/workflows/workflowRouter.ts`
- Create: `src/workflows/workflowPrompts.ts`
- Modify: `src/router/toolRouterV2.ts`
- Test: `src/workflows/workflowGoldenCorpus.test.ts`

### Tasks

- [ ] Add rule-first fast path for obvious safe commands:
  - open file;
  - create note;
  - replace selected text;
  - accept/reject/undo;
  - read answer.

- [ ] Add semantic model route for complex commands:
  - corrections: “нет, лучше…”
  - multiple actions;
  - project planning;
  - research/update tasks.

- [ ] Router output must be structured JSON:

```json
{
  "workflow": "note_creation",
  "confidence": 0.91,
  "actions": [
    {
      "type": "create_note",
      "folder": "Obsidian",
      "titleGoal": "plan for Contex Agent",
      "needsWeb": false
    }
  ],
  "askUser": null
}
```

- [ ] Add correction handling:

```text
Открой в папке Obsidian, точнее нет, создай в папке Obsidian план для агента Contex.
```

Must resolve as `note_creation`, not `open_file`.

- [ ] Add command chaining:

```text
Открой тест в папке Test и поменяй Я гений на Я человек.
```

Must resolve as:

1. open `Test/Test.md`;
2. propose replace diff.

### Tests

- [ ] Golden corpus with Russian commands.
- [ ] Golden corpus with English commands.
- [ ] Golden corpus with STT-noisy commands.
- [ ] Test correction phrases override earlier intent.
- [ ] Test folder names are not ignored.

### Done Criteria

- Complex intent is routed to workflows.
- Lower-level `toolRouterV2` remains useful for direct actions.
- `npm run verify` passes.

---

## Milestone 0.4 — Workflow Runtime

**Goal:** Run workflows step-by-step, including questions, answers, actions, cancellation, and resume.

**Files:**

- Create: `src/workflows/workflowRuntime.ts`
- Modify: `src/views/controllers/ChatController.ts`
- Modify: `src/views/AgentSidebarView.ts`

### Tasks

- [ ] Add pending workflow state to sidebar state.
- [ ] Support one-question-at-a-time interaction.
- [ ] Support quick option buttons.
- [ ] Support custom free-text answer.
- [ ] Support cancellation from chat and live voice.
- [ ] Support “stop thinking” / abort current workflow.
- [ ] Support workflow continuation after user answer.

### UX Rules

When workflow asks a question:

- show one question;
- show 2-4 suggested answer buttons;
- allow user text input;
- do not ask all questions at once.

When user submits answer:

- user message appears immediately;
- send button enters loading state immediately;
- no double-submit.

### Tests

- [ ] Runtime asks first planning question.
- [ ] Runtime records answer and asks next question.
- [ ] Runtime can cancel.
- [ ] Runtime resumes after app rerender.
- [ ] Runtime prevents double-submit.

### Done Criteria

- Project planning can be a real guided workflow.
- No code plan generation happens before questions are complete.
- `npm run verify` passes.

---

## Milestone 0.5 — Built-In Workflow Skills

**Goal:** Implement the first native Contex Superpowers.

**Files:**

- Create: `src/workflows/workflowSkills.ts`
- Modify: `src/views/createNotePrompts.ts`
- Modify: `src/views/smartNoteCreation.ts`
- Modify: `src/editor/inlineDiffWorkflow.ts`
- Modify: `src/web/workflowPlanner.ts`
- Modify: `src/contexCode/planningInterview.ts`

### Built-In Skills

#### 1. Note Creation Brainstorm

Use when user asks to create a note, page, file, plan, summary, research doc, or idea doc.

Behavior:

- simple note: create immediately;
- vague project idea: maybe ask 1-2 questions;
- title must be generated from content, not copied from command;
- open created note automatically;
- write compact receipt.

Examples:

```text
Создай файл с анекдотами в папке Test.
```

Expected title:

```text
Анекдоты.md
```

Not:

```text
с анекдотами в папке тест.md
```

#### 2. Project Brainstorm

Use for product/project ideas.

Behavior:

- summarize understanding;
- ask one question at a time;
- offer quick options;
- create user-facing design spec;
- optionally create Contex Code plan.

#### 3. Research Update

Use when user asks:

- latest;
- актуальность;
- in 2026;
- на дату;
- current trends;
- compare modern options.

Behavior:

- decide if web is needed;
- search web;
- combine with vault/Wiki;
- update/create note;
- attach real sources.

#### 4. Safe Edit

Use for selected text, replacements, grammar, rewrite, improve, expand, shorten.

Behavior:

- prefer selection;
- fallback to fuzzy text occurrence;
- show inline diff;
- accept/change/reject/undo.

#### 5. Vault Action

Use for open/find/create/edit/undo/read.

Behavior:

- resolve folder and file candidates;
- execute action;
- verify action;
- show compact receipt.

#### 6. Debugging / Review

Use when user asks to diagnose, review, find problems, optimize, speed up, audit.

Behavior:

- gather context;
- ask only if blocked;
- provide findings first;
- make action plan if user wants implementation.

#### 7. Wiki Memory

Use automatically after meaningful workflows.

Behavior:

- write raw event;
- propose/update nodes;
- avoid duplicates;
- connect sources.

### Tests

- [ ] Note title generation tests.
- [ ] Project brainstorm asks questions in UI language.
- [ ] Research workflow triggers web only when useful.
- [ ] Safe edit uses selection first.
- [ ] Safe edit fuzzy replaces punctuation variants.
- [ ] Vault action verifies opened file.
- [ ] Wiki event is written after meaningful workflow.

### Done Criteria

- At least 7 workflows are available.
- Note naming is substantially better.
- Wiki begins filling automatically.
- `npm run verify` passes.

---

## Milestone 0.6 — Tool Execution And Verification

**Goal:** Make workflows trustworthy.

**Files:**

- Create: `src/workflows/workflowVerification.ts`
- Modify: `src/actions/actionExecutor.ts`
- Modify: `src/actions/actionTimeline.ts`
- Modify: `src/actions/actionReliability.ts`
- Modify: `src/diff/textOccurrence.ts`

### Tasks

- [ ] All workflow actions go through `actionExecutor`.
- [ ] Opening a note verifies active file path after action.
- [ ] Creating a note verifies file exists and content is readable.
- [ ] Editing verifies text changed.
- [ ] Undo verifies old text restored.
- [ ] Failed action returns compact failure receipt with reason.
- [ ] Direct destructive actions remain confirmation-gated.

### Tests

- [ ] “Opened” never appears if active file did not change.
- [ ] “Created” never appears if file does not exist.
- [ ] “Edited” never appears if content did not change.
- [ ] Fuzzy replace handles `Я-гений`, `Я гений`, `Я—гений`.

### Done Criteria

- Model can no longer casually claim completion without execution.
- Receipts reflect verified reality.
- `npm run verify` passes.

---

## Milestone 0.7 — Wiki Memory Integration

**Goal:** Make Wiki LLM actually grow without user micromanagement.

**Files:**

- Create: `src/workflows/workflowMemory.ts`
- Modify: `src/wiki/wikiAutopilot.ts`
- Modify: `src/wiki/wikiWriter.ts`
- Modify: `src/wiki/wikiNodeProposal.ts`
- Modify: `src/wiki/wikiGraphIndex.ts`
- Modify: `src/wiki/wikiRawIngestion.ts`

### Tasks

- [ ] Every meaningful workflow emits a `WorkflowMemoryEvent`.
- [ ] Raw event is saved under correct `Contex Wiki/Raw/*`.
- [ ] Autopilot decides whether to propose/update structured node.
- [ ] Wiki avoids duplicate nodes.
- [ ] Wiki stores source links.
- [ ] Wiki stores confidence and stale status.
- [ ] Wiki stores user preferences:
  - preferred planning style;
  - file naming preferences;
  - preferred language;
  - preferred workflows.

### Auto Memory Policy

Save automatically for:

- created project notes;
- research summaries;
- accepted decisions;
- Contex Code plans;
- user preferences;
- repeated corrections;
- tool failures that reveal workflow bugs.

Do not save automatically for:

- tiny greetings;
- accidental messages;
- sensitive-looking private fragments unless attached to a deliberate workflow.

### Tests

- [ ] Creating a project note writes raw event.
- [ ] Repeated file naming correction updates preference.
- [ ] Research workflow writes web raw source.
- [ ] Wiki graph index includes new node.

### Done Criteria

- Wiki folders stop being empty in real use.
- Wiki has visible growth after workflows.
- `npm run verify` passes.

---

## Milestone 0.8 — UI Integration

**Goal:** Make workflows visible but not noisy.

**Files:**

- Create: `src/workflows/workflowReceipts.ts`
- Modify: `src/chat/chatMessages.ts`
- Modify: `src/views/controllers/ChatController.ts`
- Modify: `src/sources/sourceReferences.ts`
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `styles.css`

### Tasks

- [ ] Collapse sources by default:

```text
2 sources
```

- [ ] Show compact action receipts:

```text
Opened · Test/Test.md
Created · Obsidian/Voice Flow.md
Edited · Test/Test.md
```

- [ ] Keep full detail behind click.
- [ ] Show workflow status:
  - planning;
  - asking;
  - searching web;
  - opening note;
  - editing;
  - verifying;
  - done.

- [ ] User message appears instantly.
- [ ] Send button locks immediately.
- [ ] Workflow question cards use quick options.
- [ ] More menu includes workflow debug only behind hidden/advanced action.

### Tests

- [ ] Source list starts collapsed.
- [ ] Receipts do not flood chat.
- [ ] Send button cannot be double-clicked into duplicate prompts.
- [ ] Workflow question card renders options.

### Done Criteria

- Chat looks calmer.
- User always knows what is happening.
- `npm run verify` passes.

---

## Milestone 0.9 — Voice And Live Dialogue Workflows

**Goal:** Make voice use the same workflow engine.

**Files:**

- Modify: `src/voice/liveDialogue.ts`
- Modify: `src/voice/voiceDialogueV2.ts`
- Modify: `src/voice/liveTranscript.ts`
- Modify: `src/voice/streamingSpeech.ts`
- Modify: `src/views/controllers/LiveDialogueController.ts`
- Modify: `src/views/controllers/VoiceController.ts`

### Tasks

- [ ] Voice transcript final goes through workflow router.
- [ ] Live dialogue uses short workflow-aware responses.
- [ ] Barge-in cancels current TTS and active workflow response.
- [ ] Voice command receipts are spoken briefly:
  - “Открыла”
  - “Создала”
  - “Показываю правку”
  - “Не нашла точно, уточни”

- [ ] Partial transcript appears while speaking.
- [ ] Workflow questions are voice-friendly.
- [ ] Long answers are summarized before TTS.

### Tests

- [ ] Voice command “открой тест в папке Test” routes to vault action.
- [ ] Voice command “создай заметку” routes to note creation.
- [ ] Voice interruption cancels speaking state.
- [ ] Live dialogue answer is short.

### Done Criteria

- Live dialogue stops behaving like ordinary microphone input.
- It becomes an action-capable conversation layer.
- `npm run verify` passes.

---

## Milestone 1.0 — Testing, Golden Corpus, And Release Gate

**Goal:** Prevent regressions.

**Files:**

- Modify: `tests/run-tests.mjs`
- Create: `tests/fixtures/vault/*`
- Create: `tests/golden/workflow-commands.ru.json`
- Create: `tests/golden/workflow-commands.en.json`
- Create: `tests/golden/workflow-commands.stt-noisy.json`
- Modify: `src/testing/scenarioHarness.ts`

### Tasks

- [ ] Auto-discover every `*.test.ts`.
- [ ] Add real fixture vault:
  - duplicate file names;
  - Cyrillic folder names;
  - `Test/Test.md`;
  - `lumiq/lumiq.md`;
  - `lumiq/stat1.md`;
  - attachments;
  - sample PDFs/images.

- [ ] Add fake LLM server.
- [ ] Add fake web search server.
- [ ] Add fake STT/TTS hooks.
- [ ] Add golden command corpus.
- [ ] Add performance budgets:
  - workflow route under 300 ms for rule-fast path;
  - vault candidate generation under 500 ms on fixture vault;
  - fuzzy replace under 200 ms for normal notes.

- [ ] Add snapshot tests for note creation:
  - no JSON fences;
  - no duplicate title;
  - correct file name;
  - no command phrase as title.

### Release Gate

Before marking Workflow Engine v1 complete:

- [ ] `npm run verify` passes.
- [ ] Manual test list passes.
- [ ] No obvious source spam.
- [ ] Wiki grows after meaningful workflows.
- [ ] Voice commands route through workflows.
- [ ] Contex Code planning questions use user UI language.
- [ ] Created note names are human titles, not command fragments.

---

## Manual Test Script

### Note Creation

1. `Создай файл с анекдотами в папке Test.`
   - Expected: `Test/Анекдоты.md`
   - Not: `с анекдотами в папке тест.md`

2. `Создай в текущей папке план тестирования.`
   - Expected: created in active folder.

3. `Создай современную страницу про локальные LLM в 2026 году.`
   - Expected: web research used, real sources attached.

### Vault Actions

4. `Открой тест в папке Test.`
   - Expected: `Test/Test.md`.

5. `Открой lumiq в папке lumiq.`
   - Expected: `lumiq/lumiq.md`, not `lumiq/stat1.md`.

6. `Открой LLM Engineering в папке Proton.`
   - Expected: `Proton/LLM Engineering.md`.

### Safe Edit

7. Select text, send `Улучши выделенный текст.`
   - Expected: inline diff.

8. `Поменяй Я-гений на Я-человек.`
   - Expected: fuzzy match if note has `Я гений`.

9. `Откати последнее изменение.`
   - Expected: undo, no web search.

### Complex Corrections

10. `Открой в папке Obsidian, точнее нет, создай в папке Obsidian план для агента Contex.`
    - Expected: create note, not open.

11. `Открой тест в папке Test и поменяй Я гений на Я человек.`
    - Expected: open + diff.

12. `Нет, не открывай, лучше создай новую заметку и сделай web research.`
    - Expected: correction overrides earlier intent.

### Contex Code

13. Open a project idea note and click `Create Code Plan`.
    - Expected: one question at a time, quick options, user language in UI.

14. Complete questions.
    - Expected:
      - design spec near note;
      - full IDE plan;
      - mini plan block in user language.

### Wiki Memory

15. After creating a project note, inspect `Contex Wiki`.
    - Expected: raw event + at least one proposed/structured node.

16. Repeat a file naming correction.
    - Expected: Wiki preference updated.

### Voice

17. Voice: `Открой тест в папке Test.`
    - Expected: file opens.

18. Live dialogue: interrupt assistant while speaking.
    - Expected: TTS stops and new transcript starts.

---

## Implementation Order

Recommended execution:

1. Milestone 0.1
2. Tests
3. Milestone 0.2
4. Tests
5. Milestone 0.3
6. Tests
7. Milestone 0.4
8. Tests
9. Milestone 0.5
10. Tests
11. Milestone 0.6
12. Tests
13. Milestone 0.7
14. Tests
15. Milestone 0.8
16. Tests
17. Milestone 0.9
18. Tests
19. Milestone 1.0
20. Full manual pass

Do not merge all milestones blindly. Each milestone should leave the plugin usable.

---

## Expected Final Result

After Workflow Engine v1:

- Contex automatically chooses the right superpower workflow.
- Complex commands become step-by-step plans.
- Simple commands remain fast.
- Wiki memory grows automatically.
- Note creation titles improve.
- Sources are useful and quiet.
- Voice routes through the same action system.
- Contex Code planning becomes a real AI planning workflow, not a static generator.

