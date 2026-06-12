const STORAGE_KEY = "maison-boq-state-v1";
const ATTENTION_STATUSES = new Set(["待确认", "采购询价中", "需复核尺寸"]);

const demoState = {
  project: {
    name: "滨江私宅 240㎡ 软装 BOQ 管理",
    client: "李女士",
    type: "私宅全案",
    area: 240,
    budget: 520000,
    style: "现代自然 · 胡桃木与亚麻肌理",
  },
  items: [
    {
      id: crypto.randomUUID(),
      space: "客厅",
      category: "主沙发",
      productName: "意式低靠背模块沙发",
      spec: "3200 × 980 × 680mm，含抱枕 4 只",
      material: "暖灰羊毛混纺",
      color: "暖灰",
      quantity: 1,
      supplier: "Maison&Co 定制工厂",
      unitPrice: 42800,
      status: "客户已确认",
      notes: "客户确认版，需下单前复核电梯尺寸。",
    },
    {
      id: crypto.randomUUID(),
      space: "餐厅",
      category: "吊灯",
      productName: "手工玻璃线性吊灯",
      spec: "L1800mm，3000K 暖光，支持调光",
      material: "手工玻璃 / 香槟金金属件",
      color: "香槟金",
      quantity: 1,
      supplier: "北欧灯饰精选",
      unitPrice: 16500,
      status: "采购询价中",
      notes: "等待 2 家供应商报价，需确认吊顶承重。",
    },
    {
      id: crypto.randomUUID(),
      space: "主卧",
      category: "窗帘",
      productName: "双层遮光帘 + 纱帘",
      spec: "墙到墙安装，遮光率 92%，含轨道",
      material: "遮光布 / 细纹纱",
      color: "杏仁米色",
      quantity: 28,
      supplier: "织物实验室",
      unitPrice: 870,
      status: "需复核尺寸",
      notes: "现场复尺后按实际米数调整。",
    },
    {
      id: crypto.randomUUID(),
      space: "玄关",
      category: "艺术品",
      productName: "抽象肌理画",
      spec: "900 × 1200mm，胡桃木窄边框",
      material: "原创手作装裱",
      color: "洞石灰 / 米白",
      quantity: 1,
      supplier: "Gallery 19",
      unitPrice: 9800,
      status: "备选推荐",
      notes: "客户可在汇报会二选一。",
    },
    {
      id: crypto.randomUUID(),
      space: "书房",
      category: "单椅",
      productName: "皮革阅读椅",
      spec: "含脚踏，黑钛金属脚，现货交付",
      material: "植鞣皮 / 金属脚",
      color: "焦糖棕",
      quantity: 1,
      supplier: "HABITAT 买手店",
      unitPrice: 13900,
      status: "客户已确认",
      notes: "可安排本周送样皮。",
    },
  ],
};

let state = loadState();
let attentionOnly = false;
let searchTerm = "";

const elements = {
  pageTitle: document.querySelector("#pageTitle"),
  projectPill: document.querySelector("#projectPill"),
  projectSummary: document.querySelector("#projectSummary"),
  projectForm: document.querySelector("#projectForm"),
  projectReadout: document.querySelector("#projectReadout"),
  newProjectButton: document.querySelector("#newProjectButton"),
  tableBody: document.querySelector("#boqTableBody"),
  emptyState: document.querySelector("#emptyState"),
  totalBudgetMetric: document.querySelector("#totalBudgetMetric"),
  targetBudgetMetric: document.querySelector("#targetBudgetMetric"),
  budgetBalanceMetric: document.querySelector("#budgetBalanceMetric"),
  confirmedMetric: document.querySelector("#confirmedMetric"),
  pendingAmountMetric: document.querySelector("#pendingAmountMetric"),
  budgetHint: document.querySelector("#budgetHint"),
  attentionCount: document.querySelector("#attentionCount"),
  confirmedCountSide: document.querySelector("#confirmedCountSide"),
  budgetUsageSide: document.querySelector("#budgetUsageSide"),
  filterAttentionButton: document.querySelector("#filterAttentionButton"),
  filterStateLabel: document.querySelector("#filterStateLabel"),
  addItemButton: document.querySelector("#addItemButton"),
  itemDialog: document.querySelector("#itemDialog"),
  itemForm: document.querySelector("#itemForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogSubtotal: document.querySelector("#dialogSubtotal"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelItemButton: document.querySelector("#cancelItemButton"),
  searchInput: document.querySelector("#searchInput"),
  printProjectTitle: document.querySelector("#printProjectTitle"),
  printProjectMeta: document.querySelector("#printProjectMeta"),
};

document.querySelectorAll("#printButton, #printTopButton").forEach((button) => {
  button.addEventListener("click", () => window.print());
});

document.querySelectorAll("#exportCsvButton, #exportCsvTopButton").forEach((button) => {
  button.addEventListener("click", exportCsv);
});

document.querySelector("#resetDemoButton").addEventListener("click", () => {
  if (confirm("确定恢复示例数据？当前本地保存的数据会被覆盖。")) {
    state = structuredClone(demoState);
    saveState();
    render();
  }
});

elements.projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.project = {
    name: textValue(formData, "name") || "未命名项目",
    client: textValue(formData, "client"),
    type: textValue(formData, "type"),
    area: numberValue(formData, "area"),
    budget: numberValue(formData, "budget"),
    style: textValue(formData, "style"),
  };
  saveState();
  render();
});

