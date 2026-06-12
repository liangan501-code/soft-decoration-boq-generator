const STORAGE_KEY = "maison-boq-state-v1";
function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PENDING_STATUSES = ["待确认", "采购询价中", "需复核尺寸"];

const defaultState = {
  projectTitle: "滨江私宅 240㎡ 软装 BOQ 管理",
  clientMode: false,
  pendingOnly: false,
  query: "",
  items: [
    {
      id: createId(),
      space: "客厅",
      category: "主沙发",
      name: "意式低靠背模块沙发 / 暖灰羊毛混纺",
      spec: "3200 × 980 × 680mm，含抱枕 4 只",
      quantity: 1,
      unit: "套",
      unitPrice: 42800,
      supplier: "Maison&Co 定制工厂",
      status: "客户已确认",
      note: "客户版隐藏工厂联络方式，采购版需确认面料批次。",
    },
    {
      id: createId(),
      space: "餐厅",
      category: "吊灯",
      name: "手工玻璃线性吊灯 / 香槟金金属件",
      spec: "L1800mm，3000K 暖光，支持调光",
      quantity: 1,
      unit: "组",
      unitPrice: 16500,
      supplier: "北欧灯饰精选",
      status: "采购询价中",
      note: "需补充备选供应商报价，用于客户会前比价。",
    },
    {
      id: createId(),
      space: "主卧",
      category: "窗帘",
      name: "双层遮光帘 + 纱帘 / 杏仁米色",
      spec: "墙到墙安装，遮光率 92%，含轨道",
      quantity: 28,
      unit: "米",
      unitPrice: 870,
      supplier: "织物实验室",
      status: "需复核尺寸",
      note: "等待现场复尺，暂按设计图纸长度估算。",
    },
    {
      id: createId(),
      space: "玄关",
      category: "艺术品",
      name: "抽象肌理画 / 原创手作装裱",
      spec: "900 × 1200mm，胡桃木窄边框",
      quantity: 1,
      unit: "幅",
      unitPrice: 9800,
      supplier: "Gallery 19",
      status: "备选推荐",
      note: "如预算收紧可替换为限量版画。",
    },
    {
      id: createId(),
      space: "书房",
      category: "单椅",
      name: "皮革阅读椅 / 焦糖棕植鞣皮",
      spec: "含脚踏，黑钛金属脚，现货交付",
      quantity: 1,
      unit: "把",
      unitPrice: 13900,
      supplier: "HABITAT 买手店",
      status: "客户已确认",
      note: "客户已确认皮色，安排采购锁库存。",
    },
  ],
};

const sampleImportItems = [
  {
    space: "儿童房",
    category: "地毯",
    name: "羊毛混纺圆角地毯 / 奶油白",
    spec: "2000 × 3000mm，短绒易清洁",
    quantity: 1,
    unit: "张",
    unitPrice: 5200,
    supplier: "Soft Home Studio",
    status: "待确认",
    note: "需客户确认是否增加防滑垫。",
  },
  {
    space: "客厅",
    category: "边几",
    name: "洞石面圆几 / 胡桃木底座",
    spec: "Φ520 × 520mm，可与主沙发组合",
    quantity: 2,
    unit: "只",
    unitPrice: 3600,
    supplier: "Maison&Co 定制工厂",
    status: "采购询价中",
    note: "与茶几同批下单可降低运输费。",
  },
  {
    space: "阳台",
    category: "休闲椅",
    name: "户外藤编休闲椅 / 防水坐垫",
    spec: "含坐垫 2 套，适合半户外区域",
    quantity: 2,
    unit: "把",
    unitPrice: 2800,
    supplier: "Garden Living",
    status: "待确认",
    note: "需确认阳台实际进深。",
  },
];

let state = loadState();

