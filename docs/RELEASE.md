# Release Checklist

Use this checklist before publishing Mindo to GitHub or preparing an Obsidian plugin release.

For the full GitHub and Obsidian Community Plugin path, read:

`docs/GITHUB_RELEASE_AND_COMMUNITY_SUBMISSION.md`

For security and source-visibility rules, read:

`docs/PUBLICATION_SECURITY.md`

## 1. Clean Local Secrets

- Do not publish `data.json`.
- Do not publish `.contex-*`, `.venv-*`, `.python-stt`, `.cache`, `node_modules`, or Rust `target`.
- Use `data.example.json` for safe sample settings.

## 2. Verify

Run:

```bash
npm run verify
```

This runs:

- TypeScript unit tests
- Rust core tests
- Production plugin build

## 3. Package

Run:

```bash
npm run package
```

The clean output is:

`dist/mindo`

The package manifest with hashes is:

`dist/mindo-release.json`

## 4. Obsidian Manual Release Files

### Community Plugin Install

Required for the public Community Plugin install:

- `manifest.json`
- `main.js`
- `styles.css`

Runtime logo and font assets are embedded in `main.js`, so the Community
install must not depend on extra asset files.

### Full Local Runtime Install

Recommended for full local-first features when available:

- `tools/stt_server`
- `tools/tts_server`
- optional `bin/contex-core.exe` on Windows, or platform-specific `bin/contex-core`

The `contex-core` sidecar is generated locally by the Rust build/install flow.
It may be copied into release packages when present, but it is not tracked in
Git.

## 5. Version Bump

Keep these in sync:

- `package.json`
- `manifest.json`
- `versions.json`

`scripts/package-plugin.mjs --check` fails if versions are inconsistent.

## 6. GitHub Release

Attach the contents of `dist/mindo` or a zip created from that folder.

Do not attach local `data.json`.

The recommended release path is to push a tag that exactly matches
`manifest.json` -> `version`, for example `0.2.4`, and let
`.github/workflows/release.yml` create the GitHub release.

For Obsidian Community Plugin submission, do not use only a `vX.Y.Z` release:
the review bot expects a release tag matching the manifest version exactly.
