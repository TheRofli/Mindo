# Mindo First Value Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mindo's first five minutes prove the core promise: ask the vault, get sourced answers, and apply safe Markdown changes only through preview/receipt flows.

**Architecture:** Add a small resolver decision layer, tighten vault-local routing, update the empty-state starter prompts, and harden source/action surfaces without growing `src/views/AgentSidebarView.ts` more than necessary. Prefer focused helpers under `src/resolver`, `src/chat`, and existing controller/workflow files; keep UI rendering in existing `src/views/*Renderer.ts` modules.

**Tech Stack:** TypeScript, Obsidian plugin APIs, existing Node test runner (`node scripts/run-tests.mjs`), existing build/verify/package scripts, optional Rust sidecar unaffected.

---

## File Structure

### New Files

- `src/resolver/openFileResolution.ts`
  - Owns the direct/clarify/no-match decision around ranked note path candidates.
  - Wraps `rankOpenFilePathCandidates` so open-note controllers do not need to reason about score gaps directly.
- `tests/openFileResolution.test.ts`
  - Tests confident fuzzy matching, ambiguous candidates, no-match behavior, and no current-file fallback.
- `docs/testing/first-value-flow-smoke.md`
  - Manual Obsidian smoke script for the first-value flow.

### Modified Files

- `src/views/controllers/OpenFileCommandController.ts`
  - Uses the new resolver decision before Rust fallback and returns a clarification receipt instead of opening the wrong file.
- `tests/openFileCommandController.test.ts`
  - Covers ambiguous resolution and no-match behavior.
- `src/views/controllers/VaultFileOpenController.ts`
  - Exposes a decision-style resolution helper for direct UI/live-dialogue paths.
- `tests/vaultFileOpenController.test.ts`
  - Covers clarify/no direct candidate when multiple candidates are close.
- `src/types.ts`
  - Adds `needs_confirmation` to `ActionReceipt.status`.
- `src/chat/chatMessages.ts`
  - Formats the new receipt status.
- `tests/chatMessages.test.ts`
  - Covers the new receipt status label.
- `src/chat/autoWebGuards.ts`
  - Expands vault-local detection so active-note/current-file/vault-file questions do not trigger automatic web search.
- `tests/autoWebGuards.test.ts`
  - Covers local vault questions, explicit web requests, and named-note questions.
- `src/chat/autoWebContextBuilder.ts`
  - Uses the guard in the pure builder path so future controller code can rely on the tested helper.
- `tests/autoWebContextBuilder.test.ts`
  - Covers skipping web for vault-local requests.
- `src/chat/userMessageRequestContext.ts`
  - Ensures vault-local questions can request semantic vault search even when current-note context is present.
- `tests/userMessageRequestContext.test.ts`
  - Covers local-vault source attachment for first-value prompts.
- `src/chat/assistantMessageAnnotations.ts`
  - Keeps vault and web sources separated and marks vault-local messages with vault sources when available.
- `tests/assistantMessageAnnotations.test.ts`
  - Covers vault source preservation without web source pollution.
- `src/views/noteActions.ts`
  - Replaces legacy empty-state suggestions with the three first-value starter prompts.
- `src/i18n.ts`
  - Adds localized labels/descriptions for the first-value starter prompts.
- `src/views/suggestionCardsRenderer.ts`
  - Keeps existing renderer shape but sources cards from the updated prompt set.
- `tests/suggestionCardsRenderer.test.ts`
  - Verifies the three first-value prompts in English and Russian.
- `src/notes/currentNoteUpdateWorkflow.ts`
  - Tightens prompt wording so update actions are explicitly preview-only and do not ask the model to claim it changed files.
- `tests/currentNoteUpdateWorkflow.test.ts`
  - Covers preview-first wording and diff preview metadata.
- `src/diff/diffPreviewWorkflow.ts`
  - Improves receipt detail text for apply/undo so the first-value flow clearly reports target note and operation.
- `tests/diffPreviewWorkflow.test.ts`
  - Covers the improved receipt fields.
- `tests/firstValueFlowScenarios.test.ts`
  - Integration-style test that ties starter prompt, vault-local routing, resolver clarification, sources, and safe diff preview into one executable scenario.

### Do Not Modify Unless A Task Explicitly Needs It

- `src/views/AgentSidebarView.ts`
  - Only minimal wiring is allowed. New logic belongs in helpers/controllers.
- `main.js`, `styles.css`, `dist/*`
  - Generated or release outputs are not part of this plan. They change only through the final build/package step if the repo workflow updates them.
- `tools/contex_core/*`
  - The first-value flow must work without Rust changes.

---

## Task 0: Baseline And Smoke Checklist

**Files:**
- Create: `docs/testing/first-value-flow-smoke.md`
- Read: `docs/superpowers/specs/2026-05-18-first-value-flow-design.md`
- Verify: `package.json`

- [ ] **Step 1: Confirm clean starting state**

Run:

```powershell
git status --short --branch
```

Expected: current branch is `mindo-hardening-refactor`; no unstaged or untracked implementation files before this task starts.

- [ ] **Step 2: Run focused preflight tests**

Run:

```powershell
node scripts/run-tests.mjs tests/openFileResolver.test.ts tests/vaultActionDecision.test.ts tests/autoWebGuards.test.ts tests/autoWebContextBuilder.test.ts tests/userMessageRequestContext.test.ts tests/sourceReferences.test.ts tests/homeHeroRenderer.test.ts tests/suggestionCardsRenderer.test.ts tests/currentNoteUpdateWorkflow.test.ts tests/diffPreviewWorkflow.test.ts tests/workflowEngine.test.ts
```

Expected: every listed test prints its `... tests passed` line and the command exits with code `0`.

- [ ] **Step 3: Create manual smoke checklist**

Create `docs/testing/first-value-flow-smoke.md` with this exact content:

