import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../src/types";
import { isSttHealthCompatible } from "../src/voice/sttHealth";

assert.equal(
  isSttHealthCompatible(
    {
      ...DEFAULT_SETTINGS,
      sttBackend: "faster-whisper",
      sttModel: "medium"
    },
    {
      status: "ok",
      backend: "faster-whisper",
      model: "medium"
    }
  ),
  true
);

assert.equal(
  isSttHealthCompatible(
    {
      ...DEFAULT_SETTINGS,
      sttBackend: "parakeet",
      sttModel: "nvidia/parakeet-tdt-0.6b-v3"
    },
    {
      status: "ok",
      backend: "faster-whisper",
      model: "medium"
    }
  ),
  false
);

assert.equal(
  isSttHealthCompatible(
    {
      ...DEFAULT_SETTINGS,
      sttBackend: "parakeet",
      sttModel: "nvidia/parakeet-tdt-0.6b-v3"
    },
    {
      status: "ok",
      backend: "parakeet",
      model: "nvidia/parakeet-tdt-0.6b-v3"
    }
  ),
  true
);

assert.equal(
  isSttHealthCompatible(
    {
      ...DEFAULT_SETTINGS,
      sttBackend: "faster-whisper",
      sttModel: "small"
    },
    {
      status: "ok",
      model: "small"
    }
  ),
  true
);

console.log("sttHealth tests passed");
