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