```markdown
# Mindo First Value Flow Smoke Test

Use this checklist after the implementation tasks and final build.

## Fixture Vault

Create or use a vault with these notes:

- `Proton/Qore Systems Cases.md`
- `Proton/Qore Systems Strategy.md`
- `Drafts/Mindo Rough Draft.md`

`Proton/Qore Systems Cases.md` should describe business workflow cases.
`Proton/Qore Systems Strategy.md` should describe strategy, positioning, or architecture.
`Drafts/Mindo Rough Draft.md` should contain an intentionally rough paragraph.

## Smoke Flow

1. Open `Drafts/Mindo Rough Draft.md`.
2. Open Mindo.
3. Confirm the empty/new-chat state offers starter prompts around vault recall, note connections, and draft improvement.
4. Ask: `What is this note about?`
5. Confirm the answer uses the active note and shows vault sources, with no unrelated web sources.
6. Ask: `Open core system strategy.`
7. Confirm Mindo opens `Proton/Qore Systems Strategy.md` or asks a short clarification if both Qore notes are close.
8. Ask: `Make this draft clearer.`
9. Confirm Mindo shows a diff preview before changing the note.
10. Apply the preview.
11. Confirm the receipt names the target note and the note content matches the preview.
12. Undo the change if the UI offers undo.

## Pass Criteria

- Mindo never opens the currently active file as a fallback when a different named file was requested.
- Mindo asks a short clarification for ambiguous note names.
- Vault-local questions do not trigger automatic web search unless the user explicitly asks for web/current/latest information.
- Every vault answer that used vault snippets exposes sources.
- Every note mutation is preview-first or guarded by the existing Auto mode policy.
```

- [ ] **Step 4: Commit the smoke checklist**

Run:

```powershell
git add docs/testing/first-value-flow-smoke.md
git commit -m "docs: add first value flow smoke test"
```

Expected: one docs-only commit.

---

## Task 1: Resolver Decision Layer

**Files:**
- Create: `src/resolver/openFileResolution.ts`
- Create: `tests/openFileResolution.test.ts`
- Read: `src/resolver/openFileResolver.ts`
- Test: `tests/openFileResolver.test.ts`

- [ ] **Step 1: Write the failing resolver decision tests**

Create `tests/openFileResolution.test.ts` with:

```typescript
import assert from "node:assert/strict";

import { resolveOpenFileTarget } from "../src/resolver/openFileResolution";

const qorePaths = [
  "Proton/Qore Systems Cases.md",
  "Proton/Qore Systems Strategy.md",
  "Proton/Quark One.md",
  "Archive/Core System Notes.md"
];

{
  const result = resolveOpenFileTarget({
    paths: qorePaths,
    query: "core system strategy"
  });

  assert.equal(result.kind, "direct");
  assert.equal(result.kind === "direct" && result.candidate.path, "Proton/Qore Systems Strategy.md");
}

{
  const result = resolveOpenFileTarget({
    paths: qorePaths,
    query: "qore systems",
    ambiguityGap: 9999
  });

  assert.equal(result.kind, "clarify");
  assert.deepEqual(
    result.kind === "clarify" ? result.candidates.map((candidate) => candidate.path) : [],
    ["Proton/Qore Systems Cases.md", "Proton/Qore Systems Strategy.md"]
  );
}

{
  const result = resolveOpenFileTarget({
    paths: qorePaths,
    query: "quark one"
  });

  assert.equal(result.kind, "direct");
  assert.equal(result.kind === "direct" && result.candidate.path, "Proton/Quark One.md");
}

{
  const result = resolveOpenFileTarget({
    paths: qorePaths,
    query: "file that does not exist"
  });

  assert.equal(result.kind, "none");
  assert.match(result.reason, /No Markdown note matched/);
}

{
  const result = resolveOpenFileTarget({
    paths: ["Current/Open.md"],
    query: "missing strategy",
    currentPath: "Current/Open.md"
  });

  assert.equal(result.kind, "none");
}

console.log("openFileResolution tests passed");
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
node scripts/run-tests.mjs tests/openFileResolution.test.ts
```

Expected: FAIL because `src/resolver/openFileResolution.ts` does not exist.

- [ ] **Step 3: Implement the resolver decision helper**

Create `src/resolver/openFileResolution.ts` with:

```typescript
import {
  rankOpenFilePathCandidates,
  type OpenFilePathCandidate
} from "./openFileResolver";

export type OpenFileResolution =
  | {
      kind: "direct";
      candidate: OpenFilePathCandidate;
      reason: string;
    }
  | {
      kind: "clarify";
      candidates: OpenFilePathCandidate[];
      reason: string;
    }
  | {
      kind: "none";
      reason: string;
    };

export interface ResolveOpenFileTargetOptions {
  paths: string[];
  query: string;
  currentPath?: string | null;
  minDirectScore?: number;
  ambiguityGap?: number;
  maxClarifyCandidates?: number;
}

const DEFAULT_MIN_DIRECT_SCORE = 420;
const DEFAULT_AMBIGUITY_GAP = 160;
const DEFAULT_MAX_CLARIFY_CANDIDATES = 3;

export function resolveOpenFileTarget(
  options: ResolveOpenFileTargetOptions
): OpenFileResolution {
  const ranked = rankOpenFilePathCandidates(options.paths, options.query);
  const candidates = ranked.filter(
    (candidate) => candidate.path !== options.currentPath
  );
  const minDirectScore = options.minDirectScore ?? DEFAULT_MIN_DIRECT_SCORE;
  const ambiguityGap = options.ambiguityGap ?? DEFAULT_AMBIGUITY_GAP;
  const maxClarifyCandidates =
    options.maxClarifyCandidates ?? DEFAULT_MAX_CLARIFY_CANDIDATES;

  if (!candidates.length) {
    return {
      kind: "none",
      reason: "No Markdown note matched the requested name."
    };
  }

  const [topCandidate, secondCandidate] = candidates;

  if (topCandidate.score < minDirectScore) {
    return {
      kind: "none",
      reason: "No Markdown note matched the requested name with enough confidence."
    };
  }

  if (
    secondCandidate &&
    secondCandidate.score >= minDirectScore &&
    topCandidate.score - secondCandidate.score < ambiguityGap
  ) {
    return {
      kind: "clarify",
      candidates: candidates
        .filter((candidate) => candidate.score >= minDirectScore)
        .slice(0, maxClarifyCandidates),
      reason: "Multiple Markdown notes are close matches."
    };
  }

  return {
    kind: "direct",
    candidate: topCandidate,
    reason: "Top Markdown note candidate is clearly ahead."
  };
}
```

