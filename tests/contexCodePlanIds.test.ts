import assert from "node:assert/strict";
import {
  createPlanId,
  createTaskId,
  derivePlanTitle,
  slugifyContexCodeIdPart,
} from "../src/contexCode/planIds";

assert.equal(derivePlanTitle("Создай файл с анекдотами в папке Test"), "Анекдоты");
assert.equal(derivePlanTitle("Создай в текущей папке файл План теста"), "План теста");
assert.equal(derivePlanTitle("Create a note about local RAG in folder Projects"), "Local RAG");
assert.equal(derivePlanTitle("создай заметку \"Contex Voice Flow\" в папке Obsidian"), "Contex Voice Flow");
assert.equal(derivePlanTitle("создай в папке Obsidian файл, план, точнее план для Contex Agent"), "План для Contex Agent");

assert.equal(slugifyContexCodeIdPart("Contex Voice Flow"), "contex_voice_flow");
assert.equal(createPlanId("Contex Voice Flow", "2026-05-10T12:00:00.000Z"), "ccp_20260510_contex_voice_flow");
assert.equal(createTaskId(2, 3, "VAD auto-stop"), "task_2_3_vad_auto_stop");

console.log("contexCodePlanIds tests passed");
