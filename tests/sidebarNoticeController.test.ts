import assert from "node:assert/strict";
import { SidebarNoticeController } from "../src/views/controllers/SidebarNoticeController";

function createEl() {
  const classes = new Set<string>();
  return {
    text: "",
    classes,
    setText(text: string) {
      this.text = text;
    },
    toggleClass(className: string, enabled: boolean) {
      if (enabled) {
        classes.add(className);
      } else {
        classes.delete(className);
      }
    }
  } as unknown as HTMLElement & {
    text: string;
    classes: Set<string>;
  };
}

{
  const errorEl = createEl();
  const controller = new SidebarNoticeController({
    getContextDetailEl: () => null,
    getErrorEl: () => errorEl
  });

  controller.setError("Boom");

  assert.equal(errorEl.text, "Boom");
  assert.equal(errorEl.classes.has("contex-agent__hidden"), false);

  controller.setError(null);

  assert.equal(errorEl.text, "");
  assert.equal(errorEl.classes.has("contex-agent__hidden"), true);
}

{
  const contextDetailEl = createEl();
  const controller = new SidebarNoticeController({
    getContextDetailEl: () => contextDetailEl,
    getErrorEl: () => null
  });

  controller.setContextDetail("Current note was truncated", true);

  assert.equal(contextDetailEl.text, "Current note was truncated");
  assert.equal(contextDetailEl.classes.has("contex-agent__hidden"), false);
  assert.equal(
    contextDetailEl.classes.has("contex-agent__context-detail--warning"),
    true
  );

  controller.setContextDetail(null, false);

  assert.equal(contextDetailEl.text, "");
  assert.equal(contextDetailEl.classes.has("contex-agent__hidden"), true);
  assert.equal(
    contextDetailEl.classes.has("contex-agent__context-detail--warning"),
    false
  );
}

console.log("sidebarNoticeController tests passed");