- [ ] **Step 4: Run resolver tests**

Run:

```powershell
node scripts/run-tests.mjs tests/openFileResolution.test.ts tests/openFileResolver.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Commit resolver decision layer**

Run:

```powershell
git add src/resolver/openFileResolution.ts tests/openFileResolution.test.ts
git commit -m "feat: add vault file resolution decisions"
```

Expected: one commit with the new helper and tests.

---

## Task 2: Open Note Clarification Instead Of Wrong Fallbacks

**Files:**
- Modify: `src/types.ts`
- Modify: `src/chat/chatMessages.ts`
- Modify: `tests/chatMessages.test.ts`
- Modify: `src/views/controllers/OpenFileCommandController.ts`
- Modify: `tests/openFileCommandController.test.ts`
- Modify: `src/views/controllers/VaultFileOpenController.ts`
- Modify: `tests/vaultFileOpenController.test.ts`
- Test: `tests/openFileResolution.test.ts`

- [ ] **Step 1: Add receipt status test**

Append to `tests/chatMessages.test.ts`:

```typescript
assert.equal(formatActionReceiptStatus("needs_confirmation"), "Needs confirmation");
```

- [ ] **Step 2: Run the receipt status test to verify it fails**

Run:

```powershell
node scripts/run-tests.mjs tests/chatMessages.test.ts
```

Expected: FAIL because `needs_confirmation` is not in `ActionReceipt["status"]`.

- [ ] **Step 3: Add the receipt status**

In `src/types.ts`, replace the `ActionReceipt.status` union with:

```typescript
  status:
    | "done"
    | "preview"
    | "opened"
    | "saved"
    | "reverted"
    | "rejected"
    | "failed"
    | "needs_confirmation";
```

In `src/chat/chatMessages.ts`, add this branch before the fallback return:

```typescript
  if (status === "needs_confirmation") {
    return "Needs confirmation";
  }
```

- [ ] **Step 4: Add OpenFileCommandController clarification tests**

In `tests/openFileCommandController.test.ts`, add this function before the final awaits:

```typescript
async function testAmbiguousCandidateAsksForConfirmation(): Promise<void> {
  const { controller, opened, receipts, statuses, timeline } = createDeps({
    getMarkdownPaths: () => [
      "Proton/Qore Systems Cases.md",
      "Proton/Qore Systems Strategy.md"
    ]
  });

  const result = await controller.openFileByVaultQuery(
    "qore systems",
    "Open qore systems"
  );

  assert.equal(result, null);
  assert.deepEqual(opened, []);
  assert.equal(receipts[0].status, "needs_confirmation");
  assert.equal(receipts[0].label, "Choose note");
  assert.match(receipts[0].detail ?? "", /Qore Systems Cases/);
  assert.match(receipts[0].detail ?? "", /Qore Systems Strategy/);
  assert.equal(statuses.at(-1), "Status: Choose note");
  assert.equal(timeline.at(-1)?.type, "failed");
}
```

Then call it near the bottom:

```typescript
await testAmbiguousCandidateAsksForConfirmation();
```

- [ ] **Step 5: Run controller tests to verify they fail**

Run:

```powershell
node scripts/run-tests.mjs tests/openFileCommandController.test.ts tests/chatMessages.test.ts
```

Expected: FAIL because the controller still opens the top candidate or returns no confirmation receipt.

- [ ] **Step 6: Wire resolver decision into OpenFileCommandController**

In `src/views/controllers/OpenFileCommandController.ts`, import the resolver:

```typescript
import {
  resolveOpenFileTarget,
  type OpenFileResolution
} from "../../resolver/openFileResolution";
```

Change `resolveQuery` to return `Promise<OpenFileResolution>` and implement:

```typescript
  private async resolveQuery(query: string): Promise<OpenFileResolution> {
    const directFile = this.deps.resolveDirectCandidate(query);

    if (directFile) {
      return {
        kind: "direct",
        candidate: {
          path: directFile.path,
          basename: directFile.basename,
          folder: getFolderPath(directFile.path),
          score: 999
        },
        reason: "Matched by file name and folder."
      };
    }

    const paths = this.deps.getMarkdownPaths();
    const localResolution = resolveOpenFileTarget({
      paths,
      query
    });

    if (localResolution.kind !== "none") {
      return localResolution;
    }

    const rustResolved = await this.deps.resolvePathsWithRustCore({
      query,
      paths,
      limit: 3,
      pluginDir: this.deps.pluginDir ?? ""
    });

    if (rustResolved?.length) {
      return {
        kind: "direct",
        candidate: {
          path: rustResolved[0].path,
          basename:
            rustResolved[0].path.split("/").pop()?.replace(/\.md$/i, "") ??
            rustResolved[0].path,
          folder: getFolderPath(rustResolved[0].path),
          score: rustResolved[0].score
        },
        reason: "Matched by Rust path resolver."
      };
    }

    return localResolution;
  }
```

Then update `openFileByVaultQuery` after `const resolution = await this.resolveQuery(query);`:

```typescript
    if (resolution.kind === "none") {
      this.deps.setError(`Could not find a Markdown note for: ${query}`);
      this.deps.setStatus("Status: Open failed");
      this.deps.pushActionTimeline("failed", "Open failed", query);
      return null;
    }

    if (resolution.kind === "clarify") {
      const detail = resolution.candidates
        .map((candidate, index) => `${index + 1}. ${candidate.path}`)
        .join(" | ");
      this.deps.rememberVaultSearch(
        query,
        resolution.candidates.map((candidate) => ({
          path: candidate.path,
          title: candidate.basename,
          score: candidate.score,
          snippet: "Close Markdown note match.",
          matches: ["filename", "path"]
        }))
      );
      this.deps.appendActionReceipt(
        {
          status: "needs_confirmation",
          label: "Choose note",
          detail
        },
        commandText
      );
      this.deps.setStatus("Status: Choose note");
      this.deps.pushActionTimeline("failed", "Open needs confirmation", detail);
      return null;
    }

    const result = {
      path: resolution.candidate.path,
      title: resolution.candidate.basename,
      score: resolution.candidate.score,
      snippet: resolution.reason,
      matches: ["filename", "path"]
    };
