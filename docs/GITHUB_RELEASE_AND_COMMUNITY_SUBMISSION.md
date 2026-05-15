# GitHub Release And Obsidian Community Submission

This document is the release path for Contex Agent.

## Important Reality Check

Obsidian Community Plugins are reviewed from GitHub. The public repository
must expose enough source code for review. If the goal is to publish in the
official Community Plugins catalog, do not assume a closed-source release-only
repository will pass review.

The practical protection model is:

- publish source that Obsidian can review;
- keep local secrets, caches, downloaded models, and user data out of GitHub;
- use the Contex Source Available License instead of MIT;
- split future proprietary services or hosted runtimes into a private backend
  if they must remain closed.

## Repository Checklist

Before pushing to GitHub:

- `manifest.json` exists in the repository root.
- `main.js`, `styles.css`, and `manifest.json` are produced by `npm run build`.
- `README.md`, `CHANGELOG.md`, `LICENSE`, and `versions.json` are present.
- `data.json` is not committed.
- `.contex-*`, `.venv-*`, `.python-stt`, `.cache`, `node_modules`, Rust
  `target`, downloaded model files, and release zips are not committed.
- `manifest.json`, `package.json`, and `versions.json` versions match.
- `manifest.json` has `"isDesktopOnly": true`.

## Local Release Commands

Run:

```bash
npm ci
npm run verify
npm run core:build
npm run core:install
npm run package
```

The clean release folder is:

```text
dist/contex-agent
```

## GitHub Release

Create a tag that exactly matches `manifest.json` -> `version`.
For version `0.1.0`, use `0.1.0`, not `v0.1.0`; the Obsidian submission bot
looks for a GitHub Release whose tag is exactly the manifest version.

```bash
git tag 0.1.0
git push origin 0.1.0
```

The `Release` workflow creates a GitHub release with:

- `manifest.json`
- `main.js`
- `styles.css`
- `contex-agent-X.Y.Z.zip`
- `contex-agent-release.json`

Open the release and manually inspect the assets before submitting to the
community plugin catalog.

## Obsidian Community Plugin Submission

After the GitHub repo and first release are ready:

1. Open the official `obsidianmd/obsidian-releases` repository.
2. Fork it.
3. Edit `community-plugins.json`.
4. Add an entry similar to:

   ```json
   {
     "id": "contex-agent",
     "name": "Contex Agent",
     "author": "Contex",
     "description": "Talk to your vault with local voice, RAG, Wiki memory, safe edits, and Contex Code.",
     "repo": "your-github-user/contex-agent"
   }
   ```

5. Open a pull request.
6. Answer review feedback.

The plugin id must match `manifest.json`.

## Manual Install Path

Until the community review is accepted, users can install manually:

1. Download the release zip.
2. Extract it to:

   ```text
   Vault/.obsidian/plugins/contex-agent
   ```

3. Restart Obsidian.
4. Enable `Contex Agent` under Community plugins.

## BRAT / Beta Path

For early testers, use BRAT with the GitHub repository. This is useful before
submitting to the official Community Plugins catalog.

## Release Notes Template

```markdown
## Contex Agent v0.1.0

Contex Agent is a local-first AI companion for Obsidian.

Highlights:
- active-note and vault-aware chat;
- local voice workflows;
- Contex Wiki memory;
- safe note creation and editing;
- real source references;
- Rust-accelerated search/RAG core;
- early Contex Code planning workflow.

Install:
Download `contex-agent-0.1.0.zip`, extract it to
`Vault/.obsidian/plugins/contex-agent`, then enable the plugin in Obsidian.
```
