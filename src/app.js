const LEGACY_STORAGE_KEY = "maison-boq-state-v1";
const STORAGE_KEY = "maison-boq-workspace-v2";
function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PENDING_STATUSES = ["待确认", "采购询价中", "需复核尺寸"];

const defaultProject = () => ({
  id: createId(),
  projectTitle: "滨江私宅 240㎡ 软装 BOQ 管理",
  clientMode: false,
  exportMode: "client",
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
});

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

const styleProfiles = {
  奶油风: { adjective: "奶油系", material: "羊羔绒、微水泥、浅橡木", color: "奶油白 / 杏仁米 / 暖咖", supplier: "Cream Atelier", note: "控制同色系层次，优先选择柔和圆角与哑光质感。" },
  中古风: { adjective: "中古感", material: "胡桃木、藤编、复古皮革", color: "胡桃木色 / 焦糖棕 / 橄榄绿", supplier: "Mid-Century Gallery", note: "注意木色统一，金属件建议做旧铜或黑钛处理。" },
  轻奢风: { adjective: "轻奢", material: "岩板、香槟金不锈钢、丝绒", color: "象牙白 / 香槟金 / 雾灰", supplier: "Luxe Living Select", note: "金属线条不宜过多，保持克制的高级感。" },
  法式: { adjective: "法式", material: "雕花木、棉麻、黄铜、石膏肌理", color: "珍珠白 / 复古米 / 浅金", supplier: "Maison Française", note: "搭配弧线、花线和柔雾面料，避免过度繁复。" },
  雅奢: { adjective: "雅奢", material: "大理石、真皮、拉丝金属、混纺面料", color: "暖灰 / 深咖 / 古铜金", supplier: "Elegant Bespoke", note: "以低饱和色和精细收口体现品质，预留定制打样周期。" },
  度假风: { adjective: "度假感", material: "藤编、柚木、亚麻、手工陶", color: "沙色 / 海盐白 / 棕榈绿", supplier: "Resort Home Studio", note: "强调自然肌理和松弛感，软包建议选择耐污易打理面料。" },
  黑金风: { adjective: "黑金", material: "黑色烤漆、黑钛金属、深色岩板、皮革", color: "曜石黑 / 古铜金 / 深灰", supplier: "Noir Gold Works", note: "控制反光材质比例，灯光色温建议 2700K-3000K。" },
};

