import assert from "node:assert/strict";
import { SttStatusController } from "../src/views/controllers/SttStatusController";

function createStatusEl() {
  const classes = new Set<string>();
  return {
    text: "",
    classes,
    setText(text: string) {
      this.text = text;
    },
    removeClass(className: string) {
      classes.delete(className);
    },
    addClass(className: string) {
      classes.add(className);
    }
  } as unknown as HTMLElement & { text: string; classes: Set<string> };
}

{
  const statusEl = createStatusEl();
  const controller = new SttStatusController({
    getStatusEl: () => statusEl,
    isRecording: () => false,
    getLocalSttStatus: async () => ({
      autoStart: true,
      backend: "parakeet",
      endpoint: "http://127.0.0.1:9000/transcribe",
      isRunning: true,
      language: "auto",
      model: "parakeet-tdt-0.6b-v3"
    }),
    getErrorMessage: (error) => String(error)
  });

  await controller.refresh();

  assert.equal(
    statusEl.text,
    "STT: running (parakeet, parakeet-tdt-0.6b-v3, auto)"
  );
  assert.equal(statusEl.classes.has("contex-agent__stt-status--ok"), true);
}

{
  const statusEl = createStatusEl();
  const controller = new SttStatusController({
    getStatusEl: () => statusEl,
    isRecording: () => true,
    getLocalSttStatus: async () => {
      throw new Error("should not be called");
    },
    getErrorMessage: (error) => String(error)
  });

  await controller.refresh();

  assert.equal(statusEl.text, "");
}

{
  const statusEl = createStatusEl();
  const controller = new SttStatusController({
    getStatusEl: () => statusEl,
    isRecording: () => false,
    getLocalSttStatus: async () => {
      throw new Error("offline");
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error)
  });

  await controller.refresh();

  assert.equal(statusEl.text, "STT: unknown (offline)");
  assert.equal(
    statusEl.classes.has("contex-agent__stt-status--warning"),
    true
  );
}

console.log("sttStatusController tests passed");
