import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

function getEventListenerBody(eventName) {
  const marker = `elements.tableBody.addEventListener("${eventName}", (event) => {`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${eventName} listener should exist`);
  const bodyStart = start + marker.length;
  const end = source.indexOf("\n});", bodyStart);
  assert.notEqual(end, -1, `${eventName} listener should have a closing block`);
  return source.slice(bodyStart, end);
}

test("inline quantity and unit price fields use text inputs with decimal keyboard hints", () => {
  assert.match(source, /class="inline-number" type="text" inputmode="decimal"/);
  assert.match(source, /class="inline-price" type="text" inputmode="decimal"/);
});

test("inline input typing updates only row and summary DOM without saving or rerendering", () => {
  const inputBody = getEventListenerBody("input");

  assert.match(inputBody, /parseInlineAmount\(input\.value\)/);
  assert.match(inputBody, /updateInlineRowBudget\(input, item\)/);
  assert.doesNotMatch(inputBody, /\brender\s*\(/, "typing must not replace the table DOM");
  assert.doesNotMatch(inputBody, /\bsaveState\s*\(/, "typing must not write localStorage on each keystroke");
  assert.doesNotMatch(inputBody, /flushInlineEditSave|scheduleInlineEditSave/, "typing must not save until input is committed");
});

test("inline edits are committed only after blur/change/Enter", () => {
  assert.match(getEventListenerBody("change"), /flushInlineEditSave\(\)/);
  assert.match(getEventListenerBody("focusout"), /flushInlineEditSave\(\)/);
  assert.match(getEventListenerBody("keydown"), /event\.key !== "Enter"/);
  assert.match(getEventListenerBody("keydown"), /input\.blur\(\)/);
});

test("regression guard: continuous entry values 1500 and 28 are not interrupted by rerender", () => {
  const inputBody = getEventListenerBody("input");
  for (const typedValue of ["1", "15", "150", "1500", "2", "28"]) {
    const parsed = Number(typedValue.replaceAll(",", "").trim());
    assert.equal(Number.isFinite(parsed) ? parsed : 0, Number(typedValue));
  }
  assert.doesNotMatch(inputBody, /\b(render|saveState|flushInlineEditSave|scheduleInlineEditSave)\s*\(/);
});