const spaceTemplates = {
  客厅: [
    ["主沙发", "模块沙发", "3200 × 980 × 720mm", 1, "套", [32000, 68000], "建议按电视墙与茶几轴线复核坐深。"],
    ["茶几", "组合茶几", "Φ900 × 360mm + Φ600 × 420mm", 1, "组", [6800, 18000], "预留沙发前 350-450mm 通行距离。"],
    ["边几", "造型边几", "Φ450 × 520mm", 2, "只", [2200, 6800], "可兼顾落地灯、香氛与小型摆件。"],
    ["地毯", "客厅主地毯", "2400 × 3400mm", 1, "张", [7500, 22000], "建议覆盖沙发前脚，强化围合感。"],
    ["装饰画", "沙发背景艺术画", "1200 × 1600mm", 1, "幅", [4800, 18000], "画面色彩需呼应抱枕和单椅。"],
    ["落地灯", "氛围落地灯", "H1550-1700mm", 1, "盏", [2800, 9500], "作为夜间辅助照明，建议暖光源。"],
  ],
  餐厅: [
    ["餐桌", "餐厅主餐桌", "2200 × 1000 × 750mm", 1, "张", [18000, 52000], "按用餐人数与餐边柜距离确认长度。"],
    ["餐椅", "软包餐椅", "520 × 560 × 780mm", 6, "把", [1800, 6800], "建议预留 1-2 把备选椅供客户试坐。"],
    ["吊灯", "线性餐厅吊灯", "L1400-1800mm，3000K", 1, "组", [6800, 24000], "安装高度以桌面上方 700-800mm 为宜。"],
    ["餐边柜摆件", "餐边柜陈设组合", "托盘 + 花器 + 艺术书", 1, "组", [2200, 8800], "避免遮挡插座和咖啡机操作区。"],
    ["桌旗", "餐桌布艺桌旗", "350 × 2200mm", 1, "条", [600, 2600], "颜色需与餐椅面料形成细节呼应。"],
  ],
  主卧: [
    ["床", "主卧软包床", "1800 × 2000mm", 1, "张", [18000, 52000], "床头高度需结合背景墙比例确认。"],
    ["床头柜", "床头柜组合", "520 × 420 × 500mm", 2, "只", [2800, 9800], "左右可做同系列不同形态增强层次。"],
    ["床品", "四件套与盖毯", "1.8m 床适配", 1, "套", [3200, 12000], "亲肤面料优先，拍摄前需熨烫整理。"],
    ["窗帘", "双层窗帘", "墙到墙定制，遮光率 ≥ 90%", 24, "米", [650, 1600], "下单前必须现场复尺并确认轨道方式。"],
    ["床尾凳", "床尾长凳", "1400 × 450 × 430mm", 1, "张", [4200, 16000], "适合增强酒店式完整度。"],
    ["装饰画", "床头背景画", "900 × 1200mm", 1, "幅", [3600, 15000], "画芯避免强对比，保持睡眠氛围。"],
  ],
  次卧: [
    ["床", "次卧成品床", "1500 × 2000mm", 1, "张", [9800, 32000], "尺寸可按客房或长辈房需求调整。"],
    ["床头柜", "轻量床头柜", "450 × 400 × 500mm", 2, "只", [1600, 6800], "如空间紧凑可改为壁挂层板。"],
    ["床品", "次卧床品套装", "1.5m 床适配", 1, "套", [2200, 8800], "建议准备一组中性色备用方案。"],
    ["窗帘", "遮光帘 + 纱帘", "墙到墙定制", 18, "米", [560, 1380], "注意空调出风口与窗帘盒位置。"],
    ["地毯", "床侧地毯", "1600 × 2300mm", 1, "张", [2800, 9800], "增强落脚舒适度，可选择短绒易清洁材质。"],
  ],
  玄关: [
    ["玄关凳", "换鞋凳", "900 × 380 × 430mm", 1, "张", [2800, 12000], "需避开门扇开启半径。"],
    ["装饰画", "玄关端景画", "800 × 1200mm", 1, "幅", [3600, 18000], "作为入户第一视觉，建议保留重点预算。"],
    ["花器", "端景花器", "H450-650mm", 1, "件", [1200, 6500], "可搭配季节性仿真花材或干枝。"],
    ["托盘", "钥匙托盘", "300 × 180mm", 1, "只", [600, 2800], "兼顾实用收纳与精致陈列。"],
    ["地垫", "入户地垫", "900 × 1400mm", 1, "张", [900, 3800], "需选择耐磨防滑底背。"],
  ],
  洽谈区: [
    ["洽谈桌", "圆形洽谈桌", "Φ900 × 750mm", 1, "张", [6800, 26000], "满足 3-4 人沟通和方案摊开展示。"],
    ["洽谈椅", "舒适洽谈椅", "560 × 580 × 780mm", 4, "把", [1800, 7800], "坐感优先，面料需耐磨。"],
    ["地毯", "洽谈区地毯", "2000 × 2000mm", 1, "张", [4200, 16000], "用于界定洽谈区边界。"],
    ["吊灯", "洽谈区装饰灯", "Φ600-800mm，3000K", 1, "盏", [3800, 16000], "避免眩光直射客户视线。"],
    ["绿植", "大型造景绿植", "H1200-1600mm", 1, "组", [1800, 8600], "可提升空间停留感和亲和度。"],
  ],
  书房: [
    ["书桌", "书房主书桌", "1600 × 700 × 750mm", 1, "张", [8800, 36000], "需确认插座、台灯与电脑走线位置。"],
    ["书椅", "人体工学书椅", "620 × 620 × 880mm", 1, "把", [3800, 18000], "优先试坐，靠背高度与扶手需匹配书桌。"],
    ["阅读椅", "书房阅读单椅", "780 × 820 × 820mm", 1, "把", [6800, 28000], "适合与落地灯形成独立阅读角。"],
    ["边几", "阅读角边几", "Φ420 × 520mm", 1, "只", [1800, 7600], "承托茶杯、书籍与香氛，避免过大占用通道。"],
    ["台灯", "书桌工作台灯", "H420-560mm，3000K-4000K", 1, "盏", [1800, 9800], "建议具备局部调光，兼顾工作与阅读。"],
    ["装饰摆件", "书柜陈设组合", "艺术书 + 雕塑 + 收纳盒", 1, "组", [2600, 12000], "按三角构图分层陈列，保留 30% 留白。"],
  ],
};