```

Keep the existing `rememberVaultSearch`, `openVaultPath`, receipt, and timeline code using `result`.

- [ ] **Step 7: Add VaultFileOpenController decision helper**

In `src/views/controllers/VaultFileOpenController.ts`, import:

```typescript
import {
  resolveOpenFileTarget,
  type OpenFileResolution
} from "../../resolver/openFileResolution";
```

Add this method to the class:

```typescript
  resolveOpenFileDecision(query: string): OpenFileResolution {
    return resolveOpenFileTarget({
      paths: this.deps.getMarkdownPaths(),
      query,
      currentPath: this.deps.getVoiceSessionMemory().lastOpenedFile
    });
  }
```

Change `resolveOpenFileCandidate` to use it:

```typescript
  resolveOpenFileCandidate(query: string): TFile | null {
    const decision = this.resolveOpenFileDecision(query);

    if (decision.kind !== "direct") {
      return null;
    }

    return this.deps.getFileByPath(decision.candidate.path);
  }
```

- [ ] **Step 8: Add VaultFileOpenController clarification test**

Append to `tests/vaultFileOpenController.test.ts`:

```typescript
const ambiguousController = new VaultFileOpenController<FakeFile>({
  getMarkdownPaths: () => [
    "Proton/Qore Systems Cases.md",
    "Proton/Qore Systems Strategy.md"
  ],
  getFileByPath: (path) => ({ path, basename: path.split("/").pop() ?? path }),
  openFileInWorkspace: async () => undefined,
  openLinkText: async () => undefined,
  getVoiceSessionMemory: () => memory,
  setContextDetail: () => undefined,
  setError: () => undefined,
  setStatus: () => undefined
});

const ambiguousDecision = ambiguousController.resolveOpenFileDecision("qore systems");
assert.equal(ambiguousDecision.kind, "clarify");
assert.equal(ambiguousController.resolveOpenFileCandidate("qore systems"), null);
```

- [ ] **Step 9: Run focused tests**

Run:

```powershell
node scripts/run-tests.mjs tests/openFileResolution.test.ts tests/openFileCommandController.test.ts tests/vaultFileOpenController.test.ts tests/chatMessages.test.ts
```

Expected: all pass.

- [ ] **Step 10: Commit open-note clarification behavior**

Run:

```powershell
git add src/types.ts src/chat/chatMessages.ts tests/chatMessages.test.ts src/views/controllers/OpenFileCommandController.ts tests/openFileCommandController.test.ts src/views/controllers/VaultFileOpenController.ts tests/vaultFileOpenController.test.ts
git commit -m "feat: ask before opening ambiguous vault notes"
```

Expected: one commit.

---

## Task 3: Vault-Local Routing Before Automatic Web Search

**Files:**
- Modify: `src/chat/autoWebGuards.ts`
- Modify: `tests/autoWebGuards.test.ts`
- Modify: `src/chat/autoWebContextBuilder.ts`
- Modify: `tests/autoWebContextBuilder.test.ts`
- Modify: `src/chat/userMessageRequestContext.ts`
- Modify: `tests/userMessageRequestContext.test.ts`

- [ ] **Step 1: Add vault-local guard tests**

Append to `tests/autoWebGuards.test.ts`:

```typescript
assert.equal(
  isVaultLocalDescriptionRequest("What is this active note about?"),
  true
);

assert.equal(
  isVaultLocalDescriptionRequest("Explain the opened file and use my vault notes."),
  true
);

assert.equal(
  isVaultLocalDescriptionRequest("Find qore systems strategy in my vault"),
  true
);

assert.equal(
  isVaultLocalDescriptionRequest("Search the web for qore systems strategy"),
  false
);
```

- [ ] **Step 2: Run guard tests to verify current gap**

Run:

```powershell
node scripts/run-tests.mjs tests/autoWebGuards.test.ts
```

Expected: FAIL on at least the named-vault request if the current guard is too narrow.

- [ ] **Step 3: Expand vault-local guard**

In `src/chat/autoWebGuards.ts`, add an exported explicit web helper and broaden local detection:

```typescript
export function hasExplicitWebIntent(userRequest: string): boolean {
  const normalizedText = normalizeRequestText(userRequest);

  return includesAny(normalizedText, [
    "в интернете",
    "в вебе",
    "поиск в сети",
    "поищи в интернете",
    "загугли",
    "web",
    "internet",
    "online",
    "search the web",
    "google"
  ]);
}

function normalizeRequestText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
```

Then update `isVaultLocalDescriptionRequest` to use these groups:

```typescript
  const normalized = normalizeRequestText(userRequest);

  if (!normalized || hasExplicitWebIntent(normalized)) {
    return false;
  }

  const localTarget = includesAny(normalized, [
    "открыт",
    "текущ",
    "этот файл",
    "эту заметку",
    "активн",
    "мой vault",
    "моем vault",
    "моём vault",
    "в vault",
    "из vault",
    "в хранилище",
    "из хранилища",
    "current note",
    "open file",
    "opened file",
    "active note",
    "my vault",
    "in my vault",
    "from my vault"
  ]);
  const descriptionIntent = includesAny(normalized, [
    "опиши",
    "описать",
    "объясни",
    "объяснить",
    "о чем",
    "о чём",
    "что это",
    "найди",
    "найти",
    "покажи",
    "открой",
    "summarize",
    "describe",
    "explain",
    "what is this",
    "find",
    "show",
    "open"
  ]);