elements.newProjectButton.addEventListener("click", () => {
  state = {
    project: { name: "新软装项目", client: "", type: "", area: 0, budget: 0, style: "" },
    items: [],
  };
  attentionOnly = false;
  saveState();
  render();
  elements.projectForm.querySelector("input[name='name']").focus();
});

elements.filterAttentionButton.addEventListener("click", () => {
  attentionOnly = !attentionOnly;
  elements.filterAttentionButton.setAttribute("aria-pressed", String(attentionOnly));
  renderTable();
});

elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderTable();
});

elements.addItemButton.addEventListener("click", () => openItemDialog());
elements.closeDialogButton.addEventListener("click", () => elements.itemDialog.close());
elements.cancelItemButton.addEventListener("click", () => elements.itemDialog.close());

elements.itemForm.addEventListener("input", updateDialogSubtotal);
elements.itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const item = {
    id: textValue(formData, "id") || crypto.randomUUID(),
    space: textValue(formData, "space"),
    category: textValue(formData, "category"),
    productName: textValue(formData, "productName"),
    spec: textValue(formData, "spec"),
    material: textValue(formData, "material"),
    color: textValue(formData, "color"),
    quantity: numberValue(formData, "quantity"),
    supplier: textValue(formData, "supplier"),
    unitPrice: numberValue(formData, "unitPrice"),
    status: textValue(formData, "status") || "待确认",
    notes: textValue(formData, "notes"),
  };
  const existingIndex = state.items.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) {
    state.items[existingIndex] = item;
  } else {
    state.items.unshift(item);
  }
  saveState();
  elements.itemDialog.close();
  render();
});

elements.tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = state.items.find((entry) => entry.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    openItemDialog(item);
  }

  if (button.dataset.action === "delete" && confirm(`确定删除「${item.productName}」？`)) {
    state.items = state.items.filter((entry) => entry.id !== item.id);
    saveState();
    render();
  }
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.project && Array.isArray(saved.items)) return saved;
  } catch (error) {
    console.warn("无法读取本地 BOQ 数据，已使用示例数据。", error);
  }
  return structuredClone(demoState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderProject();
  renderMetrics();
  renderTable();
}