const elements = {
  projectTitle: document.querySelector("#projectTitle"),
  tableBody: document.querySelector("#boqTableBody"),
  totalBudget: document.querySelector("#totalBudget"),
  totalItems: document.querySelector("#totalItems"),
  confirmedCount: document.querySelector("#confirmedCount"),
  pendingAmount: document.querySelector("#pendingAmount"),
  purchaseScore: document.querySelector("#purchaseScore"),
  searchInput: document.querySelector("#searchInput"),
  newProjectBtn: document.querySelector("#newProjectBtn"),
  importBtn: document.querySelector("#importBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  printClientBtn: document.querySelector("#printClientBtn"),
  filterPendingBtn: document.querySelector("#filterPendingBtn"),
  clearFilterBtn: document.querySelector("#clearFilterBtn"),
  clientFieldsBtn: document.querySelector("#clientFieldsBtn"),
  addProductBtn: document.querySelector("#addProductBtn"),
  showSuggestionsBtn: document.querySelector("#showSuggestionsBtn"),
  productDialog: document.querySelector("#productDialog"),
  productForm: document.querySelector("#productForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogBtn: document.querySelector("#closeDialogBtn"),
  cancelDialogBtn: document.querySelector("#cancelDialogBtn"),
  editingId: document.querySelector("#editingId"),
  spaceInput: document.querySelector("#spaceInput"),
  categoryInput: document.querySelector("#categoryInput"),
  nameInput: document.querySelector("#nameInput"),
  specInput: document.querySelector("#specInput"),
  quantityInput: document.querySelector("#quantityInput"),
  unitInput: document.querySelector("#unitInput"),
  unitPriceInput: document.querySelector("#unitPriceInput"),
  statusInput: document.querySelector("#statusInput"),
  supplierInput: document.querySelector("#supplierInput"),
  noteInput: document.querySelector("#noteInput"),
  formSubtotal: document.querySelector("#formSubtotal"),
  suggestionDialog: document.querySelector("#suggestionDialog"),
  closeSuggestionBtn: document.querySelector("#closeSuggestionBtn"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : structuredClone(defaultState);
  } catch (error) {
    console.warn("无法读取本地数据，已使用默认清单", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value || 0);
}

function subtotal(item) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function getVisibleItems() {
  const query = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    const matchesPending = !state.pendingOnly || PENDING_STATUSES.includes(item.status);
    const haystack = [item.space, item.category, item.name, item.spec, item.supplier, item.status].join(" ").toLowerCase();
    return matchesPending && (!query || haystack.includes(query));
  });
}

function render() {
  const visibleItems = getVisibleItems();
  elements.projectTitle.textContent = state.projectTitle;
  elements.searchInput.value = state.query;
  elements.clearFilterBtn.hidden = !state.pendingOnly;
  elements.clientFieldsBtn.textContent = state.clientMode ? "客户版字段：已隐藏内部字段" : "客户版字段：全字段";
  document.body.classList.toggle("client-mode", state.clientMode);

  elements.tableBody.innerHTML = visibleItems.length
    ? visibleItems.map(renderRow).join("")
    : '<tr><td colspan="11" class="empty-cell">暂无匹配产品，请清除筛选或新增产品。</td></tr>';

  const total = state.items.reduce((sum, item) => sum + subtotal(item), 0);
  const pendingTotal = state.items.filter((item) => PENDING_STATUSES.includes(item.status)).reduce((sum, item) => sum + subtotal(item), 0);
  const confirmed = state.items.filter((item) => item.status === "客户已确认").length;
  const score = state.items.length ? Math.round((confirmed / state.items.length) * 100) : 0;

  elements.totalBudget.textContent = money(total);
  elements.totalItems.textContent = `${state.items.length} 项产品`;
  elements.confirmedCount.textContent = `${confirmed} 项`;
  elements.pendingAmount.textContent = money(pendingTotal);
  elements.purchaseScore.textContent = `${score}%`;
}

function renderRow(item) {
  const safeId = item.id.replaceAll('"', "&quot;");
  return `
    <tr>
      <td><strong>${escapeHtml(item.space)}</strong></td>
      <td>${escapeHtml(item.category)}</td>
      <td class="item-cell">${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.spec)}</td>
      <td><input class="inline-number" type="number" min="0" step="0.01" value="${Number(item.quantity)}" data-action="quantity" data-id="${safeId}" aria-label="调整数量" /> ${escapeHtml(item.unit)}</td>
      <td class="money customer-hidden"><input class="inline-price" type="number" min="0" step="0.01" value="${Number(item.unitPrice)}" data-action="unitPrice" data-id="${safeId}" aria-label="调整单价" /></td>
      <td class="customer-hidden">${escapeHtml(item.supplier)}</td>
      <td class="money">${money(subtotal(item))}</td>
      <td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td class="customer-hidden note-cell">${escapeHtml(item.note || "-")}</td>
      <td class="actions-col row-actions">
        <button type="button" class="mini-button" data-action="edit" data-id="${safeId}">编辑</button>
        <button type="button" class="mini-button danger" data-action="delete" data-id="${safeId}">删除</button>
      </td>
    </tr>`;
}

function statusClass(status) {
  return {
    客户已确认: "confirmed",
    待确认: "pending",
    采购询价中: "pending",
    需复核尺寸: "review",
    备选推荐: "option",
  }[status] || "pending";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
}

function openProductDialog(item = null) {
  elements.dialogTitle.textContent = item ? "编辑产品" : "新增产品";
  elements.editingId.value = item?.id || "";
  elements.spaceInput.value = item?.space || "";
  elements.categoryInput.value = item?.category || "";
  elements.nameInput.value = item?.name || "";
  elements.specInput.value = item?.spec || "";
  elements.quantityInput.value = item?.quantity ?? 1;
  elements.unitInput.value = item?.unit || "件";
  elements.unitPriceInput.value = item?.unitPrice ?? 0;
  elements.statusInput.value = item?.status || "待确认";
  elements.supplierInput.value = item?.supplier || "";
  elements.noteInput.value = item?.note || "";
  updateFormSubtotal();
  elements.productDialog.showModal();
}

function collectFormItem() {
  return {
    id: elements.editingId.value || createId(),
    space: elements.spaceInput.value.trim(),
    category: elements.categoryInput.value.trim(),
    name: elements.nameInput.value.trim(),
    spec: elements.specInput.value.trim(),
    quantity: Number(elements.quantityInput.value || 0),
    unit: elements.unitInput.value.trim(),
    unitPrice: Number(elements.unitPriceInput.value || 0),
    supplier: elements.supplierInput.value.trim(),
    status: elements.statusInput.value,
    note: elements.noteInput.value.trim(),
  };
}

function updateFormSubtotal() {
  const quantity = Number(elements.quantityInput.value || 0);
  const unitPrice = Number(elements.unitPriceInput.value || 0);
  elements.formSubtotal.textContent = money(quantity * unitPrice);
}

function importSamples() {
  const imported = sampleImportItems.map((item) => ({ ...item, id: createId() }));
  state.items = [...state.items, ...imported];
  state.pendingOnly = false;
  saveState();
  render();
  showToast(`已导入 ${imported.length} 条示例清单数据`);
}

function exportCsv() {
  const headers = ["空间", "品类", "产品名称", "规格", "数量", "单位", "单价", "预算小计", "供应商", "状态", "内部备注"];
  const rows = state.items.map((item) => [item.space, item.category, item.name, item.spec, item.quantity, item.unit, item.unitPrice, subtotal(item), item.supplier, item.status, item.note]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.projectTitle.replace(/[\\/:*?"<>|]/g, "-")}-汇报表.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("已导出 CSV 汇报表");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function printClientPdf() {
  const previousClientMode = state.clientMode;
  state.clientMode = true;
  render();
  document.body.classList.add("printing-client");
  window.setTimeout(() => {
    window.print();
    document.body.classList.remove("printing-client");
    state.clientMode = previousClientMode;
    render();
  }, 80);
}

function addProject() {
  const name = window.prompt("请输入新项目名称", "新项目软装 BOQ 管理");
  if (!name?.trim()) return;
  state = { ...structuredClone(defaultState), projectTitle: name.trim(), items: [] };
  saveState();
  render();
  showToast("已新增项目，当前清单为空");
}

elements.tableBody.addEventListener("input", (event) => {
  const input = event.target.closest("input[data-action]");
  if (!input) return;
  const item = state.items.find((entry) => entry.id === input.dataset.id);
  if (!item) return;
  item[input.dataset.action] = Number(input.value || 0);
  saveState();
  render();
});

elements.tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = state.items.find((entry) => entry.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "edit") {
    openProductDialog(item);
  }
  if (button.dataset.action === "delete" && window.confirm(`确认删除“${item.name}”？`)) {
    state.items = state.items.filter((entry) => entry.id !== item.id);
    saveState();
    render();
    showToast("已删除产品");
  }
});

elements.productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = collectFormItem();
  const existingIndex = state.items.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) {
    state.items[existingIndex] = item;
    showToast("已更新产品");
  } else {
    state.items.push(item);
    showToast("已新增产品");
  }
  saveState();
  render();
  elements.productDialog.close();
});

