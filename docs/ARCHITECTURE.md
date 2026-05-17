# Mindo Architecture

Mindo is a desktop-only Obsidian plugin for talking to a local vault. The public Community Plugin install is intentionally small: `manifest.json`, `main.js`, and `styles.css` must be enough to load the plugin UI and use remote or OpenAI-compatible chat endpoints.

## Core Runtime

- `src/main.ts` owns plugin startup, settings, commands, view registration, and helper process lifecycle.
- `src/views` renders the Mindo sidebar, chat surface, local command receipts, Wiki controls, and embedded runtime visual assets.
- `src/router`, `src/actions`, and `src/workflows` classify requests, plan vault actions, execute them through guarded Obsidian APIs, and report what happened.
- `src/rag`, `src/search`, and `src/sources` gather vault, web, and file context for answers with references.
- `src/wiki` maintains Mindo Wiki memory files and repair helpers inside the user's vault.
- `src/voice` coordinates optional local STT/TTS helper processes.
- `src/rustCore` integrates the optional `contex-core` sidecar for faster search and indexing.

## Install Modes

Community Plugin installs use only `manifest.json`, `main.js`, and `styles.css`. Runtime images and fonts are embedded so the plugin does not depend on extra asset files for first launch.

Full local runtime installs can add `tools/stt_server`, `tools/tts_server`, and an optional generated `bin/contex-core.exe` or platform-specific `bin/contex-core`. These files are packaged when present, but the generated sidecar binary is not tracked in Git.

## Release Boundary

Local settings, API keys, downloaded models, cache folders, Rust build output, and generated binaries stay outside source control. `npm run release:check` verifies the Community install assets, version metadata, and release packaging policy before publishing.
