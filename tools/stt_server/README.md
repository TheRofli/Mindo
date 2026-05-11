# Contex Local STT

This helper starts a local STT endpoint for the Obsidian plugin:

```text
http://127.0.0.1:9000/transcribe
```

Run from the plugin folder:

```powershell
npm run stt:start
```

The first run installs Python dependencies into the local STT runtime folder
and downloads the selected model when the first transcription happens. Installer
download caches are pruned after setup, while the active selected model cache is
kept for the next launch.

Supported backends:

- `parakeet` - default NVIDIA NeMo backend with `nvidia/parakeet-tdt-0.6b-v3`.
  This is a large first install, but it gives the best local voice-command quality.
- `faster-whisper` - lighter fallback backend for machines that cannot run Parakeet.

Optional environment variables:

```powershell
$env:CONTEX_STT_MODEL = "nvidia/parakeet-tdt-0.6b-v3"
$env:CONTEX_STT_BACKEND = "parakeet"
$env:CONTEX_STT_DEVICE = "cpu"
$env:CONTEX_STT_COMPUTE_TYPE = "int8"
$env:CONTEX_STT_LANGUAGE = "auto"
$env:CONTEX_STT_PORT = "9000"
$env:CONTEX_STT_HOME = "C:\tmp\contex-agent-stt"
$env:CONTEX_STT_PRELOAD_ON_START = "1"
```