const librarySpaces = Object.keys(spaceTemplates);
const libraryStyles = Object.keys(styleProfiles);
const deliveryModes = {
  client: {
    title: "客户汇报版",
    description: "隐藏供应商、内部备注、采购成本，适合客户评审与方案汇报。",
    fields: ["空间", "品类", "产品名称", "尺寸材质", "预算小计", "状态"],
  },
  internal: {
    title: "内部采购版",
    description: "显示供应商、单价、内部备注、采购状态，适合采购询价与落地执行。",
    fields: ["供应商", "执行单价", "内部备注", "采购状态"],
  },
};

const workspace = loadWorkspace();
let state = getActiveProject();
let activeLibraryCard = null;

const elements = {
  projectTitle: document.querySelector("#projectTitle"),
  currentProjectName: document.querySelector("#currentProjectName"),
  reportModeLabel: document.querySelector("#reportModeLabel"),
  projectMeta: document.querySelector("#projectMeta"),
  projectSwitcher: document.querySelector("#projectSwitcher"),
  projectMenuBtn: document.querySelector("#projectMenuBtn"),
  projectMenuCurrent: document.querySelector("#projectMenuCurrent"),
  projectDropdown: document.querySelector("#projectDropdown"),
  projectDropdownList: document.querySelector("#projectDropdownList"),
  dropdownNewProjectBtn: document.querySelector("#dropdownNewProjectBtn"),
  sidebarProjectList: document.querySelector("#sidebarProjectList"),
  sidebarNewProjectBtn: document.querySelector("#sidebarNewProjectBtn"),
  tableBody: document.querySelector("#boqTableBody"),
  totalBudget: document.querySelector("#totalBudget"),
  totalItems: document.querySelector("#totalItems"),
  confirmedCount: document.querySelector("#confirmedCount"),
  pendingAmount: document.querySelector("#pendingAmount"),
  purchaseScore: document.querySelector("#purchaseScore"),
  searchInput: document.querySelector("#searchInput"),
  templateSpaceInput: document.querySelector("#templateSpaceInput"),
  templateStyleInput: document.querySelector("#templateStyleInput"),
  generateTemplateBtn: document.querySelector("#generateTemplateBtn"),
  generateAllSpacesBtn: document.querySelector("#generateAllSpacesBtn"),
  templateLibraryCards: document.querySelector("#templateLibraryCards"),
  templateLibraryPanel: document.querySelector("#templateLibraryPanel"),
  exportModeInput: document.querySelector("#exportModeInput"),
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
  priceRangeInput: document.querySelector("#priceRangeInput"),
  statusInput: document.querySelector("#statusInput"),
  supplierInput: document.querySelector("#supplierInput"),
  noteInput: document.querySelector("#noteInput"),
  formSubtotal: document.querySelector("#formSubtotal"),
  suggestionDialog: document.querySelector("#suggestionDialog"),
  closeSuggestionBtn: document.querySelector("#closeSuggestionBtn"),
  toast: document.querySelector("#toast"),
};

function loadWorkspace() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return normalizeWorkspace(JSON.parse(cached));

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migratedProject = normalizeProject(JSON.parse(legacy));
      migratedProject.id = migratedProject.id || createId();
      return normalizeWorkspace({ activeProjectId: migratedProject.id, projects: [migratedProject] });
    }

    const project = defaultProject();
    return { activeProjectId: project.id, projects: [project] };
  } catch (error) {
    console.warn("无法读取本地数据，已使用默认项目库", error);
    const project = defaultProject();
    return { activeProjectId: project.id, projects: [project] };
  }
}

