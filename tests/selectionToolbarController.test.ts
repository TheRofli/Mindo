import assert from "node:assert/strict";
import { SelectionToolbarController } from "../src/views/controllers/SelectionToolbarController";

function createToolbarEl(): HTMLElement {
  const classes = new Set<string>();
  const style: Record<string, string> = {};
  return {
    style,
    removeCalled: false,
    remove() {
      this.removeCalled = true;
    },
    addClass(className: string) {
      classes.add(className);
    },
    removeClass(className: string) {
      classes.delete(className);
    },
    toggleClass(className: string, enabled: boolean) {
      this.lastToggle = { className, enabled };
      if (enabled) {
        classes.add(className);
      } else {
        classes.delete(className);
      }
    },
    hasClass(className: string) {
      return classes.has(className);
    },
    setCssStyles(styles: Record<string, string>) {
      Object.assign(style, styles);
    }
  } as unknown as HTMLElement;
}

function createController(options: {
  rect?: DOMRect | null;
  context?: { text: string } | null;
  isLoading?: boolean;
} = {}) {
  const toolbarEl = createToolbarEl();
  const button = {} as HTMLButtonElement;
  const state = {
    floating: undefined as unknown,
    last: undefined as unknown,
    lastAt: 0,
    timerCallback: null as null | (() => void),
    clearedTimer: null as null | number
  };

  const controller = new SelectionToolbarController({
    renderToolbar: () => ({ toolbarEl, buttons: [button] }),
    getIsLoading: () => options.isLoading ?? false,
    getSelectionRange: () => ({} as Range),
    getSelectionRect: () =>
      options.rect !== undefined
        ? options.rect
        : ({ left: 40, width: 20, top: 80, bottom: 96 } as DOMRect),
    getSelectedTextContext: () => ({
      context: options.context === undefined ? ({ text: "selected" } as never) : (options.context as never)
    }),
    setFloatingSelectedTextContext: (context) => {
      state.floating = context;
    },
    setLastSelectedTextContext: (context) => {
      state.last = context;
    },
    setLastSelectedTextContextAt: (value) => {
      state.lastAt = value;
    },
    now: () => 1234,
    getViewportWidth: () => 300,
    setTimeout: (callback) => {
      state.timerCallback = callback;
      return 7;
    },
    clearTimeout: (timerId) => {
      state.clearedTimer = timerId;
    }
  });

  return { controller, toolbarEl, button, state };
}

{
  const { controller, toolbarEl, button, state } = createController();

  controller.create();
  assert.equal(controller.getToolbarElement(), toolbarEl);
  assert.deepEqual(controller.getButtons(), [button]);

  controller.update();

  assert.equal(state.floating, state.last);
  assert.deepEqual(state.last, { text: "selected" });
  assert.equal(state.lastAt, 1234);
  assert.equal(toolbarEl.style.left, "50px");
  assert.equal(toolbarEl.style.top, "72px");
  assert.equal(
    (toolbarEl as unknown as { hasClass(className: string): boolean }).hasClass(
      "contex-agent__hidden"
    ),
    false
  );
}

{
  const { controller, toolbarEl, state } = createController({
    rect: null
  });

  controller.create();
  controller.update();

  assert.equal(
    (toolbarEl as unknown as { hasClass(className: string): boolean }).hasClass(
      "contex-agent__hidden"
    ),
    true
  );
  assert.equal(state.floating, null);
}

{
  const { controller, state } = createController();

  controller.queueUpdate();
  controller.queueUpdate();

  assert.equal(state.clearedTimer, 7);
  state.timerCallback?.();
  assert.equal(controller.getTimerId(), null);
}

{
  const { controller, toolbarEl } = createController();

  controller.create();
  controller.dispose();

  assert.equal((toolbarEl as unknown as { removeCalled: boolean }).removeCalled, true);
  assert.equal(controller.getToolbarElement(), null);
  assert.deepEqual(controller.getButtons(), []);
}

console.log("selectionToolbarController tests passed");
