import assert from "node:assert/strict";
import { makeContexCodePlan } from "./contexCodeTestUtils";
import {
  extractPlanIdFromBlock,
  findContexCodeBlock,
  renderContexCodeBlock,
  upsertContexCodeBlock,
} from "../src/contexCode/planBlock";

const emptyProgress = String.fromCharCode(0x2591).repeat(20);

const plan = makeContexCodePlan();
const block = renderContexCodeBlock(plan);
assert.match(block, /\[!contex-code\]\+ Mindo Code · 0\/2 · 0%/u);
assert.doesNotMatch(block, /\[!contex-code\]\+ Mindo Code \/ Test Plan/);
assert.doesNotMatch(block, new RegExp(`\\[!contex-code\\][^\\n]+${emptyProgress}`, "u"));
assert.match(block, /data-plan-id="ccp_20260510_test_plan"/);
assert.match(block, /Test Plan/);
assert.match(block, /Project/);
assert.match(block, /Status/);
assert.match(block, /Progress/);
assert.match(block, /0%/);
assert.match(block, /Now/);
assert.match(block, new RegExp(`${emptyProgress} \\| 0%`, "u"));
assert.doesNotMatch(block, new RegExp(`\\[${emptyProgress}\\]`, "u"));
assert.doesNotMatch(block, /`todo`|`run`/u);
assert.match(block, /> ▶ \*\*First task\*\*/u);
assert.match(block, /> - Second task/u);
assert.match(block, />   - □ Second task/u);
assert.equal(extractPlanIdFromBlock(block), plan.id);

const ruBlock = renderContexCodeBlock(plan, { language: "ru" });
assert.match(ruBlock, /\u0430\u043a\u0442\u0438\u0432\u0435\u043d/u);
assert.match(ruBlock, /\u0421\u0435\u0439\u0447\u0430\u0441/u);
assert.match(ruBlock, /\u0414\u0430\u043b\u044c\u0448\u0435/u);
assert.match(ruBlock, /\u041f\u043b\u0430\u043d/u);
assert.match(ruBlock, /\u041f\u0440\u043e\u0435\u043a\u0442/u);
assert.match(ruBlock, /\u0421\u0442\u0430\u0442\u0443\u0441/u);
assert.match(ruBlock, /\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441/u);

const basePhase = plan.phases[0]!;
const localizedPlan = makeContexCodePlan({
  phases: [
    {
      ...basePhase,
      displayTitle: "Фундамент",
      displaySummary: "Подготовить основу проекта.",
      tasks: [
        {
          ...basePhase.tasks[0]!,
          displayTitle: "Создать первый стабильный модуль",
          displaySummary: "Собрать базовый контракт.",
        },
        {
          ...basePhase.tasks[1]!,
          displayTitle: "Подготовить следующий шаг",
          displaySummary: "Продолжить реализацию.",
        },
      ],
    },
  ],
});
const localizedBlock = renderContexCodeBlock(localizedPlan, { language: "ru" });
assert.match(localizedBlock, /Фундамент/u);
assert.match(localizedBlock, /Создать первый стабильный модуль/u);
assert.match(localizedBlock, /Подготовить следующий шаг/u);
assert.doesNotMatch(localizedBlock, /First task|Second task/u);

const note = "# Test Plan\n\nBody text.";
const inserted = upsertContexCodeBlock(note, plan);
assert.match(inserted, /^# Test Plan\n\n> \[!contex-code\]\+/m);
assert.equal((inserted.match(/\[!contex-code\]/g) ?? []).length, 1);

const updated = upsertContexCodeBlock(inserted, { ...plan, title: "Updated Plan" });
assert.equal((updated.match(/\[!contex-code\]/g) ?? []).length, 1);
assert.match(updated, /Updated Plan/);
assert.equal(findContexCodeBlock(updated)?.planId, plan.id);

const legacy = [
  "<!-- contex-code:start id=\"legacy_plan\" -->",
  "> [!info] Mindo Code Plan",
  "> **Project:** Legacy",
  "<!-- contex-code:end -->",
].join("\n");
assert.equal(findContexCodeBlock(legacy)?.planId, "legacy_plan");

console.log("contexCodePlanBlock tests passed");
