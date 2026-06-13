import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync("src/app.js", "utf8");
const html = readFileSync("index.html", "utf8");

test("rendering upload copy consistently mentions soft decoration plans", () => {
  assert.match(html, /上传效果图 \/ 软装方案 <em>\*<\/em>/);
  assert.match(html, /上传客餐厅、卧室、公区等效果图或软装方案/);
  assert.match(html, /仅保存压缩预览图，用于生成清单参考/);
  assert.match(app, /请先上传平面图和效果图 \/ 软装方案/);
});

test("upload workflow validates, reads, previews, deletes, and supports drag drop", () => {
  assert.match(app, /SUPPORTED_IMAGE_TYPES = new Set\(\["image\/jpeg", "image\/png", "image\/webp"\]\)/);
  assert.match(app, /URL\.createObjectURL\(file\)/);
  assert.match(app, /reader\.readAsDataURL\(blob\)/);
  assert.match(app, /reader\.addEventListener\("load"/);
  assert.match(app, /reader\.addEventListener\("error"/);
  assert.match(app, /图片格式不支持，请使用 JPG、PNG、WebP/);
  assert.match(app, /图片过大，已尝试压缩/);
  assert.match(app, /data-upload-remove/);
  assert.match(app, /deleteImageFromIndexedDb\(removed\.storageKey\)/);
  assert.match(app, /trigger\.addEventListener\("drop"/);
});

test("image persistence falls back to IndexedDB when localStorage cannot hold previews", () => {
  assert.match(app, /indexedDB\.open\(IMAGE_DB_NAME, 1\)/);
  assert.match(app, /saveImageToIndexedDb/);
  assert.match(app, /hydrateWorkspaceFromIndexedDb/);
  assert.match(app, /浏览器存储空间不足/);
  assert.match(app, /已保存压缩预览图/);
});

test("image storage management exposes compression limits and cleanup actions", () => {
  assert.match(app, /floorPlans: \{ maxEdge: 1200/);
  assert.match(app, /product: \{ maxEdge: 800/);
  assert.match(app, /material: \{ maxEdge: 600/);
  assert.match(app, /IMAGE_COMPRESSION_QUALITY = 0\.78/);
  assert.match(app, /collectReferencedImageKeys/);
  assert.match(app, /cleanupUnusedImages/);
  assert.match(html, /清理未使用图片/);
  assert.match(html, /删除全部上传图片/);
  assert.match(html, /导出数据备份/);
  assert.match(html, /恢复示例数据/);
  assert.match(html, /平面图 \/ 尺寸图单张不超过 5MB/);
  assert.match(html, /产品彩图单张不超过 3MB/);
  assert.match(html, /材料样板贴图单张不超过 2MB/);
});


test("product image cards render only the image and actions without labels", () => {
  const cellStart = app.indexOf("function renderProductImageCell");
  const cellEnd = app.indexOf("function resolveProductImage", cellStart);
  const cellSource = app.slice(cellStart, cellEnd);

  assert.match(cellSource, /<img class="boq-product-image/);
  assert.match(cellSource, /data-action="upload-product-image"/);
  assert.match(cellSource, /data-action="pick-rendering-image"/);
  assert.match(cellSource, /data-action="remove-product-image"/);
  assert.match(cellSource, /onerror="this\.onerror=null;this\.src='/);
  assert.doesNotMatch(cellSource, /product-category-badge|product-source-badge|<small>|sourceMeta\.label|sourceMeta\.description|item\.productName|item\.name/);
});

test("product image placeholders and pending rendering fallbacks contain no visible text labels", () => {
  const placeholderStart = app.indexOf("function createProductPlaceholderImage");
  const placeholderEnd = app.indexOf("function getPlaceholderPalette", placeholderStart);
  const placeholderSource = app.slice(placeholderStart, placeholderEnd);
  const pendingStart = app.indexOf("function createRenderingPendingImage");
  const pendingEnd = app.indexOf("function getProductImageSourceClassName", pendingStart);
  const pendingSource = app.slice(pendingStart, pendingEnd);

  assert.doesNotMatch(placeholderSource, /<text|BOQ IMAGE|\$\{title\}/);
  assert.doesNotMatch(pendingSource, /效果图预览加载中|<text|\$\{title\}/);
});
