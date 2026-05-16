# Publication Security

Use this checklist before making the repository public.

## Never Publish

- `data.json`
- API keys
- `.env` files
- local vault content
- downloaded model weights
- `.mindo-*` and legacy `.contex-*` runtime folders
- `.venv-*`, `.python-stt`, `.cache`, `node_modules`
- Rust `target`
- debug logs that include local paths or user note contents

## Source Visibility Strategy

For official Obsidian Community Plugin submission, the source repository must
be reviewable. Mindo is published as an MIT-licensed source repository so
reviewers and users can inspect the behavior clearly.

Recommended public/private split:

- Public:
  - plugin UI source;
  - Obsidian integration code;
  - tests;
  - release packaging;
  - docs;
  - non-secret runtime launchers.
- Private or future hosted service:
  - paid hosted inference;
  - proprietary prompt packs;
  - private analytics or licensing service;
  - commercial deployment automation.

## License Position

Mindo uses the MIT license:

- users may download, install, run, inspect, modify, and redistribute it;
- the license is recognized by GitHub and Obsidian review tooling;
- the Mindo name, logo, and product identity should still be handled with care
  as project branding.

This is not legal advice. Before a serious public launch, have a lawyer review
the license text.

## GitHub Repo Setup

Recommended repository settings:

- Disable "Allow forking" if you use a private repo for development.
- For the public repo, keep branch protection on `main`.
- Require the `Verify` workflow before merging.
- Use GitHub release drafts.
- Use Dependabot only for dev dependencies you are ready to update.
- Do not store API keys in repository secrets unless a workflow needs them.

## Runtime Permission Notes

The plugin intentionally uses Node desktop APIs:

- `child_process` starts the bundled PowerShell launchers for local STT/TTS
  services and the optional Rust `contex-core` sidecar.
- filesystem access is used for packaged runtime files, release packaging,
  local helper logs, and sidecar discovery.
- runtime helper scripts may use environment variables for local model/cache
  directories, but the main plugin code avoids reading hostname/user profile
  identity data directly.

Keep this section aligned with the code before each community release so users
can understand why Obsidian's automated review flags these capabilities.

## Pre-Publish Command

```bash
npm run release:check
npm run package
```

Then inspect:

```text
dist/mindo
dist/mindo-release.json
```
