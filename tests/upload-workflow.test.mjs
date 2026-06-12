import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync("src/app.js", "utf8");
const html = readFileSync("index.html", "utf8");

test("rendering upload copy consistently mentions soft decoration plans", () => {
  assert.match(html, /上传效果图 \/ 软装方案 <em>\*<\/em>/);
  assert.match(html, /上传客餐厅、卧室、公区等效果图或软装方案/);
  assert.match(html, /支持多张效果图、软装方案图，生成时用于风格与陈设判断/);
  assert.match(app, /请先上传平面图和效果图 \/ 软装方案/);
});

test("upload workflow validates, reads, previews, deletes, and supports drag drop", () => {
  assert.match(app, /SUPPORTED_IMAGE_TYPES = new Set\(\["image\/jpeg", "image\/png", "image\/webp"\]\)/);
  assert.match(app, /reader\.readAsDataURL\(file\)/);
  assert.match(app, /reader\.addEventListener\("load"/);
  assert.match(app, /reader\.addEventListener\("error"/);
  assert.match(app, /图片过大，请压缩到 25MB 以内后重新上传/);
  assert.match(app, /data-upload-remove/);
  assert.match(app, /deleteImageFromIndexedDb\(removed\.storageKey\)/);
  assert.match(app, /trigger\.addEventListener\("drop"/);
});

test("image persistence falls back to IndexedDB when localStorage cannot hold previews", () => {
  assert.match(app, /indexedDB\.open\(IMAGE_DB_NAME, 1\)/);
  assert.match(app, /saveImageToIndexedDb/);
  assert.match(app, /hydrateWorkspaceFromIndexedDb/);
  assert.match(app, /浏览器存储空间不足/);
  assert.match(app, /已保存预览图/);
});
