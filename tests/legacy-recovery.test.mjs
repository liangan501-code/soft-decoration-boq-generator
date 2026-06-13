import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync("src/app.js", "utf8");
const html = readFileSync("index.html", "utf8");

test("startup scans known and keyword-matched legacy storage keys before defaulting", () => {
  for (const key of [
    "maison-boq-state-v1",
    "maison-boq-state",
    "boq-state",
    "projects",
    "currentProject",
    "maison-projects",
    "soft-decoration-boq",
  ]) {
    assert.match(app, new RegExp(key));
  }
  assert.match(app, /LEGACY_KEY_PATTERN = \/\(boq\|maison\|project\|soft\|decor\)\/i/);
  assert.match(app, /scanStorageSnapshots\(\)/);
  assert.match(app, /getCandidateStorageKeys\(\)/);
  assert.match(app, /localStorage\.key\(index\)/);
  assert.match(app, /scanIndexedDbSnapshots/);
  assert.match(app, /indexedDB\.databases\(\)/);
  assert.match(app, /readAllFromIndexedDbStore/);
  assert.match(app, /if \(legacySnapshots\.length\)/);
  assert.match(app, /isSampleOnlyWorkspace/);
});

test("legacy project and item fields migrate to version 6 shape", () => {
  assert.match(app, /CURRENT_DATA_VERSION = 6/);
  assert.match(app, /version: CURRENT_DATA_VERSION/);
  assert.match(app, /projectSubType: projectSubtype/);
  assert.match(app, /floorPlans: normalizeAttachmentList\(project\.floorPlans \|\| project\.attachments\?\.floorPlans\)/);
  assert.match(app, /renderings: normalizeAttachmentList\(project\.renderings \|\| project\.attachments\?\.renderings\)/);
  assert.match(app, /item\.productName \|\| item\.name/);
  assert.match(app, /item\.size \|\| item\.specs \|\| item\.spec/);
  assert.match(app, /item\.materialSuggestion \|\| item\.materialDescription/);
  assert.match(app, /item\.unitPrice \|\| item\.suggestedPrice/);
  assert.match(app, /item\.clientNote \|\| item\.customerNote \|\| item\.internalNote/);
});

test("data recovery center supports restore, merge, skip and safe duplicate names", () => {
  assert.match(html, /id="legacyRecoveryBtn"/);
  assert.match(html, /恢复旧版本数据/);
  assert.match(html, /id="legacyRecoveryDialog"/);
  assert.match(app, /openLegacyRecoveryCenter/);
  assert.match(app, /renderLegacyRecoveryCenter/);
  assert.match(app, /data-legacy-action="merge"/);
  assert.match(app, /data-legacy-action="restore"/);
  assert.match(app, /data-legacy-action="skip"/);
  assert.match(app, /createRecoveredProjectName/);
  assert.match(app, /（恢复版）/);
});

test("backup import/export and sample restore prefer non-destructive recovery", () => {
  assert.match(app, /exportedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(app, /imageDatabase: IMAGE_DB_NAME/);
  assert.match(app, /点击“确定”=合并到当前项目列表/);
  assert.match(app, /mergeRecoveredWorkspace\(nextWorkspace\)/);
  assert.match(app, /确认覆盖当前所有项目/);
  assert.match(app, /该操作可能覆盖当前项目，请先导出备份/);
});