function normalizeWorkspace(value) {
  const projects = Array.isArray(value?.projects) && value.projects.length
    ? value.projects.map(normalizeProject)
    : [defaultProject()];
  const activeProjectId = projects.some((project) => project.id === value?.activeProjectId) ? value.activeProjectId : projects[0].id;
  return { activeProjectId, projects };
}

function normalizeProject(project) {
  const normalized = {
    ...defaultProject(),
    ...project,
    id: project?.id || createId(),
    projectTitle: project?.projectTitle || "未命名软装项目",
    clientMode: Boolean(project?.clientMode),
    exportMode: project?.exportMode || "client",
    pendingOnly: Boolean(project?.pendingOnly),
    query: project?.query || "",
    items: Array.isArray(project?.items) ? project.items : [],
  };
  normalized.area = normalizeArea(project?.area ?? extractArea(normalized.projectTitle));
  normalized.style = project?.style || inferProjectStyle(normalized.projectTitle);
  return normalized;
}

function getActiveProject() {
  const active = workspace.projects.find((project) => project.id === workspace.activeProjectId);
  return active || workspace.projects[0];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

function extractArea(title) {
  const match = String(title || "").match(/(\d+(?:\.\d+)?)\s*㎡/);
  return match ? Number(match[1]) : "";
}

function normalizeArea(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : "";
}

function inferProjectStyle(title) {
  const text = String(title || "");
  return libraryStyles.find((style) => text.includes(style)) || "待定风格";
}

function getProjectArea(project) {
  return normalizeArea(project.area ?? extractArea(project.projectTitle));
}

function getProjectStyle(project) {
  return project.style || inferProjectStyle(project.projectTitle);
}

function getProjectTotal(project) {
  return project.items.reduce((sum, item) => sum + subtotal(item), 0);
}

function cloneProjectItems(items) {
  return items.map((item) => ({ ...item, id: createId() }));
}

function money(value) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value || 0);
}


function formatPriceRange(range) {
  const [min, max] = range;
  return `${money(min)} - ${money(max)}`;
}

function recommendedUnitPrice(range) {
  const [min, max] = range;
  return Math.round((Number(min) + Number(max)) / 2);
}

function buildTemplateItems(space, style) {
  const profile = styleProfiles[style] || styleProfiles.奶油风;
  const templates = spaceTemplates[space] || spaceTemplates.客厅;
  return templates.map(([category, baseName, size, quantity, unit, priceRange, productNote]) => ({
    id: createId(),
    space,
    category,
    name: `${profile.adjective}${baseName}`,
    spec: `常见尺寸：${size}；材质：${profile.material}；颜色：${profile.color}`,
    quantity,
    unit,
    unitPrice: recommendedUnitPrice(priceRange),
    priceRange: formatPriceRange(priceRange),
    supplier: profile.supplier,
    status: "待确认",
    note: `${style} / ${space}模板生成。${productNote}${profile.note}`,
  }));
}

function appendGeneratedItems(generatedItems, message) {
  state.items = [...state.items, ...generatedItems];
  state.pendingOnly = false;
  state.query = "";
  saveState();
  render();
  document.querySelector("#boq").scrollIntoView({ behavior: "smooth" });
  showToast(message);
}

function generateTemplate() {
  const space = elements.templateSpaceInput.value;
  const style = elements.templateStyleInput.value;
  const generatedItems = buildTemplateItems(space, style);
  appendGeneratedItems(generatedItems, `已生成 ${space} · ${style} 清单模板，共 ${generatedItems.length} 项产品`);
}

function generateAllSpacesTemplate() {
  const style = elements.templateStyleInput.value;
  const spaces = Object.keys(spaceTemplates);
  const generatedItems = spaces.flatMap((space) => buildTemplateItems(space, style));
  appendGeneratedItems(generatedItems, `已一键生成 ${spaces.length} 个空间 · ${style} 模板，共 ${generatedItems.length} 项产品`);
}