[elements.quantityInput, elements.unitPriceInput].forEach((input) => input.addEventListener("input", updateFormSubtotal));
elements.closeDialogBtn.addEventListener("click", () => elements.productDialog.close());
elements.cancelDialogBtn.addEventListener("click", () => elements.productDialog.close());
elements.addProductBtn.addEventListener("click", () => openProductDialog());
elements.newProjectBtn.addEventListener("click", addProject);
elements.importBtn.addEventListener("click", importSamples);
elements.exportBtn.addEventListener("click", exportCsv);
elements.printClientBtn.addEventListener("click", printClientPdf);
elements.filterPendingBtn.addEventListener("click", () => {
  state.pendingOnly = true;
  saveState();
  render();
  document.querySelector("#boq").scrollIntoView({ behavior: "smooth" });
  showToast("已筛选待确认、采购询价中、需复核尺寸的产品");
});
elements.clearFilterBtn.addEventListener("click", () => {
  state.pendingOnly = false;
  saveState();
  render();
});
elements.clientFieldsBtn.addEventListener("click", () => {
  state.clientMode = !state.clientMode;
  saveState();
  render();
  showToast(state.clientMode ? "已隐藏供应商、单价和内部备注" : "已显示完整内部字段");
});
elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  saveState();
  render();
});
elements.showSuggestionsBtn.addEventListener("click", () => elements.suggestionDialog.showModal());
elements.closeSuggestionBtn.addEventListener("click", () => elements.suggestionDialog.close());

render();