function renderProject() {
  const project = state.project;
  elements.pageTitle.textContent = `${project.name || "软装项目"} BOQ 管理`;
  elements.projectPill.textContent = `✓ ${project.type || "项目"} · ${project.style || "风格待定"}`;
  elements.projectSummary.textContent = `${project.client || "客户"} · ${project.area || 0}㎡ · 目标预算 ${formatCurrency(project.budget)}。所有产品数据已保存在浏览器 localStorage。`;
  elements.printProjectTitle.textContent = `${project.name || "软装项目"}｜客户版软装清单`;
  elements.printProjectMeta.textContent = `客户：${project.client || "-"}　类型：${project.type || "-"}　面积：${project.area || 0}㎡　风格：${project.style || "-"}`;

  Object.entries(project).forEach(([key, value]) => {
    const field = elements.projectForm.elements.namedItem(key);
    if (field) field.value = value ?? "";
  });

  elements.projectReadout.innerHTML = [
    ["项目名称", project.name],
    ["客户名称", project.client],
    ["项目类型", project.type],
    ["面积", `${project.area || 0}㎡`],
    ["预算", formatCurrency(project.budget)],
    ["风格", project.style],
  ]
    .map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value || "-")}</strong></div>`)
    .join("");
}

function renderMetrics() {
  const totals = calculateTotals(state.items);
  const targetBudget = Number(state.project.budget) || 0;
  const balance = targetBudget - totals.totalBudget;

  elements.totalBudgetMetric.textContent = formatCurrency(totals.totalBudget);
  elements.targetBudgetMetric.textContent = formatCurrency(targetBudget);
  elements.budgetBalanceMetric.textContent = `预算差额 ${formatCurrency(balance)}`;
  elements.confirmedMetric.textContent = `${totals.confirmedCount} 项`;
  elements.pendingAmountMetric.textContent = formatCurrency(totals.pendingAmount);
  elements.budgetHint.textContent = `共 ${state.items.length} 项产品自动汇总`;
  elements.attentionCount.textContent = `${totals.attentionCount} 项需跟进`;
  elements.confirmedCountSide.textContent = `${totals.confirmedCount} 项可执行`;
  elements.budgetUsageSide.textContent = formatCurrency(totals.totalBudget);
}

function renderTable() {
  const rows = getVisibleItems();
  elements.filterStateLabel.textContent = attentionOnly ? "仅显示待确认 / 询价 / 复核" : "显示全部产品";
  elements.filterAttentionButton.textContent = attentionOnly ? "取消筛选" : "筛选待确认项";
  elements.emptyState.hidden = rows.length > 0;
  elements.tableBody.innerHTML = rows.map(renderTableRow).join("");
}

function renderTableRow(item) {
  const subtotal = calculateSubtotal(item);
  return `
    <tr>
      <td><strong>${escapeHtml(item.space)}</strong></td>
      <td>${escapeHtml(item.category)}</td>
      <td class="item-cell">${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.spec)}</td>
      <td>${escapeHtml(item.material)}</td>
      <td>${escapeHtml(item.color)}</td>
      <td>${formatQuantity(item.quantity)}</td>
      <td class="private-field">${escapeHtml(item.supplier)}</td>
      <td class="money">${formatCurrency(item.unitPrice)}</td>
      <td class="money">${formatCurrency(subtotal)}</td>
      <td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td class="private-field notes-cell">${escapeHtml(item.notes)}</td>
      <td class="no-print action-col">
        <button class="mini-button" type="button" data-action="edit" data-id="${item.id}">编辑</button>
        <button class="mini-button danger" type="button" data-action="delete" data-id="${item.id}">删除</button>
      </td>
    </tr>`;
}

function getVisibleItems() {
  return state.items.filter((item) => {
    const matchesAttention = !attentionOnly || ATTENTION_STATUSES.has(item.status);
    const searchable = Object.values(item).join(" ").toLowerCase();
    const matchesSearch = !searchTerm || searchable.includes(searchTerm);
    return matchesAttention && matchesSearch;
  });
}

function openItemDialog(item) {
  elements.itemForm.reset();
  elements.dialogTitle.textContent = item ? "编辑软装产品" : "新增软装产品";
  const values = item || {
    id: "",
    space: "",
    category: "",
    productName: "",
    spec: "",
    material: "",
    color: "",
    quantity: 1,
    supplier: "",
    unitPrice: 0,
    status: "待确认",
    notes: "",
  };

  Object.entries(values).forEach(([key, value]) => {
    const field = elements.itemForm.elements.namedItem(key);
    if (field) field.value = value ?? "";
  });
  updateDialogSubtotal();
  elements.itemDialog.showModal();
}

function updateDialogSubtotal() {
  const quantity = Number(elements.itemForm.elements.namedItem("quantity").value) || 0;
  const unitPrice = Number(elements.itemForm.elements.namedItem("unitPrice").value) || 0;
  elements.dialogSubtotal.textContent = formatCurrency(quantity * unitPrice);
}

function calculateTotals(items) {
  return items.reduce(
    (result, item) => {
      const subtotal = calculateSubtotal(item);
      result.totalBudget += subtotal;
      if (item.status === "客户已确认") result.confirmedCount += 1;
      if (ATTENTION_STATUSES.has(item.status)) {
        result.pendingAmount += subtotal;
        result.attentionCount += 1;
      }
      return result;
    },
    { totalBudget: 0, confirmedCount: 0, pendingAmount: 0, attentionCount: 0 },
  );
}

function calculateSubtotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

function exportCsv() {
  const headers = ["空间", "品类", "产品名称", "规格尺寸", "材质", "颜色", "数量", "供应商", "单价", "小计", "状态", "备注"];
  const rows = state.items.map((item) => [
    item.space,
    item.category,
    item.productName,
    item.spec,
    item.material,
    item.color,
    item.quantity,
    item.supplier,
    item.unitPrice,
    calculateSubtotal(item),
    item.status,
    item.notes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.project.name || "软装清单"}-BOQ.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function numberValue(formData, key) {
  return Number(formData.get(key)) || 0;
}

function textValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function statusClass(status) {
  return {
    客户已确认: "confirmed",
    待确认: "waiting",
    采购询价中: "pending",
    需复核尺寸: "review",
    备选推荐: "option",
    已下单: "ordered",
  }[status] || "waiting";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