```

Remove the old private `hasExplicitWebIntent` function so the exported helper is the only one.

- [ ] **Step 4: Add auto-web builder skip test**

Append to `tests/autoWebContextBuilder.test.ts`:

```typescript
{
  let searched = false;

  const context = await buildAutoWebContext(
    baseOptions({
      userRequest: "Find qore systems strategy in my vault",
      isLocalOnlyCommandText: () => false,
      decideAutoWebResearch: () => ({
        query: "qore systems strategy",
        reason: "model guessed web"
      }),
      planContextWorkflow: () => ({
        requiresWeb: false,
        reason: "not needed"
      }),
      searchWeb: async () => {
        searched = true;
        return {
          provider: "duckduckgo",
          results: [webResult]
        };
      }
    })
  );

  assert.equal(context, null);
  assert.equal(searched, false);
}
```

- [ ] **Step 5: Wire guard into auto-web builder**

In `src/chat/autoWebContextBuilder.ts`, import:

```typescript
import { isVaultLocalDescriptionRequest } from "./autoWebGuards";
```

Add after the local-only command check:

```typescript
  if (isVaultLocalDescriptionRequest(options.userRequest)) {
    return null;
  }
```

- [ ] **Step 6: Add request context test for vault-local search**

Append to `tests/userMessageRequestContext.test.ts` inside `run()`:

```typescript
  {
    let searched = false;
    const result = await buildUserMessageRequestContext({
      content: "Find qore systems strategy in my vault",
      liveDialogue: false,
      useCurrentNote: true,
      useVaultSearch: true,
      outgoingAttachments: null,
      attachedVaultResults: null,
      readCurrentNoteContext: async () => ({ context: currentNote }),
      expandSemanticVaultQuery: async (query) => [query, "qore systems strategy"],
      searchSemanticVault: async () => {
        searched = true;
        return [vaultResult];
      }
    });

    assert.equal(searched, true);
    assert.equal(result.context?.currentNote?.path, "Test/Test.md");
    assert.deepEqual(result.context?.vaultResults, [vaultResult]);
  }
```

- [ ] **Step 7: Run focused routing tests**

Run:

```powershell
node scripts/run-tests.mjs tests/autoWebGuards.test.ts tests/autoWebContextBuilder.test.ts tests/userMessageRequestContext.test.ts
```

Expected: all pass.

- [ ] **Step 8: Commit vault-local routing**

Run:

```powershell
git add src/chat/autoWebGuards.ts tests/autoWebGuards.test.ts src/chat/autoWebContextBuilder.ts tests/autoWebContextBuilder.test.ts src/chat/userMessageRequestContext.ts tests/userMessageRequestContext.test.ts
git commit -m "fix: prefer vault context over automatic web search"
```

Expected: one commit.

---

## Task 4: First-Value Starter Prompts

**Files:**
- Modify: `src/i18n.ts`
- Modify: `src/views/noteActions.ts`
- Modify: `src/views/suggestionCardsRenderer.ts`
- Modify: `tests/suggestionCardsRenderer.test.ts`
- Optional minimal inspect: `src/views/AgentSidebarView.ts`

- [ ] **Step 1: Replace suggestion-card expectations**

Replace `tests/suggestionCardsRenderer.test.ts` with:

```typescript
import assert from "node:assert/strict";
import { getSuggestionCards } from "../src/views/suggestionCardsRenderer";

const englishCards = getSuggestionCards("en");

assert.deepEqual(
  englishCards.map((card) => card.id),
  ["vault-recall", "connect-note", "improve-draft"]
);
assert.equal(englishCards[0]?.label, "Ask your vault");
assert.equal(
  englishCards[0]?.description,
  "Find what your notes already say about the current idea."
);
assert.equal(
  englishCards[0]?.action.prompt,
  "What have I already written about this? Answer from my vault and cite the notes you used."
);

const russianCards = getSuggestionCards("ru");

assert.equal(russianCards[0]?.label, "Спросить vault");
assert.equal(
  russianCards[1]?.description,
  "Найти заметки, которые связаны с текущей."
);
assert.equal(
  russianCards[2]?.action.prompt,
  "Сделай этот черновик яснее. Сначала покажи preview/diff, не меняй заметку молча."
);

console.log("suggestionCardsRenderer tests passed");
```

- [ ] **Step 2: Run the suggestion test to verify it fails**

Run:

```powershell
node scripts/run-tests.mjs tests/suggestionCardsRenderer.test.ts
```

Expected: FAIL because the old four suggestions still exist.

- [ ] **Step 3: Update note actions**

Replace `NOTE_ACTIONS` in `src/views/noteActions.ts` with:

```typescript
export const NOTE_ACTIONS: NoteAction[] = [
  {
    id: "vault-recall",
    label: "Ask your vault",
    prompt:
      "What have I already written about this? Answer from my vault and cite the notes you used."
  },
  {
    id: "connect-note",
    label: "Connect this note",
    prompt:
      "Connect this note to related notes in my vault. Explain the strongest links and cite the notes."
  },
  {
    id: "improve-draft",
    label: "Improve this draft",
    kind: "update-current-note",
    prompt:
      "Make this draft clearer. Show a preview/diff first and do not silently change the note."
  }
];
```

Update `getActionDescription` with:

```typescript
  if (action.id === "vault-recall") {
    return "Find what your notes already say about the current idea.";
  }

  if (action.id === "connect-note") {
    return "Find notes that connect to the active note.";
  }

  if (action.id === "improve-draft") {
    return "Draft a clearer version through preview/diff.";
  }
```

Update `getSuggestionTitle` with:

```typescript
  if (action.id === "vault-recall") {
    return "Vault Recall";
  }

  if (action.id === "connect-note") {
    return "Note Connections";
  }

  if (action.id === "improve-draft") {
    return "Draft Preview";
  }
