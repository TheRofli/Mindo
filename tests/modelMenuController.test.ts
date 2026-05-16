import assert from "node:assert/strict";
import { ModelMenuController } from "../src/views/controllers/ModelMenuController";
import type { LlmModelProfile } from "../src/types";

const profiles: LlmModelProfile[] = [
  {
    id: "local",
    name: "Local",
    baseUrl: "http://127.0.0.1:1234",
    apiKey: "",
    model: "local-model",
    temperature: 0.6,
    supportsVision: false
  },
  {
    id: "remote",
    name: "Remote",
    baseUrl: "https://example.com",
    apiKey: "key",
    model: "remote-model",
    temperature: 0.3,
    supportsVision: true
  }
];

function createElement() {
  const children = new Set<unknown>();
  return {
    style: { display: "none" },
    addChild(child: unknown) {
      children.add(child);
    },
    contains(target: unknown) {
      return target === this || children.has(target);
    }
  } as unknown as HTMLElement & { addChild(child: unknown): void };
}

{
  const parentEl = createElement();
  const menuEl = createElement();
  const child = {};
  menuEl.addChild(child);
  const refreshed: Array<{ active: string; count: number }> = [];
  let toggled: HTMLElement | null = null;
  let closed: HTMLElement | null = null;
  const controller = new ModelMenuController({
    getProfiles: () => profiles,
    getActiveProfile: () => profiles[1],
    renderMenu: (parent) => {
      assert.equal(parent, parentEl);
      return menuEl;
    },
    refreshMenu: (input) => {
      refreshed.push({
        active: input.activeProfile.id,
        count: input.profiles.length
      });
    },
    toggleMenu: (element) => {
      toggled = element;
    },
    closeMenu: (element) => {
      closed = element;
    }
  });

  controller.render(parentEl);
  assert.deepEqual(refreshed, [{ active: "remote", count: 2 }]);
  assert.equal(controller.contains(child as Node), true);
  assert.equal(controller.contains({} as Node), false);

  controller.toggle();
  assert.equal(toggled, menuEl);
  assert.deepEqual(refreshed, [
    { active: "remote", count: 2 },
    { active: "remote", count: 2 }
  ]);

  controller.close();
  assert.equal(closed, menuEl);
}

console.log("modelMenuController tests passed");
