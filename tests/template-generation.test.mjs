import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const generationSource = source.slice(source.indexOf("function runTemplateGeneration"), source.indexOf("function setLibraryCard"));

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

test("current-space generation replaces existing space items without confirmation", () => {
  assert.doesNotMatch(source, /requestTemplateConflictAction/);
  assert.doesNotMatch(source, /getGenerationAction/);
  assert.doesNotMatch(source, /templateConflictDialog/);
  assert.doesNotMatch(html, /templateConflictDialog|生成模板确认|当前空间已有清单|value="追加"/);
  assert.doesNotMatch(generationSource, /window\.prompt/);
  assert.match(generationSource, /const space = elements\.templateSpaceInput\.value;/);
  assert.match(generationSource, new RegExp("runTemplateGeneration\\(\\{\\n    spaces: \\[space\\]"));
  assert.match(generationSource, /applyGeneratedItems\(generatedItems, successMessage\(style, generatedItems\), spaces, style, spaces\)/);
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

test("selected dining style templates use independent product names", () => {
  const templateStart = source.indexOf("const styleSpaceTemplateOverrides");
  const templateEnd = source.indexOf("const spaceTemplates", templateStart);
  const overrides = source.slice(templateStart, templateEnd);

  for (const name of [
    "奶油系餐厅主餐桌",
    "奶油布艺餐椅",
    "奶油风弧形吊灯",
    "胡桃木中古餐桌",
    "中古皮革餐椅",
    "复古金属吊灯",
    "法式雕花圆餐桌",
    "法式藤编餐椅",
    "黄铜玻璃吊灯",
    "法式复古餐边柜",
    "亚麻餐桌布",
    "法式花艺中心摆件",
    "黑色岩板餐桌",
    "黑金皮革餐椅",
    "金属线性吊灯",
  ]) {
    assert.match(overrides, new RegExp(name), `${name} should be in style-space template overrides`);
  }

  const frenchDiningStart = overrides.indexOf("法式: {");
  const frenchDiningBlock = overrides.slice(frenchDiningStart, overrides.indexOf("黑金风: {", frenchDiningStart));
  assert.doesNotMatch(frenchDiningBlock, /奶油系餐厅主餐桌|奶油布艺餐椅|奶油风弧形吊灯/);
});

test("template generation always replaces selected spaces, saves, and rerenders the BOQ table", () => {
  assert.match(source, /state\.items = replaceSpaces\.size \? replaceItemsForSpaces\(generatedItems, replaceSpaces\) : \[\.\.\.state\.items, \.\.\.generatedItems\];/);
  assert.match(generationSource, /applyGeneratedItems\(generatedItems, successMessage\(style, generatedItems\), spaces, style, spaces\)/);
  assert.match(source, /saveState\(\);\n  render\(\);/);
});