function applyLibraryTemplate() {
  const space = elements.templateSpaceInput.value;
  const style = elements.templateStyleInput.value;
  const generatedItems = buildTemplateItems(space, style);
  appendGeneratedItems(generatedItems, `已应用模板库 ${space} · ${style}，生成 ${generatedItems.length} 项软装清单`);
}

function setLibraryCard(card) {
  activeLibraryCard = card;
  renderTemplateLibrary();
}

function selectLibrarySpace(space) {
  elements.templateSpaceInput.value = space;
  activeLibraryCard = "space";
  renderTemplateLibrary();
  showToast(`已切换空间模板：${space}`);
}

function selectLibraryStyle(style) {
  elements.templateStyleInput.value = style;
  activeLibraryCard = "style";
  renderTemplateLibrary();
  showToast(`已切换风格推荐：${style}`);
}

function selectDeliveryMode(mode) {
  state.exportMode = mode;
  state.clientMode = mode === "client";
  activeLibraryCard = "mode";
  saveState();
  render();
  showToast(`已切换为${deliveryModes[mode].title}`);
}

function renderTemplateLibrary() {
  const cards = elements.templateLibraryCards.querySelectorAll("[data-library-card]");
  cards.forEach((card) => {
    const isActive = card.dataset.libraryCard === activeLibraryCard;
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-expanded", String(isActive));
  });

  if (!activeLibraryCard) {
    elements.templateLibraryPanel.innerHTML = "";
    return;
  }

  if (activeLibraryCard === "style") {
    renderStyleLibraryPanel();
    return;
  }

  if (activeLibraryCard === "mode") {
    renderModeLibraryPanel();
    return;
  }

  renderSpaceLibraryPanel();
}

function renderSpaceLibraryPanel() {
  const selectedSpace = elements.templateSpaceInput.value;
  const categories = spaceTemplates[selectedSpace] || [];
  elements.templateLibraryPanel.innerHTML = `
    <div class="library-panel-header">
      <div>
        <p class="eyebrow">Space Template</p>
        <h4>${escapeHtml(selectedSpace)}常见软装品类预览</h4>
      </div>
      <button class="primary-button" type="button" data-library-action="apply">一键应用模板</button>
    </div>
    <div class="option-pills" role="list" aria-label="选择空间模板">
      ${librarySpaces.map((space) => `
        <button class="option-pill ${space === selectedSpace ? "is-selected" : ""}" type="button" data-library-space="${escapeHtml(space)}" role="listitem">${escapeHtml(space)}</button>
      `).join("")}
    </div>
    <div class="preview-grid space-preview">
      ${categories.map(([category, baseName, size, quantity, unit, priceRange]) => `
        <article class="preview-card">
          <span>${escapeHtml(category)}</span>
          <strong>${escapeHtml(baseName)}</strong>
          <p>${escapeHtml(size)} · ${quantity}${escapeHtml(unit)}</p>
          <small>${escapeHtml(formatPriceRange(priceRange))}</small>
        </article>
      `).join("")}
    </div>
  `;
}

function renderStyleLibraryPanel() {
  const selectedStyle = elements.templateStyleInput.value;
  const profile = styleProfiles[selectedStyle];
  elements.templateLibraryPanel.innerHTML = `
    <div class="library-panel-header">
      <div>
        <p class="eyebrow">Style Recommendation</p>
        <h4>${escapeHtml(selectedStyle)}材质、颜色与供应商备注</h4>
      </div>
      <button class="primary-button" type="button" data-library-action="apply">一键应用模板</button>
    </div>
    <div class="option-pills" role="list" aria-label="选择风格推荐">
      ${libraryStyles.map((style) => `
        <button class="option-pill ${style === selectedStyle ? "is-selected" : ""}" type="button" data-library-style="${escapeHtml(style)}" role="listitem">${escapeHtml(style)}</button>
      `).join("")}
    </div>
    <div class="preview-grid style-preview">
      <article class="preview-card emphasis"><span>推荐材质</span><strong>${escapeHtml(profile.material)}</strong><p>${escapeHtml(profile.note)}</p></article>
      <article class="preview-card"><span>推荐颜色</span><strong>${escapeHtml(profile.color)}</strong><p>将颜色同步写入上方所选空间的每一项规格说明。</p></article>
      <article class="preview-card"><span>供应商备注</span><strong>${escapeHtml(profile.supplier)}</strong><p>生成清单时自动写入供应商，并附带风格采购注意事项。</p></article>
    </div>
  `;
}

