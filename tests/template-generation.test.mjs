import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("template generator contains explicit style-specific living room product names", () => {
  for (const name of [
    "中古胡桃木框架沙发",
    "胡桃木茶几",
    "中古皮革休闲椅",
    "中古感羊毛地毯",
    "复古金属落地灯",
    "胡桃木边几",
    "抽象肌理装饰画",
    "奶油柔模块沙发",
    "奶油羊毛地毯",
    "奶油系弧形茶几",
    "金属线条沙发",
    "岩板茶几",
    "轻奢金属吊灯",
    "法式雕花边几",
    "法式弧形沙发",
    "雅奢大理石茶几",
    "藤编休闲椅",
    "黑金皮革沙发",
  ]) {
    assert.match(source, new RegExp(name), `${name} should be available to generated templates`);
  }
});

test("current-space generation asks whether to replace append or cancel existing items", () => {
  assert.match(source, /requestTemplateConflictAction/);
  assert.match(source, /当前空间/);
  assert.match(source, /替换/);
  assert.match(source, /追加/);
  assert.match(source, /取消/);
  assert.match(source, /state\.items\.filter\(\(item\) => !replaceSpaces\.has\(item\.space\)\)/);
});

test("all-spaces generation uses the selected style for every generated space", () => {
  assert.match(source, /const style = elements\.templateStyleInput\.value;/);
  assert.match(source, /spaces\.flatMap\(\(space\) => generateItemsForSpaceAndStyle\(space, style\)\)/);
});


test("generation uses explicit BOQ_TEMPLATES and preserves replacement position", () => {
  assert.match(source, /const BOQ_TEMPLATES = {/);
  assert.match(source, /function generateItemsForSpaceAndStyle\(space, style\)/);
  assert.match(source, /BOQ_TEMPLATES\[style\]\?\.\[space\]/);
  assert.match(source, /function replaceItemsForSpaces\(generatedItems, replaceSpaces\)/);
  assert.match(source, /function validateGeneratedTemplateResult\(spaces, style\)/);
  assert.match(source, /firstLivingRoomItem\?\.name\.includes\("中古胡桃木框架沙发"\)/);
  assert.match(source, /firstReplaceIndex/);
  assert.match(source, /existingItems\.slice\(0, insertIndex\)/);
});

test("mid-century living room template cannot fall back to cream sofa", () => {
  const templateStart = source.indexOf("const BOQ_TEMPLATES");
  const midCenturyStart = source.indexOf("中古风: {", templateStart);
  const midCenturyLivingRoom = source.slice(midCenturyStart, source.indexOf("const styleSpaceTemplateOverrides"));
  assert.match(midCenturyLivingRoom, /name: "中古胡桃木框架沙发"/);
  assert.match(midCenturyLivingRoom, /name: "胡桃木复古茶几"/);
  assert.match(midCenturyLivingRoom, /name: "中古感羊毛手工地毯"/);
  assert.doesNotMatch(midCenturyLivingRoom, /name: "奶油柔模块沙发"/);
});