```

- [ ] **Step 4: Add localized action text**

In `src/i18n.ts`, add these entries to `ACTION_TEXT.en`:

```typescript
    "vault-recall": {
      label: "Ask your vault",
      description: "Find what your notes already say about the current idea.",
      title: "Vault Recall"
    },
    "connect-note": {
      label: "Connect this note",
      description: "Find notes that connect to the active note.",
      title: "Note Connections"
    },
    "improve-draft": {
      label: "Improve this draft",
      description: "Draft a clearer version through preview/diff.",
      title: "Draft Preview"
    },
```

Add these entries to `ACTION_TEXT.ru`:

```typescript
    "vault-recall": {
      label: "Спросить vault",
      description: "Найти, что твои заметки уже говорят об этой идее.",
      title: "Память vault"
    },
    "connect-note": {
      label: "Связать заметку",
      description: "Найти заметки, которые связаны с текущей.",
      title: "Связи заметки"
    },
    "improve-draft": {
      label: "Улучшить черновик",
      description: "Подготовить более ясную версию через preview/diff.",
      title: "Preview черновика"
    },
```

- [ ] **Step 5: Run focused UI prompt tests**

Run:

```powershell
node scripts/run-tests.mjs tests/suggestionCardsRenderer.test.ts tests/noteActions.test.ts tests/uiLocalization.test.ts
```

Expected: all pass. If `tests/noteActions.test.ts` expects the old action IDs, update it to the three first-value IDs and rerun.

- [ ] **Step 6: Commit starter prompts**

Run:

```powershell
git add src/i18n.ts src/views/noteActions.ts src/views/suggestionCardsRenderer.ts tests/suggestionCardsRenderer.test.ts tests/noteActions.test.ts tests/uiLocalization.test.ts
git commit -m "feat: focus starter prompts on first value flow"
```

Expected: one commit.

---

## Task 5: Source-First Answer Metadata

**Files:**
- Modify: `src/chat/assistantMessageAnnotations.ts`
- Modify: `tests/assistantMessageAnnotations.test.ts`
- Modify: `src/chat/chatRequestContext.ts`
- Modify: `tests/chatRequestContext.test.ts`
- Test: `src/llm/llmClient.ts`

- [ ] **Step 1: Add source separation tests**

Append to `tests/assistantMessageAnnotations.test.ts`:

```typescript
{
  const assistant = createAssistant();
  const context: LlmRequestContext = {
    vaultResults: [
      {
        path: "Notes/Local.md",
        title: "Local",
        snippet: "Local snippet",
        score: 120
      }
    ],
    webResults: []
  };

  annotateAssistantMessageFromContext(assistant, context, "explain local");
  assert.equal(assistant.sources?.length, 1);
  assert.equal(assistant.webSources, undefined);
  assert.equal(assistant.webResearchResults, undefined);
}

{
  const assistant = createAssistant();
  const context: LlmRequestContext = {
    vaultResults: [
      {
        path: "Notes/Local.md",
        title: "Local",
        snippet: "Local snippet",
        score: 120
      }
    ],
    webResults: [
      {
        title: "Web",
        url: "https://example.com/web",
        snippet: "Web snippet",
        provider: "DuckDuckGo"
      }
    ],
    webResearchReason: "explicit web request"
  };

  annotateAssistantMessageFromContext(assistant, context, "compare with web");
  assert.equal(assistant.sources?.length, 1);
  assert.equal(assistant.webSources?.length, 1);
  assert.equal(assistant.webResearchQuery, "compare with web");
}
```

- [ ] **Step 2: Add chat request context source merge test**

Append to `tests/chatRequestContext.test.ts`:

```typescript
{
  const baseContext = {
    vaultResults: [vaultResult]
  };
  const result = attachAutoWebContextToRequest(baseContext, null);

  assert.equal(result, baseContext);
  assert.deepEqual(result?.vaultResults, [vaultResult]);
}
```

- [ ] **Step 3: Run source tests**

Run:

```powershell
node scripts/run-tests.mjs tests/assistantMessageAnnotations.test.ts tests/chatRequestContext.test.ts tests/sourceReferences.test.ts
```

Expected: all pass. If they fail because the current behavior already works except for type imports, fix the import and rerun.

- [ ] **Step 4: Tighten LLM context wording if needed**

Inspect `src/llm/llmClient.ts`. Keep the existing `formatVaultSearchContext` instruction that says to cite note paths. If it does not include "do not use web results unless provided", add this sentence inside `formatVaultSearchContext`:

```typescript
    "Do not invent web-backed facts from these vault snippets. If the user needs fresh web information, say that web context was not provided.",
```

Add or update a test in the existing LLM-client-related test file if one exists. If no LLM-client request-building test exists, do not create a brittle private-function test; rely on `assistantMessageAnnotations` and `chatRequestContext` for this task.

- [ ] **Step 5: Run focused source tests**

Run:

```powershell
node scripts/run-tests.mjs tests/assistantMessageAnnotations.test.ts tests/chatRequestContext.test.ts tests/sourceReferences.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit source-first metadata**

Run:

```powershell
git add src/chat/assistantMessageAnnotations.ts tests/assistantMessageAnnotations.test.ts src/chat/chatRequestContext.ts tests/chatRequestContext.test.ts src/llm/llmClient.ts
git commit -m "fix: preserve vault sources in local answers"
```

Expected: one commit. If `src/llm/llmClient.ts` was not changed, omit it from `git add`.

---

## Task 6: Preview-First Safe Markdown Actions

**Files:**
- Modify: `src/notes/currentNoteUpdateWorkflow.ts`
- Modify: `tests/currentNoteUpdateWorkflow.test.ts`
- Modify: `src/diff/diffPreviewWorkflow.ts`
- Modify: `tests/diffPreviewWorkflow.test.ts`
- Modify: `src/views/controllers/DiffPreviewActionController.ts`
- Modify: `tests/diffPreviewActionController.test.ts`

- [ ] **Step 1: Add prompt wording assertions**

In `tests/currentNoteUpdateWorkflow.test.ts`, add assertions to the first prompt test:

```typescript
  assert.ok(prompt.includes("Return only the full replacement Markdown"));
  assert.ok(prompt.includes("Do not claim that the note has already been changed"));
```

- [ ] **Step 2: Run current-note update test to verify it fails**

Run:

```powershell
node scripts/run-tests.mjs tests/currentNoteUpdateWorkflow.test.ts
```

Expected: FAIL because the prompt does not yet include the new safety sentence.

- [ ] **Step 3: Update current-note update prompt**

In `src/notes/currentNoteUpdateWorkflow.ts`, add this line to `buildCurrentNoteUpdatePrompt` after the "Return only..." line:

```typescript
    "Do not claim that the note has already been changed; Mindo will show this as a preview/diff before applying it.",
```

- [ ] **Step 4: Add receipt detail assertions**

In `tests/diffPreviewWorkflow.test.ts`, update the apply receipt assertion to:

```typescript
  assert.deepEqual(result.receipt, {
    status: "done",
    label: "Applied change",
    detail: "Updated Test/Test.md with previewed Markdown replacement.",
    path: "Test/Test.md"
  });
```

Update the undo receipt assertion to:

```typescript
  assert.equal(result.receipt.detail, "Reverted previewed Markdown replacement in Test/Test.md.");
```

- [ ] **Step 5: Run diff workflow test to verify it fails**

Run:

```powershell
node scripts/run-tests.mjs tests/diffPreviewWorkflow.test.ts
```

Expected: FAIL because receipt detail is still the plain path.

- [ ] **Step 6: Improve diff receipt details**

In `src/diff/diffPreviewWorkflow.ts`, change the apply receipt to:

```typescript
    receipt: {
      status: "done",
      label: "Applied change",
      detail: `Updated ${filePath} with previewed Markdown replacement.`,
      path: filePath
    }
```

Change `createRevertedReceipt` to:

```typescript
function createRevertedReceipt(filePath: string): ActionReceipt {
  return {
    status: "reverted",
    label: "Reverted change",
    detail: `Reverted previewed Markdown replacement in ${filePath}.`,
    path: filePath
  };
}
```

- [ ] **Step 7: Run safe action tests**

Run:

```powershell
node scripts/run-tests.mjs tests/currentNoteUpdateWorkflow.test.ts tests/diffPreviewWorkflow.test.ts tests/diffPreviewActionController.test.ts
```

Expected: all pass.

- [ ] **Step 8: Commit preview-first safe actions**

Run:

```powershell
git add src/notes/currentNoteUpdateWorkflow.ts tests/currentNoteUpdateWorkflow.test.ts src/diff/diffPreviewWorkflow.ts tests/diffPreviewWorkflow.test.ts src/views/controllers/DiffPreviewActionController.ts tests/diffPreviewActionController.test.ts
git commit -m "fix: make markdown edits visibly preview-first"
```

Expected: one commit. If `DiffPreviewActionController` and its test did not require changes, omit them from `git add`.

---

## Task 7: First-Value Integration Scenario

**Files:**
- Create: `tests/firstValueFlowScenarios.test.ts`
- Read: `src/views/suggestionCardsRenderer.ts`
- Read: `src/resolver/openFileResolution.ts`
- Read: `src/chat/autoWebContextBuilder.ts`
- Read: `src/chat/userMessageRequestContext.ts`
- Read: `src/notes/currentNoteUpdateWorkflow.ts`

- [ ] **Step 1: Create integration-style scenario test**

Create `tests/firstValueFlowScenarios.test.ts` with:

```typescript
import assert from "node:assert/strict";

import { buildAutoWebContext } from "../src/chat/autoWebContextBuilder";
import { buildUserMessageRequestContext } from "../src/chat/userMessageRequestContext";
import { resolveOpenFileTarget } from "../src/resolver/openFileResolution";
import { prepareCurrentNoteUpdatePreview } from "../src/notes/currentNoteUpdateWorkflow";
import { getSuggestionCards } from "../src/views/suggestionCardsRenderer";
import { DEFAULT_SETTINGS, type CurrentNoteContext, type VaultSearchResult } from "../src/types";

const activeNote: CurrentNoteContext = {
  path: "Drafts/Mindo Rough Draft.md",
  name: "Mindo Rough Draft.md",
  content: "# Mindo\n\nrough idea",
  isTruncated: false,
  originalLength: 19,
  includedLength: 19
};

const vaultResult: VaultSearchResult = {
  path: "Proton/Qore Systems Strategy.md",
  title: "Qore Systems Strategy",
  score: 120,
  snippet: "Strategy source"
};

{
  const cards = getSuggestionCards("en");
  assert.deepEqual(
    cards.map((card) => card.id),
    ["vault-recall", "connect-note", "improve-draft"]
  );
}

{
  const resolution = resolveOpenFileTarget({
    paths: [
      "Proton/Qore Systems Cases.md",
      "Proton/Qore Systems Strategy.md"
    ],
    query: "qore systems",
    ambiguityGap: 9999
  });

  assert.equal(resolution.kind, "clarify");
}

{
  let searchedWeb = false;
  const context = await buildAutoWebContext({
    userRequest: "Find qore systems strategy in my vault",
    context: null,
    settings: {
      webSearchEnabled: true
    },
    isLocalOnlyCommandText: () => false,
    planContextWorkflow: () => ({
      requiresWeb: false,
      reason: "not needed"
    }),
    decideAutoWebResearch: () => ({
      query: "qore systems strategy",
      reason: "should be skipped"
    }),
    buildAutoWebResearchQuery: () => "qore systems strategy",
    rewriteWebResearchQuery: async (query) => query,
    searchWeb: async () => {
      searchedWeb = true;
      return {
        provider: "duckduckgo",
        results: []
      };
    }
  });

  assert.equal(context, null);
  assert.equal(searchedWeb, false);
}

{
  const requestContext = await buildUserMessageRequestContext({
    content: "Find qore systems strategy in my vault",
    useCurrentNote: true,
    useVaultSearch: true,
    outgoingAttachments: null,
    attachedVaultResults: null,
    readCurrentNoteContext: async () => ({ context: activeNote }),
    expandSemanticVaultQuery: async () => ["qore systems strategy"],
    searchSemanticVault: async () => [vaultResult]
  });

  assert.equal(requestContext.context?.currentNote?.path, activeNote.path);
  assert.deepEqual(requestContext.context?.vaultResults, [vaultResult]);
}

{
  const result = await prepareCurrentNoteUpdatePreview({
    settings: DEFAULT_SETTINGS,
    note: {
      path: activeNote.path,
      name: activeNote.name,
      content: activeNote.content
    },
    userPrompt: "Make this draft clearer",
    attachedFiles: null,
    messageIndex: 0,
    createdAt: 123,
    readProjectMemoryContext: async () => null,
    buildAutoWebContextForRequest: async () => null,
    formatAutoWebContextForPrompt: () => "",
    formatProjectMemoryForPrompt: () => "",
    cleanReplacement: (text) => text.trim(),
    stripSpeechHints: (text) => text,
    requestLlmChatCompletion: async () => "# Mindo\n\nA clearer idea."
  });

  assert.equal(result.assistantMessage.diffPreview?.status, "pending");
  assert.equal(result.assistantMessage.diffPreview?.sourcePath, activeNote.path);
}

console.log("firstValueFlowScenarios tests passed");
```