function renderModeLibraryPanel() {
  const selectedMode = state.exportMode || "client";
  elements.templateLibraryPanel.innerHTML = `
    <div class="library-panel-header">
      <div>
        <p class="eyebrow">Delivery Mode</p>
        <h4>当前导出模式：${escapeHtml(deliveryModes[selectedMode].title)}</h4>
      </div>
      <button class="primary-button" type="button" data-library-action="apply">一键应用模板</button>
    </div>
    <div class="mode-options" aria-label="选择交付模式">
      ${Object.entries(deliveryModes).map(([mode, config]) => `
        <button class="mode-option ${mode === selectedMode ? "is-selected" : ""}" type="button" data-library-mode="${mode}">
          <strong>${escapeHtml(config.title)}</strong>
          <p>${escapeHtml(config.description)}</p>
          <span>${config.fields.map(escapeHtml).join(" · ")}</span>
        </button>
      `).join("")}
    </div>
  `;
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
  const total = getProjectTotal(state);
  const area = getProjectArea(state);
  const style = getProjectStyle(state);

  elements.projectTitle.textContent = state.projectTitle;
  elements.currentProjectName.textContent = state.projectTitle;
  elements.projectMenuCurrent.textContent = state.projectTitle;
  elements.reportModeLabel.textContent = state.exportMode === "internal" ? "软装全案 · 内部采购版" : "软装全案 · 客户汇报版";
  elements.projectMeta.textContent = `${workspace.projects.length} 个项目 · 当前 ${state.items.length} 项清单 · ${area ? `${area}㎡` : "面积待补充"} · ${style}`;
  elements.searchInput.value = state.query;
  elements.exportModeInput.value = state.exportMode || "client";
  elements.clearFilterBtn.hidden = !state.pendingOnly;
  elements.clientFieldsBtn.textContent = state.clientMode ? "客户版字段：已隐藏内部字段" : "客户版字段：全字段";
  document.body.classList.toggle("client-mode", state.clientMode);

  renderProjectSwitcher();

  elements.tableBody.innerHTML = visibleItems.length
    ? visibleItems.map(renderRow).join("")
    : '<tr><td colspan="12" class="empty-cell">暂无匹配产品，请清除筛选或新增产品。</td></tr>';

  const pendingTotal = state.items.filter((item) => PENDING_STATUSES.includes(item.status)).reduce((sum, item) => sum + subtotal(item), 0);
  const confirmed = state.items.filter((item) => item.status === "客户已确认").length;
  const score = state.items.length ? Math.round((confirmed / state.items.length) * 100) : 0;

  elements.totalBudget.textContent = money(total);
  elements.totalItems.textContent = `${state.items.length} 项产品`;
  elements.confirmedCount.textContent = `${confirmed} 项`;
  elements.pendingAmount.textContent = money(pendingTotal);
  elements.purchaseScore.textContent = `${score}%`;
  renderTemplateLibrary();
}

function renderProjectSwitcher() {
  const cards = workspace.projects.map(renderProjectCard).join("");
  elements.projectDropdownList.innerHTML = cards;
  elements.sidebarProjectList.innerHTML = cards;
}

