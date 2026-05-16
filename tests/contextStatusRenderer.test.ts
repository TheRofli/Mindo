import assert from "node:assert/strict";

import {
  ContextStatusRenderer,
  getContextStatusViewState
} from "../src/views/contextStatusRenderer";

type FakeEl = {
  text: string;
  classes: Set<string>;
  setText(value: string): void;
  toggleClass(name: string, enabled: boolean): void;
};

const el = (): FakeEl => ({
  text: "",
  classes: new Set<string>(),
  setText(value: string) {
    this.text = value;
  },
  toggleClass(name: string, enabled: boolean) {
    if (enabled) {
      this.classes.add(name);
    } else {
      this.classes.delete(name);
    }
  }
});

{
  const state = getContextStatusViewState({
    useCurrentNote: true,
    noteLabel: "Obsidian/Test.md",
    activeNoteText: "Active note",
    noActiveNoteText: "No active note"
  });

  assert.equal(state.pillText, "Obsidian/Test.md");
  assert.equal(state.statusText, "Context: Current note ON");
  assert.equal(state.detailText, "Active note: Obsidian/Test.md");
  assert.equal(state.detailWarning, false);
}

{
  const state = getContextStatusViewState({
    useCurrentNote: false,
    noteLabel: "Obsidian/Test.md",
    activeNoteText: "Active note",
    noActiveNoteText: "No active note"
  });

  assert.equal(state.pillText, "Obsidian/Test.md");
  assert.equal(state.statusText, "Context: Current note OFF");
  assert.equal(state.detailText, null);
  assert.equal(state.detailWarning, false);
}

{
  const state = getContextStatusViewState({
    useCurrentNote: true,
    noteLabel: null,
    activeNoteText: "Active note",
    noActiveNoteText: "No active note"
  });

  assert.equal(state.pillText, "Active note");
  assert.equal(state.detailText, "No active note");
  assert.equal(state.detailWarning, true);
}

{
  const currentNotePillTextEl = el();
  const contextStatusEl = el();
  const contextDetailEl = el();

  new ContextStatusRenderer().render(
    {
      currentNotePillTextEl,
      contextStatusEl,
      contextDetailEl
    },
    {
      useCurrentNote: true,
      noteLabel: null,
      activeNoteText: "Active note",
      noActiveNoteText: "No active note"
    }
  );

  assert.equal(currentNotePillTextEl.text, "Active note");
  assert.equal(contextStatusEl.text, "Context: Current note ON");
  assert.equal(contextDetailEl.text, "No active note");
  assert.equal(contextDetailEl.classes.has("contex-agent__hidden"), false);
  assert.equal(contextDetailEl.classes.has("contex-agent__context-detail--warning"), true);
}

console.log("contextStatusRenderer tests passed");
