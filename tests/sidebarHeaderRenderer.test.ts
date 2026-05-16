import assert from "node:assert/strict";
import {
  getSidebarLogoAssets,
  getSidebarMetaClassNames
} from "../src/views/sidebarHeaderRenderer";

assert.deepEqual(getSidebarLogoAssets("Context"), [
  {
    fileName: "assets/logo.png",
    className: "contex-agent__logo",
    alt: "Context"
  }
]);

assert.deepEqual(getSidebarMetaClassNames(), {
  sttStatus: "contex-agent__stt-status",
  contextStatus: "contex-agent__context",
  contextDetail: "contex-agent__context-detail",
  status: "contex-agent__status",
  error: "contex-agent__error"
});

console.log("sidebarHeaderRenderer tests passed");
