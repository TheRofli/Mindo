import assert from "node:assert/strict";
import {
  getLiveDialogueSurfaceAttributes,
  getLiveDialogueSurfaceDefaultPhase
} from "../src/views/liveDialogueSurfaceMarkupRenderer";

assert.deepEqual(getLiveDialogueSurfaceAttributes(), {
  "aria-hidden": "true",
  "aria-live": "polite"
});

assert.equal(getLiveDialogueSurfaceDefaultPhase(), "Live Dialogue");

console.log("liveDialogueSurfaceMarkupRenderer tests passed");