function renderProjectCard(project) {
  const isActive = project.id === state.id;
  const area = getProjectArea(project);
  const style = getProjectStyle(project);
  const itemCount = project.items.length;
  const total = getProjectTotal(project);
  const safeId = escapeHtml(project.id);

  return `
    <article class="project-card ${isActive ? "is-active" : ""}" data-project-id="${safeId}">
      <button class="project-card-main" type="button" data-project-action="switch" data-project-id="${safeId}" aria-current="${isActive ? "true" : "false"}">
        <span class="project-card-kicker">${isActive ? "当前项目" : "点击切换"}</span>
        <strong>${escapeHtml(project.projectTitle)}</strong>
        <span class="project-card-meta">${area ? `${area}㎡` : "面积待补充"} · ${escapeHtml(style)}</span>
      </button>
      <dl class="project-card-stats">
        <div><dt>清单</dt><dd>${itemCount} 项</dd></div>
        <div><dt>总预算</dt><dd>${money(total)}</dd></div>
      </dl>
      <div class="project-card-actions" aria-label="项目操作">
        <button type="button" data-project-action="switch" data-project-id="${safeId}">切换</button>
        <button type="button" data-project-action="rename" data-project-id="${safeId}">重命名</button>
        <button type="button" data-project-action="duplicate" data-project-id="${safeId}">复制</button>
        <button class="danger" type="button" data-project-action="delete" data-project-id="${safeId}">删除</button>
      </div>
    </article>`;
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
      <td class="price-range customer-hidden">${escapeHtml(item.priceRange || formatPriceRange([Number(item.unitPrice || 0), Number(item.unitPrice || 0)]))}</td>
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
  elements.priceRangeInput.value = item?.priceRange || "";
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
    priceRange: elements.priceRangeInput.value.trim(),
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
  const isClientReport = state.exportMode !== "internal";
  const headers = isClientReport
    ? ["空间", "品类", "产品名称", "常见尺寸/材质/颜色", "数量", "单位", "建议单价区间", "预算小计", "状态", "客户备注"]
    : ["空间", "品类", "产品名称", "常见尺寸/材质/颜色", "数量", "单位", "建议单价区间", "执行单价", "预算小计", "供应商", "状态", "内部备注"];
  const rows = state.items.map((item) => isClientReport
    ? [item.space, item.category, item.name, item.spec, item.quantity, item.unit, item.priceRange || "", subtotal(item), item.status, customerNote(item)]
    : [item.space, item.category, item.name, item.spec, item.quantity, item.unit, item.priceRange || "", item.unitPrice, subtotal(item), item.supplier, item.status, item.note]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const modeName = isClientReport ? "客户汇报版" : "内部采购版";
  link.href = URL.createObjectURL(blob);
  link.download = `${state.projectTitle.replace(/[\\/:*?"<>|]/g, "-")}-${modeName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`已导出 ${modeName} CSV`);
}

function customerNote(item) {
  if (item.status === "需复核尺寸") return "待现场复尺后锁定尺寸与预算。";
  if (item.status === "采购询价中") return "正在进行多方比价，保留同风格备选。";
  return item.status === "备选推荐" ? "作为风格与预算备选项。" : "已纳入当前汇报清单。";
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
  const area = normalizeArea(window.prompt("请输入项目面积（㎡，可留空）", extractArea(name) || ""));
  const style = window.prompt("请输入项目风格（可留空）", inferProjectStyle(name) === "待定风格" ? "" : inferProjectStyle(name))?.trim() || "待定风格";
  const project = { ...defaultProject(), projectTitle: name.trim(), area, style, items: [] };
  workspace.projects.push(project);
  workspace.activeProjectId = project.id;
  state = project;
  closeProjectMenu();
  saveState();
  render();
  showToast("已新增并自动切换到新项目");
}

function switchProject(projectId) {
  const nextProject = workspace.projects.find((project) => project.id === projectId);
  if (!nextProject) return;
  workspace.activeProjectId = projectId;
  state = nextProject;
  closeProjectMenu();
  saveState();
  render();
  showToast(`已切换到「${state.projectTitle}」`);
}

function renameProject(projectId) {
  const project = workspace.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  const nextName = window.prompt("请输入新的项目名称", project.projectTitle);
  if (!nextName?.trim()) return;
  const nextArea = normalizeArea(window.prompt("请输入项目面积（㎡，可留空）", getProjectArea(project) || ""));
  const nextStyle = window.prompt("请输入项目风格（可留空）", getProjectStyle(project))?.trim() || "待定风格";
  project.projectTitle = nextName.trim();
  project.area = nextArea;
  project.style = nextStyle;
  saveState();
  render();
  showToast("已更新项目名称与基础信息");
}

function duplicateProject(projectId) {
  const project = workspace.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  const copy = {
    ...project,
    id: createId(),
    projectTitle: `${project.projectTitle} 副本`,
    items: cloneProjectItems(project.items),
  };
  workspace.projects.push(copy);
  workspace.activeProjectId = copy.id;
  state = copy;
  closeProjectMenu();
  saveState();
  render();
  showToast("已复制项目并切换到副本");
}

function deleteProject(projectId) {
  const project = workspace.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  if (workspace.projects.length === 1) {
    showToast("至少保留一个项目，无法删除最后一个项目");
    return;
  }
  if (!window.confirm(`确认删除项目“${project.projectTitle}”？此操作不会保留该项目清单。`)) return;
  workspace.projects = workspace.projects.filter((entry) => entry.id !== projectId);
  if (workspace.activeProjectId === projectId) {
    workspace.activeProjectId = workspace.projects[0].id;
    state = workspace.projects[0];
  }
  closeProjectMenu();
  saveState();
  render();
  showToast("已删除项目");
}

function handleProjectAction(event) {
  const button = event.target.closest("[data-project-action]");
  if (!button) return;
  const { projectAction, projectId } = button.dataset;
  if (projectAction === "switch") switchProject(projectId);
  if (projectAction === "rename") renameProject(projectId);
  if (projectAction === "duplicate") duplicateProject(projectId);
  if (projectAction === "delete") deleteProject(projectId);
}

function openProjectMenu() {
  elements.projectDropdown.hidden = false;
  elements.projectMenuBtn.setAttribute("aria-expanded", "true");
}

function closeProjectMenu() {
  elements.projectDropdown.hidden = true;
  elements.projectMenuBtn.setAttribute("aria-expanded", "false");
}

function toggleProjectMenu() {
  if (elements.projectDropdown.hidden) {
    openProjectMenu();
  } else {
    closeProjectMenu();
  }
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
elements.generateTemplateBtn.addEventListener("click", generateTemplate);
elements.generateAllSpacesBtn.addEventListener("click", generateAllSpacesTemplate);
elements.templateSpaceInput.addEventListener("change", () => {
  activeLibraryCard = "space";
  renderTemplateLibrary();
});
elements.templateStyleInput.addEventListener("change", () => {
  activeLibraryCard = "style";
  renderTemplateLibrary();
});
elements.templateLibraryCards.addEventListener("click", (event) => {
  const card = event.target.closest("[data-library-card]");
  if (!card) return;
  setLibraryCard(card.dataset.libraryCard);
});
elements.templateLibraryPanel.addEventListener("click", (event) => {
  const spaceButton = event.target.closest("[data-library-space]");
  if (spaceButton) {
    selectLibrarySpace(spaceButton.dataset.librarySpace);
    return;
  }

  const styleButton = event.target.closest("[data-library-style]");
  if (styleButton) {
    selectLibraryStyle(styleButton.dataset.libraryStyle);
    return;
  }

  const modeButton = event.target.closest("[data-library-mode]");
  if (modeButton) {
    selectDeliveryMode(modeButton.dataset.libraryMode);
    return;
  }

  const applyButton = event.target.closest("[data-library-action='apply']");
  if (applyButton) applyLibraryTemplate();
});
elements.newProjectBtn.addEventListener("click", addProject);
elements.dropdownNewProjectBtn.addEventListener("click", addProject);
elements.sidebarNewProjectBtn.addEventListener("click", addProject);
elements.projectMenuBtn.addEventListener("click", toggleProjectMenu);
elements.projectDropdownList.addEventListener("click", handleProjectAction);
elements.sidebarProjectList.addEventListener("click", handleProjectAction);
document.addEventListener("click", (event) => {
  if (!elements.projectSwitcher.contains(event.target)) closeProjectMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProjectMenu();
});
elements.exportModeInput.addEventListener("change", (event) => {
  state.exportMode = event.target.value;
  state.clientMode = event.target.value === "client";
  saveState();
  render();
  showToast(state.exportMode === "client" ? "已切换为客户汇报版导出" : "已切换为内部采购版导出");
});
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