- [ ] **Step 2: Run scenario test**

Run:

```powershell
node scripts/run-tests.mjs tests/firstValueFlowScenarios.test.ts
```

Expected: PASS after Tasks 1-6 are complete.

- [ ] **Step 3: Run the first-value focused suite**

Run:

```powershell
node scripts/run-tests.mjs tests/firstValueFlowScenarios.test.ts tests/openFileResolution.test.ts tests/openFileCommandController.test.ts tests/vaultFileOpenController.test.ts tests/autoWebGuards.test.ts tests/autoWebContextBuilder.test.ts tests/userMessageRequestContext.test.ts tests/suggestionCardsRenderer.test.ts tests/currentNoteUpdateWorkflow.test.ts tests/diffPreviewWorkflow.test.ts tests/assistantMessageAnnotations.test.ts tests/chatRequestContext.test.ts tests/sourceReferences.test.ts
```

Expected: all pass.

- [ ] **Step 4: Commit first-value scenario coverage**

Run:

```powershell
git add tests/firstValueFlowScenarios.test.ts
git commit -m "test: cover first value flow scenario"
```

Expected: one commit.

---

## Task 8: Full Verification And Release Check

**Files:**
- Read: `package.json`
- Read: `docs/testing/first-value-flow-smoke.md`
- Verify: generated build outputs may change through standard build scripts

- [ ] **Step 1: Run full verify**

Run:

```powershell
npm run verify
```

Expected: build passes, full JS test suite passes, Rust core tests pass, bundle budget test passes.

- [ ] **Step 2: Run package check**

Run:

```powershell
node scripts/package-plugin.mjs --check
```

Expected: release package check passes.

- [ ] **Step 3: Inspect generated changes**

Run:

```powershell
git status --short
```

Expected: either no generated changes, or only expected build artifacts from the repo's standard build path.

- [ ] **Step 4: Commit generated release artifacts only if they changed**

If `git status --short` shows tracked generated files that are part of normal release output, run:

```powershell
git add main.js styles.css manifest.json versions.json
git commit -m "build: update plugin bundle"
```

Expected: commit exists only when tracked generated release files changed. If no files changed, skip this step and do not create an empty commit.

- [ ] **Step 5: Manual Obsidian smoke**

Run through `docs/testing/first-value-flow-smoke.md` in Obsidian.

Expected:

- Starter prompts focus on vault recall, note connections, and draft improvement.
- Active-note question shows vault/local source context and no unrelated web panel.
- Ambiguous Qore note request asks for clarification instead of opening the active file.
- Draft improvement produces a pending diff preview before applying changes.
- Apply receipt names the target note.

- [ ] **Step 6: Final implementation summary**

Prepare a short summary with:

- commits created,
- focused tests run,
- full verification result,
- package check result,
- manual smoke result or reason it was not run.

Do not claim the manual smoke passed unless it was actually performed inside Obsidian.

---

## Subagent Ownership Model

Use a fresh worker per task. Each worker must be told:

- You are not alone in the codebase.
- Do not revert edits made by other workers.
- Own only the files listed in the task.
- Edit files directly in your forked workspace.
- Run the focused tests listed in the task.
- Commit only that task's files with the planned commit message.
- Report changed files, test commands, and commit hash.

Recommended dispatch order:

1. Task 0 locally in the parent session.
2. Task 1 worker.
3. Parent reviews Task 1 diff and tests.
4. Task 2 worker.
5. Parent reviews Task 2 diff and tests.
6. Continue one task at a time through Task 7.
7. Task 8 locally in the parent session.

Do not parallelize Tasks 1-7 because they build on each other and touch overlapping tests/types.

---

## Self-Review

- Spec coverage:
  - Empty/new chat starter prompts: Task 4.
  - Vault-local question routing: Task 3.
  - Fuzzy file resolution and clarification: Tasks 1 and 2.
  - Source-first answer metadata: Task 5.
  - Preview-first Markdown actions: Task 6.
  - Integration scenario and manual smoke: Tasks 7 and 8.
- Placeholder scan:
  - No placeholder markers or empty "add tests" instructions are present.
- Type consistency:
  - `OpenFileResolution.kind` values are `direct`, `clarify`, and `none` across Tasks 1, 2, and 7.
  - `ActionReceipt.status` adds `needs_confirmation` consistently in `src/types.ts`, `src/chat/chatMessages.ts`, and controller tests.
  - Starter prompt IDs are `vault-recall`, `connect-note`, and `improve-draft` across `src/views/noteActions.ts`, `src/i18n.ts`, and tests.
- Scope check:
  - The plan does not require voice, Rust sidecar changes, a broad sidebar redesign, or Mindo Wiki expansion.
