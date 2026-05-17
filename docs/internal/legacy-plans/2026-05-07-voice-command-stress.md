# Voice Command Stress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repeatable stress suite for thousands of noisy voice commands and harden the command routing paths it exposes.

**Architecture:** Keep the stress harness at the TypeScript behavior layer so it exercises the same resolver/parser modules used by the plugin. Add a shared voice-command noise normalizer only for command grammar mistakes, then use existing semantic/router logic for intent and vault candidate selection.

**Tech Stack:** TypeScript, Node assert tests, existing `scripts/run-tests.mjs` bundler, Obsidian plugin source modules.

---

### Task 1: Mass Voice Stress Harness

**Files:**
- Create: `tests/voiceCommandStress.test.ts`
- Modify: `scripts/run-tests.mjs`

- [ ] Write a test that generates 5,000+ open-file voice variants across Russian, English, STT-noisy folder markers, punctuation, polite filler, and ambiguous duplicate filenames.
- [ ] Add replacement phrase tests for `replace`, `change`, `поменяй`, `убери ... поставь вместо`, and `вместо ... напиши`.
- [ ] Add local-action tests for undo/read/stop-speaking phrases so they do not fall back to normal chat.
- [ ] Register the new test in `scripts/run-tests.mjs`.
- [ ] Run `npm run test` and verify the new test fails before implementation.

### Task 2: Shared Voice Command Noise Normalization

**Files:**
- Create: `src/voice/speechNoise.ts`
- Modify: `src/resolver/openFileResolver.ts`
- Modify: `src/tools/localCommandRouter.ts`

- [ ] Normalize common STT damage in command grammar, such as `вапке`, `вапки`, `падке`, `впапке`, and `в парке` to the folder-clause form.
- [ ] Normalize polite/filler noise in open-file queries, including `открываем не мила ноут` where `не` is likely a damaged `мне`.
- [ ] Use the shared normalizer before folder extraction in both resolver and local command folder preservation.
- [ ] Re-run the stress test and keep fixes scoped to command grammar, not user-specific folder dictionaries.

### Task 3: Replacement Phrase Coverage

**Files:**
- Modify: `src/tools/actionPlanCompletion.ts`

- [ ] Extend the replacement parser to understand `убери OLD и поставь вместо него NEW`.
- [ ] Extend the replacement parser to understand `вместо OLD напиши NEW`.
- [ ] Preserve existing hyphen cleanup so `Я-гений` matches note text `Я гений`.
- [ ] Re-run existing and stress tests.

### Task 4: Verification

**Files:**
- No source edits expected.

- [ ] Run `npm run test`.
- [ ] Run `npm run verify`.
- [ ] Report the number of generated voice scenarios and any remaining manual risks.
