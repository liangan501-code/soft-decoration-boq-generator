const STORAGE_KEY = "maison-boq-state-v1";
const CURRENT_DATA_VERSION = 7;
const KNOWN_LEGACY_STORAGE_KEYS = [
  "maison-boq-state-v1",
  "maison-boq-state",
  "maison-boq-state-v6",
  "boq-state",
  "projects",
  "currentProject",
  "maison-projects",
  "soft-decoration-boq",
  "maison-boq-workspace-v2",
  "maison-boq-project",
];
const LEGACY_KEY_PATTERN = /(boq|maison|project|soft|decor)/i;
let detectedLegacySnapshots = [];
function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PENDING_STATUSES = ["待确认", "采购询价中", "需复核尺寸"];
const REQUIRED_UPLOAD_MESSAGE = "请先上传平面图和效果图 / 软装方案，系统需要根据图纸与空间效果生成清单。";
const PROJECT_SUBTYPES = {
  家装: ["私宅", "大平层", "别墅", "复式", "公寓"],
  工装: ["样板间", "售楼处", "会所", "酒店", "办公空间", "商业公区"],
};
const RESIDENTIAL_SPACES = ["客厅", "餐厅", "主卧", "次卧", "玄关", "书房"];
const COMMERCIAL_SPACES = ["样板间客厅", "样板间餐厅", "主卧", "次卧", "玄关", "洽谈区", "沙盘区", "VIP室", "会所休闲区", "公区"];
const UPLOAD_COLLECTIONS = {
  floorPlans: { label: "平面图", status: "floorPlanUploadStatus", preview: "floorPlanPreview" },
  renderings: { label: "效果图 / 软装方案", status: "renderingUploadStatus", preview: "renderingPreview" },
};
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const LARGE_IMAGE_SIZE = 2 * 1024 * 1024;
const IMAGE_COMPRESSION_QUALITY = 0.78;
const IMAGE_COMPRESSION_SETTINGS = {
  floorPlans: { maxEdge: 1200, label: "平面图", storageNotice: "已压缩至最长边 1200px" },
  renderings: { maxEdge: 1200, label: "效果图 / 软装方案", storageNotice: "已保存压缩预览图，用于生成清单参考" },
  product: { maxEdge: 1200, label: "产品彩图", storageNotice: "已压缩至最长边 1200px" },
  material: { maxEdge: 800, label: "材料样板贴图", storageNotice: "已压缩至最长边 800px" },
};
const IMAGE_DB_NAME = "maison-boq-images-v1";
const IMAGE_STORE_NAME = "images";
const STORAGE_WARNING_MESSAGE = "浏览器存储空间不足，请删除部分图片或清理未使用图片。";
const PRODUCT_IMAGE_SOURCES = new Set(["ai-generated", "manual-upload", "placeholder"]);
const PRODUCT_IMAGE_CROPS = {
  full: { label: "智能聚焦单品", className: "crop-full", viewBox: "48 36 224 168", preserveAspectRatio: "xMidYMid slice" },
  topLeft: { label: "聚焦左上单品", className: "crop-top-left", viewBox: "0 0 224 168", preserveAspectRatio: "xMinYMin slice" },
  center: { label: "聚焦中间单品", className: "crop-center", viewBox: "48 36 224 168", preserveAspectRatio: "xMidYMid slice" },
  bottomRight: { label: "聚焦右下单品", className: "crop-bottom-right", viewBox: "96 72 224 168", preserveAspectRatio: "xMaxYMax slice" },
};
const PRODUCT_LIGHTBOX_ZOOM_STEP = 0.25;
const PRODUCT_LIGHTBOX_MIN_ZOOM = 0.5;
const PRODUCT_LIGHTBOX_MAX_ZOOM = 3;
let productLightboxZoom = 1;
let materialSwatchZoom = 1;

const defaultProject = () => ({
  id: createId(),
  name: "滨江私宅 240㎡ 软装 BOQ 管理",
  clientName: "",
  projectCategory: "家装",
  projectSubtype: "私宅",
  projectType: "私宅软装",
  area: 240,
  style: "雅奢",
  targetBudget: 0,
  remark: "",
  attachments: { floorPlans: [], renderings: [] },
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
  现代东方: { adjective: "现代东方", material: "胡桃木、宣纸肌理、亚麻、深色石材", color: "烟墨灰 / 米白 / 暖木色", supplier: "Oriental Modern Studio", note: "以留白、比例和材质肌理表达东方气质，避免符号堆砌。" },
  香奈儿风: { adjective: "香奈儿感", material: "粗花呢、黑白石材、珍珠金属、丝绒", color: "珍珠白 / 黑色 / 香槟金", supplier: "Coco Luxe Décor", note: "控制黑白对比和金属点缀比例，软装细节强调精致边线。" },
  艺术馆风: { adjective: "艺术馆感", material: "微水泥、洞石、金属、艺术玻璃", color: "暖白 / 石灰 / 低饱和焦点色", supplier: "Gallery Home Lab", note: "强调留白、灯光洗墙和艺术品尺度，保留展陈呼吸感。" },
};


const styleProductNames = {
  奶油风: {
    主沙发: "奶油柔模块沙发",
    茶几: "奶油系弧形茶几",
    边几: "奶油圆润边几",
    地毯: "奶油羊毛地毯",
    装饰画: "奶油肌理装饰画",
    落地灯: "奶油雾面落地灯",
    餐桌: "奶油系餐厅主餐桌",
    餐椅: "奶油布艺餐椅",
    吊灯: "奶油风弧形吊灯",
    床: "奶油软包床",
    床头柜: "奶油圆角床头柜",
    床品: "奶油亲肤床品套装",
    窗帘: "奶油遮光窗帘",
  },
  中古风: {
    主沙发: "中古胡桃木框架沙发",
    茶几: "胡桃木茶几",
    边几: "胡桃木边几",
    地毯: "中古感羊毛地毯",
    装饰画: "抽象肌理装饰画",
    落地灯: "复古金属落地灯",
    休闲椅: "中古皮革休闲椅",
    餐桌: "胡桃木中古餐桌",
    餐椅: "中古皮革餐椅",
    吊灯: "复古金属吊灯",
    床: "中古胡桃木床",
    床头柜: "中古胡桃木床头柜",
    床品: "复古棉麻床品套装",
    窗帘: "中古亚麻窗帘",
  },
  轻奢风: {
    主沙发: "金属线条沙发",
    茶几: "岩板茶几",
    边几: "香槟金边几",
    地毯: "轻奢丝感地毯",
    装饰画: "轻奢金属框装饰画",
    落地灯: "轻奢金属落地灯",
    吊灯: "轻奢金属吊灯",
  },
  法式: {
    主沙发: "法式弧形沙发",
    茶几: "法式雕花茶几",
    边几: "法式雕花边几",
    地毯: "法式花纹羊毛地毯",
    装饰画: "法式复古装饰画",
    落地灯: "复古黄铜落地灯",
    吊灯: "黄铜玻璃吊灯",
    餐桌: "法式雕花圆餐桌",
    餐椅: "法式藤编餐椅",
    餐边柜: "法式复古餐边柜",
    餐边柜摆件: "法式复古餐边柜",
    桌旗: "亚麻餐桌布",
    花艺: "法式花艺中心摆件",
  },
  雅奢: {
    主沙发: "定制皮革沙发",
    茶几: "雅奢大理石茶几",
    边几: "雅奢金属边几",
    地毯: "雅奢手工羊毛地毯",
    装饰画: "艺术肌理挂画",
    落地灯: "雅奢拉丝金属落地灯",
  },
  度假风: {
    主沙发: "亚麻布艺沙发",
    茶几: "柚木休闲茶几",
    边几: "藤编边几",
    地毯: "自然肌理地毯",
    装饰画: "海岛肌理装饰画",
    落地灯: "藤编落地灯",
    休闲椅: "藤编休闲椅",
  },
  黑金风: {
    主沙发: "黑金皮革沙发",
    茶几: "深色岩板茶几",
    边几: "黑钛金属边几",
    地毯: "深灰羊毛地毯",
    装饰画: "黑金抽象装饰画",
    落地灯: "金属质感落地灯",
    餐桌: "黑色岩板餐桌",
    餐椅: "黑金皮革餐椅",
    吊灯: "金属线性吊灯",
    餐边柜摆件: "黑金吧柜陈设组合",
    桌旗: "黑金皮革餐垫",
  },
};


const BOQ_TEMPLATES = {
  奶油风: {
    客厅: [
      {
        category: "主沙发",
        name: "奶油柔模块沙发",
        specs: "常见尺寸：3200 × 980 × 720mm；材质：羊羔绒、微水泥、浅橡木；颜色：奶油白、杏仁米、暖咖",
        quantity: 1,
        unit: "套",
        suggestedPrice: "¥32,000 - ¥68,000",
        unitPrice: 50000,
        supplier: "Cream Atelier",
        status: "待确认",
        internalNote: "奶油风客厅核心单品，建议选择圆角模块与低饱和暖白面料。",
      },
      {
        category: "茶几",
        name: "奶油系弧形茶几",
        specs: "常见尺寸：Φ900 × 360mm + Φ600 × 420mm；材质：微水泥、浅橡木、哑光烤漆；颜色：奶油白/杏仁米",
        quantity: 1,
        unit: "组",
        suggestedPrice: "¥6,800 - ¥18,000",
        unitPrice: 12400,
        supplier: "Cream Atelier",
        status: "待确认",
        internalNote: "建议与奶油柔模块沙发保持圆润线条呼应。",
      },
      {
        category: "地毯",
        name: "奶油羊毛地毯",
        specs: "常见尺寸：2400 × 3400mm；材质：羊毛混纺、短绒；颜色：奶油白、暖米色",
        quantity: 1,
        unit: "张",
        suggestedPrice: "¥7,500 - ¥22,000",
        unitPrice: 14750,
        supplier: "Cream Atelier",
        status: "待确认",
        internalNote: "建议选短绒易清洁材质，强化同色系层次。",
      },
    ],
  },
  中古风: {
    客厅: [
      {
        category: "沙发",
        name: "中古胡桃木框架沙发",
        specs: "常见尺寸：3200 × 980 × 720mm；材质：胡桃木框架、复古皮革/羊毛混纺；颜色：胡桃木色、焦糖棕、橄榄绿",
        quantity: 1,
        unit: "套",
        suggestedPrice: "¥32,000 - ¥68,000",
        unitPrice: 45000,
        supplier: "Mid-Century Gallery",
        status: "待确认",
        internalNote: "中古风客厅核心单品，建议搭配胡桃木茶几和复古金属落地灯。",
      },
      {
        category: "茶几",
        name: "胡桃木复古茶几",
        specs: "常见尺寸：1200 × 700 × 380mm；材质：胡桃木、藤编、复古五金；颜色：胡桃木色/焦糖棕",
        quantity: 1,
        unit: "张",
        suggestedPrice: "¥8,000 - ¥22,000",
        unitPrice: 14800,
        supplier: "Mid-Century Gallery",
        status: "待确认",
        internalNote: "建议与中古沙发形成材质呼应。",
      },
      {
        category: "地毯",
        name: "中古感羊毛手工地毯",
        specs: "常见尺寸：3000 × 4000mm；材质：羊毛、低饱和复古纹样；颜色：驼色、橄榄绿、焦糖棕",
        quantity: 1,
        unit: "张",
        suggestedPrice: "¥12,000 - ¥28,000",
        unitPrice: 18600,
        supplier: "Mid-Century Gallery",
        status: "待确认",
        internalNote: "建议选低饱和复古纹样，增强空间层次。",
      },
    ],
  },
};

const styleSpaceTemplateOverrides = {
  奶油风: {
    餐厅: [
      ["餐桌", "奶油系餐厅主餐桌", "2200 × 1000 × 750mm", 1, "张", [18000, 52000], "微水泥或浅橡木台面，边角保持圆润柔和。"],
      ["餐椅", "奶油布艺餐椅", "520 × 560 × 780mm", 6, "把", [1800, 6800], "建议选奶油白易清洁布艺，与餐桌形成同色系层次。"],
      ["吊灯", "奶油风弧形吊灯", "L1200-1600mm，3000K", 1, "组", [6800, 24000], "弧形灯体呼应餐桌圆角，桌面上方 700-800mm 安装。"],
      ["餐边柜摆件", "奶油陶瓷餐边柜陈设", "托盘 + 陶瓷花器 + 艺术书", 1, "组", [2200, 8800], "控制米白、杏仁米与暖咖比例，避免色差突兀。"],
      ["桌旗", "奶油亚麻桌旗", "350 × 2200mm", 1, "条", [600, 2600], "亚麻纹理提升细节，可搭配同色系餐垫。"],
    ],
  },
  中古风: {
    客厅: [
      ["主沙发", "中古胡桃木框架沙发", "3200 × 980 × 720mm", 1, "套", [36000, 72000], "胡桃木框架需与茶几、边几木色同批确认。"],
      ["茶几", "胡桃木茶几", "1200 × 650 × 380mm", 1, "张", [8800, 22000], "保留木纹肌理，台面高度需匹配沙发坐高。"],
      ["休闲椅", "中古皮革休闲椅", "780 × 820 × 760mm", 1, "把", [6800, 18000], "皮革颜色建议选焦糖棕或深棕，与胡桃木形成层次。"],
      ["地毯", "中古感羊毛地毯", "2400 × 3400mm", 1, "张", [8500, 24000], "可选择低饱和几何纹样，覆盖沙发前脚。"],
      ["落地灯", "复古金属落地灯", "H1550-1700mm，2700K-3000K", 1, "盏", [3600, 12000], "金属件建议做旧铜或黑钛，作为夜间氛围光。"],
      ["边几", "胡桃木边几", "Φ450 × 520mm", 2, "只", [2600, 7800], "可放置落地灯、艺术书或小型雕塑。"],
      ["装饰画", "抽象肌理装饰画", "1200 × 1600mm", 1, "幅", [5200, 19000], "画面选择橄榄绿、暖棕或米灰呼应整体色板。"],
    ],
    餐厅: [
      ["餐桌", "胡桃木中古餐桌", "2200 × 1000 × 750mm", 1, "张", [22000, 56000], "胡桃木纹理需与客厅木作色号统一。"],
      ["餐椅", "中古皮革餐椅", "520 × 560 × 780mm", 6, "把", [2600, 7800], "皮革建议焦糖棕或橄榄绿，坐感需提前试坐。"],
      ["吊灯", "复古金属吊灯", "L1400-1800mm，2700K-3000K", 1, "组", [7800, 26000], "做旧金属或黑钛灯体，避免亮面金属过新。"],
      ["餐边柜摆件", "中古陶木餐边柜陈设", "托盘 + 陶器 + 复古艺术书", 1, "组", [2600, 9800], "陈设色彩呼应胡桃木、焦糖棕与橄榄绿。"],
      ["桌旗", "复古棉麻餐旗", "350 × 2200mm", 1, "条", [800, 3200], "选择低饱和纹样，增强中古层次。"],
    ],
  },
  法式: {
    餐厅: [
      ["餐桌", "法式雕花圆餐桌", "Φ1350-1500 × 760mm", 1, "张", [26000, 68000], "雕花桌脚与珍珠白或复古米漆面需提前确认样板。"],
      ["餐椅", "法式藤编餐椅", "520 × 580 × 820mm", 6, "把", [2800, 8800], "藤编靠背搭配棉麻坐垫，坐垫颜色与墙面花线呼应。"],
      ["吊灯", "黄铜玻璃吊灯", "Φ700-900mm，2700K-3000K", 1, "组", [9800, 32000], "黄铜与玻璃比例保持轻盈，吊装居中于圆餐桌。"],
      ["餐边柜", "法式复古餐边柜", "1800 × 450 × 850mm", 1, "组", [18000, 48000], "柜门线条与空间花线统一，预留咖啡机和插座位置。"],
      ["桌布", "亚麻餐桌布", "适配 Φ1500mm 圆桌，下垂 250-300mm", 1, "条", [1200, 4200], "优先选复古米或珍珠白亚麻，拍摄前熨烫。"],
      ["花艺", "法式花艺中心摆件", "H350-500mm，圆桌中心陈设", 1, "组", [1800, 6800], "选择低饱和玫瑰、绣球或自然枝材，避免遮挡对坐视线。"],
    ],
  },
  黑金风: {
    餐厅: [
      ["餐桌", "黑色岩板餐桌", "2200 × 1000 × 750mm", 1, "张", [24000, 62000], "岩板纹理控制低对比，边缘需倒角防磕碰。"],
      ["餐椅", "黑金皮革餐椅", "520 × 560 × 780mm", 6, "把", [2600, 8800], "皮革与金属脚颜色需统一为黑金或古铜金。"],
      ["吊灯", "金属线性吊灯", "L1400-1800mm，2700K-3000K", 1, "组", [8800, 28000], "线性灯需与餐桌长轴居中，控制眩光。"],
      ["餐边柜摆件", "黑金吧柜陈设组合", "金属托盘 + 深色花器 + 艺术书", 1, "组", [2800, 9800], "高反光材质不宜过多，保留哑光黑层次。"],
      ["桌旗", "黑金皮革餐垫", "450 × 300mm，6 只", 1, "组", [900, 3600], "餐垫与餐椅皮革色号统一。"],
    ],
  },
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
  样板间: [
    ["主沙发", "样板间定制沙发", "3200 × 980 × 720mm", 1, "套", [38000, 88000], "优先保证展示面完整和拍照角度，坐感与比例同时复核。"],
    ["茶几", "岩板展示茶几", "1200 × 700 × 360mm", 1, "张", [12000, 36000], "材质需耐磨易清洁，适配批量交付。"],
    ["边几", "金属边几", "Φ450 × 520mm", 2, "只", [3600, 9800], "用于形成镜头前景和洽谈动线停顿。"],
    ["地毯", "艺术地毯", "2600 × 3600mm", 1, "张", [12000, 32000], "兼顾展示效果、耐踩踏和拍摄质感。"],
    ["装饰画", "大幅装饰画", "1200 × 1800mm", 1, "幅", [6800, 26000], "作为传播主画面，需与效果图主色统一。"],
    ["雕塑摆件", "雕塑摆件组合", "台面 + 落地组合", 1, "组", [4800, 22000], "增强售楼样板间记忆点，注意交付防损。"],
    ["花艺", "空间花艺", "茶几 + 玄关 + 餐桌", 1, "组", [3600, 16000], "拍摄前统一整理，选择可维护仿真花材。"],
    ["氛围灯具", "氛围灯具组合", "落地灯 / 台灯 2700K-3000K", 1, "组", [6800, 28000], "补足夜景和拍照层次，避免眩光。"],
  ],
  售楼处: [
    ["接待台陈设", "接待台艺术陈设", "托盘 + 花器 + 品牌书", 1, "组", [6800, 26000], "体现项目第一印象，材质需耐用易维护。"],
    ["洽谈桌", "洽谈区圆桌", "Φ900-1100 × 750mm", 4, "张", [6800, 22000], "满足多组客户并行洽谈，便于批量采购。"],
    ["洽谈椅", "耐磨洽谈椅", "560 × 580 × 780mm", 16, "把", [1800, 6800], "坐感、耐磨、清洁便利性优先。"],
    ["艺术装置", "售楼处艺术装置", "按端景定制", 1, "组", [18000, 88000], "强化传播记忆点，需提前确认交付周期。"],
    ["绿植花艺", "公区绿植花艺", "H600-1800mm 组合", 1, "批", [8000, 36000], "用于组织动线和柔化空间尺度。"],
  ],
  洽谈区: [
    ["洽谈桌", "圆形洽谈桌", "Φ900 × 750mm", 1, "张", [6800, 26000], "满足 3-4 人沟通和方案摊开展示。"],
    ["洽谈椅", "舒适洽谈椅", "560 × 580 × 780mm", 4, "把", [1800, 7800], "坐感优先，面料需耐磨。"],
    ["地毯", "洽谈区地毯", "2000 × 2000mm", 1, "张", [4200, 16000], "用于界定洽谈区边界。"],
    ["吊灯", "洽谈区装饰灯", "Φ600-800mm，3000K", 1, "盏", [3800, 16000], "避免眩光直射客户视线。"],
    ["绿植", "大型造景绿植", "H1200-1600mm", 1, "组", [1800, 8600], "可提升空间停留感和亲和度。"],
  ],
  沙盘区: [
    ["沙盘围合软装", "沙盘区围合陈设", "导览围合 + 艺术托盘", 1, "组", [8000, 32000], "不遮挡沙盘视线，组织客户观看动线。"],
    ["导视摆件", "精装导视摆件", "台面导视 + 材质样板", 1, "组", [3600, 16000], "帮助销售讲解户型与材质卖点。"],
    ["氛围灯具", "沙盘辅助氛围灯", "局部 3000K", 1, "组", [6800, 26000], "提升沙盘层次，避免屏幕与模型反光。"],
  ],
  VIP室: [
    ["会客沙发", "VIP会客沙发", "2800 × 950 × 720mm", 1, "套", [36000, 86000], "兼顾私密洽谈与高端接待。"],
    ["会客茶几", "VIP会客茶几", "1200 × 700 × 380mm", 1, "张", [12000, 36000], "台面耐磨，便于放置资料和饮品。"],
    ["单椅", "VIP休闲单椅", "780 × 820 × 760mm", 2, "把", [8800, 28000], "形成围合式沟通，坐感优先。"],
    ["艺术品", "VIP室艺术品", "900 × 1200mm", 1, "幅", [6800, 28000], "突出私享氛围和项目调性。"],
  ],
  会所休闲区: [
    ["休闲沙发", "会所休闲沙发", "组合模块", 1, "组", [42000, 120000], "适合长时间停留，面料需耐磨易清洁。"],
    ["休闲椅", "会所休闲椅", "780 × 820 × 760mm", 4, "把", [6800, 22000], "便于灵活组合和拍照传播。"],
    ["茶几边几", "会所茶几边几组合", "多尺寸组合", 1, "组", [16000, 52000], "满足饮品、书籍和陈设摆放。"],
    ["绿植", "会所大型绿植", "H1500-2200mm", 1, "批", [6800, 28000], "提升松弛感和空间边界。"],
  ],
  公区: [
    ["公区坐凳", "公区耐磨坐凳", "1200 × 450 × 430mm", 4, "张", [4200, 16000], "考虑人流、耐用性和维护成本。"],
    ["端景装置", "公区端景艺术装置", "按点位定制", 1, "组", [18000, 98000], "形成记忆点并服务导流。"],
    ["绿植组合", "公区绿植组合", "多点位", 1, "批", [12000, 48000], "耐阴、易维护，交付后可持续养护。"],
    ["导视陈设", "导视与陈设组合", "导视牌 + 艺术摆件", 1, "组", [6800, 26000], "提升动线体验和项目形象。"],
  ],
};

const librarySpaces = Object.keys(spaceTemplates);
const libraryStyles = Object.keys(styleProfiles);
const deliveryModes = {
  client: {
    title: "客户汇报版",
    description: "隐藏供应商、内部备注、采购成本，适合客户评审与方案汇报。",
    fields: ["空间", "品类", "软装产品彩图", "材料样板贴图", "常见尺寸", "材质建议", "预算小计", "客户版备注"],
  },
  internal: {
    title: "内部采购版",
    description: "显示供应商、单价、内部备注、采购状态，适合采购询价与落地执行。",
    fields: ["供应商", "执行单价", "内部备注", "采购状态"],
  },
};

const MATERIAL_SWATCH_RECIPES = {
  餐桌: ["stone", "wood", "metal"],
  餐椅: ["fabric", "leather", "metal", "wood"],
  吊灯: ["metal", "glass", "acrylic"],
  地毯: ["carpet", "velvet", "pattern"],
  艺术摆件: ["ceramic", "metal", "stone"],
  摆件: ["ceramic", "metal", "stone"],
  茶几: ["stone", "wood", "metal", "glass"],
  边几: ["stone", "wood", "metal"],
  沙发: ["fabric", "leather", "wood"],
  主沙发: ["fabric", "leather", "wood"],
  休闲椅: ["fabric", "leather", "wood", "metal"],
  单椅: ["leather", "fabric", "metal"],
  窗帘: ["fabric", "linen", "sheer"],
  床: ["fabric", "leather", "wood"],
  床品: ["fabric", "linen", "pattern"],
  装饰画: ["canvas", "wood", "metal"],
  落地灯: ["metal", "fabric", "glass"],
};

const MATERIAL_STYLE_LABELS = {
  奶油风: { stone: "米白石材", wood: "浅橡木", metal: "浅金金属", fabric: "奶油布艺", leather: "米灰皮革", glass: "柔白玻璃", acrylic: "雾面亚克力", carpet: "奶油绒毯", velvet: "短绒面", pattern: "浅色纹理", ceramic: "米白陶瓷", linen: "亚麻", sheer: "柔光纱", canvas: "肌理画布" },
  中古风: { stone: "暖灰洞石", wood: "胡桃木", metal: "做旧铜", fabric: "橄榄布艺", leather: "复古皮革", glass: "茶色玻璃", acrylic: "琥珀亚克力", carpet: "手工羊毛", velvet: "复古绒面", pattern: "几何纹理", ceramic: "手作陶瓷", linen: "棉麻", sheer: "米灰纱", canvas: "抽象画布" },
  轻奢风: { stone: "象牙岩板", wood: "烟熏木", metal: "香槟金属", fabric: "丝绒布艺", leather: "雾灰皮革", glass: "白玻璃", acrylic: "透光亚克力", carpet: "丝感地毯", velvet: "低光丝绒", pattern: "轻奢纹理", ceramic: "亮釉陶瓷", linen: "精纺布", sheer: "柔雾纱", canvas: "金属框画布" },
  法式: { stone: "米色石材", wood: "雕花木", metal: "雾金金属", fabric: "奶油布艺", leather: "复古皮革", glass: "白玻璃", acrylic: "乳白亚克力", carpet: "法式花纹", velvet: "柔雾绒面", pattern: "卷草纹理", ceramic: "珍珠陶瓷", linen: "棉麻", sheer: "法式纱", canvas: "复古画布" },
  雅奢: { stone: "暖灰大理石", wood: "深咖木饰面", metal: "古铜金属", fabric: "混纺面料", leather: "细纹真皮", glass: "烟灰玻璃", acrylic: "雾面亚克力", carpet: "手工羊毛", velvet: "哑光绒面", pattern: "低饱和纹理", ceramic: "艺术陶瓷", linen: "高级亚麻", sheer: "暖灰纱", canvas: "肌理画布" },
  度假风: { stone: "沙色洞石", wood: "柚木", metal: "哑光铜", fabric: "亚麻布艺", leather: "自然皮革", glass: "清透玻璃", acrylic: "海盐亚克力", carpet: "自然编织", velvet: "短绒面", pattern: "棕榈纹理", ceramic: "手工陶", linen: "粗织亚麻", sheer: "海盐纱", canvas: "自然画布" },
  黑金风: { stone: "黑色岩板", wood: "深色木饰面", metal: "黑钛金属", fabric: "深灰布艺", leather: "黑色皮革", glass: "黑晶玻璃", acrylic: "曜石亚克力", carpet: "深灰羊毛", velvet: "黑金绒面", pattern: "暗纹纹理", ceramic: "黑釉陶瓷", linen: "黑灰织物", sheer: "烟灰纱", canvas: "黑金画布" },
  现代东方: { stone: "深色石材", wood: "胡桃木", metal: "哑光铜", fabric: "亚麻布艺", leather: "深棕皮革", glass: "烟墨玻璃", acrylic: "宣纸亚克力", carpet: "东方织纹", velvet: "墨色绒面", pattern: "留白纹理", ceramic: "手作陶", linen: "亚麻", sheer: "宣纸纱", canvas: "水墨画布" },
};

const MATERIAL_BASE_COLORS = {
  stone: ["#f2eadc", "#b8aa98", "#8f887d"], wood: ["#8a5f3d", "#5b3824", "#c69a67"], metal: ["#e3c875", "#9d7935", "#f7e5a6"], fabric: ["#efe4d2", "#c8b79e", "#fff8ec"], leather: ["#9b6740", "#5b3523", "#d39b66"], glass: ["#eef4f1", "#b9cbc6", "#ffffff"], acrylic: ["#f6f1e8", "#d5cbbd", "#ffffff"], carpet: ["#e9dcc8", "#b79f82", "#f8f0e3"], velvet: ["#c8b28e", "#7e694c", "#ead8b8"], pattern: ["#efe6d7", "#9b8d78", "#d7c6ac"], ceramic: ["#f6efe3", "#c5b191", "#fffaf1"], linen: ["#eadcc6", "#b8a186", "#fff7e8"], sheer: ["#fbf7ef", "#ddd1c1", "#ffffff"], canvas: ["#ece0ce", "#b9a78f", "#fffaf1"], acrylic: ["#f4eee8", "#cbbfaf", "#ffffff"]
};


let workspace;
try {
  workspace = loadWorkspace();
} catch (error) {
  console.error("项目数据迁移失败，已进入安全恢复模式", error);
  workspace = createSafeRecoveryWorkspace();
  window.__maisonStartupError = error;
}
let state = getActiveProject();
let clientMode = false;
let exportMode = "client";
let pendingOnly = false;
let query = "";
let activeLibraryCard = null;
let currentGenerationContext = null;
if (!window.__maisonStartupError) saveState();

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
  projectNameInput: document.querySelector("#projectNameInput"),
  clientNameInput: document.querySelector("#clientNameInput"),
  projectAreaInput: document.querySelector("#projectAreaInput"),
  projectCategoryInput: document.querySelector("#projectCategoryInput"),
  projectSubtypeInput: document.querySelector("#projectSubtypeInput"),
  targetBudgetInput: document.querySelector("#targetBudgetInput"),
  projectRemarkInput: document.querySelector("#projectRemarkInput"),
  floorPlanInput: document.querySelector("#floorPlanInput"),
  renderingInput: document.querySelector("#renderingInput"),
  floorPlanUploadBtn: document.querySelector("#floorPlanUploadBtn"),
  renderingUploadBtn: document.querySelector("#renderingUploadBtn"),
  floorPlanUploadStatus: document.querySelector("#floorPlanUploadStatus"),
  renderingUploadStatus: document.querySelector("#renderingUploadStatus"),
  floorPlanPreview: document.querySelector("#floorPlanPreview"),
  renderingPreview: document.querySelector("#renderingPreview"),
  uploadRequirementText: document.querySelector("#uploadRequirementText"),
  aiGeneratorHint: document.querySelector("#aiGeneratorHint"),
  generateTemplateBtn: document.querySelector("#generateTemplateBtn"),
  generateAllSpacesBtn: document.querySelector("#generateAllSpacesBtn"),
  templateLibraryCards: document.querySelector("#templateLibraryCards"),
  templateLibraryPanel: document.querySelector("#templateLibraryPanel"),
  exportModeInput: document.querySelector("#exportModeInput"),
  newProjectBtn: document.querySelector("#newProjectBtn"),
  importBtn: document.querySelector("#importBtn"),
  backupExportBtn: document.querySelector("#backupExportBtn"),
  backupImportBtn: document.querySelector("#backupImportBtn"),
  legacyRecoveryBtn: document.querySelector("#legacyRecoveryBtn"),
  legacyRecoveryDialog: document.querySelector("#legacyRecoveryDialog"),
  closeLegacyRecoveryBtn: document.querySelector("#closeLegacyRecoveryBtn"),
  legacyRecoveryList: document.querySelector("#legacyRecoveryList"),
  backupFileInput: document.querySelector("#backupFileInput"),
  restoreSamplesBtn: document.querySelector("#restoreSamplesBtn"),
  cleanupUnusedImagesBtn: document.querySelector("#cleanupUnusedImagesBtn"),
  deleteAllImagesBtn: document.querySelector("#deleteAllImagesBtn"),
  uploadBackupExportBtn: document.querySelector("#uploadBackupExportBtn"),
  uploadRestoreSamplesBtn: document.querySelector("#uploadRestoreSamplesBtn"),
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
  clientNoteInput: document.querySelector("#clientNoteInput"),
  customerVisibleInput: document.querySelector("#customerVisibleInput"),
  formSubtotal: document.querySelector("#formSubtotal"),
  suggestionDialog: document.querySelector("#suggestionDialog"),
  renderingPickerDialog: document.querySelector("#renderingPickerDialog"),
  renderingPickerGrid: document.querySelector("#renderingPickerGrid"),
  closeRenderingPickerBtn: document.querySelector("#closeRenderingPickerBtn"),
  productImageLightbox: document.querySelector("#productImageLightbox"),
  productLightboxTitle: document.querySelector("#productLightboxTitle"),
  productLightboxImage: document.querySelector("#productLightboxImage"),
  productLightboxStage: document.querySelector("#productLightboxStage"),
  closeProductLightboxBtn: document.querySelector("#closeProductLightboxBtn"),
  productZoomInBtn: document.querySelector("#productZoomInBtn"),
  productZoomOutBtn: document.querySelector("#productZoomOutBtn"),
  productZoomResetBtn: document.querySelector("#productZoomResetBtn"),
  materialSwatchDialog: document.querySelector("#materialSwatchDialog"),
  closeMaterialSwatchBtn: document.querySelector("#closeMaterialSwatchBtn"),
  materialSwatchImage: document.querySelector("#materialSwatchImage"),
  materialSwatchName: document.querySelector("#materialSwatchName"),
  materialSwatchType: document.querySelector("#materialSwatchType"),
  materialSwatchProduct: document.querySelector("#materialSwatchProduct"),
  materialSwatchNote: document.querySelector("#materialSwatchNote"),
  materialSwatchZoomInBtn: document.querySelector("#materialSwatchZoomInBtn"),
  materialSwatchZoomOutBtn: document.querySelector("#materialSwatchZoomOutBtn"),
  materialSwatchZoomResetBtn: document.querySelector("#materialSwatchZoomResetBtn"),
  closeSuggestionBtn: document.querySelector("#closeSuggestionBtn"),
  toast: document.querySelector("#toast"),
};

function safeAddEventListener(target, eventName, handler, options) {
  if (!target?.addEventListener) return false;
  target.addEventListener(eventName, (event) => {
    try {
      handler(event);
    } catch (error) {
      console.error(`按钮事件执行失败: ${eventName}`, error);
      safeShowToast("操作执行失败，请先导出备份并刷新页面重试");
    }
  }, options);
  return true;
}

function safeClick(element, handler) {
  return safeAddEventListener(element, "click", handler);
}

function runWhenDomReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
    return;
  }
  callback();
}

function createSafeRecoveryWorkspace() {
  const snapshots = scanStorageSnapshots();
  detectedLegacySnapshots = snapshots;
  const recovered = snapshots.flatMap((snapshot) => snapshot.workspace?.projects || []);
  if (recovered.length) {
    const projects = dedupeProjects(recovered.map((project) => normalizeProject(project)));
    return { version: CURRENT_DATA_VERSION, activeProjectId: projects[0].id, projects };
  }
  const project = normalizeProject({ ...defaultProject(), name: "安全恢复空项目", items: [] });
  return { version: CURRENT_DATA_VERSION, activeProjectId: project.id, projects: [project] };
}

function enterSafeRecoveryMode(error) {
  const projectCount = detectedLegacySnapshots.reduce((sum, snapshot) => sum + (snapshot.projectCount || 0), 0);
  const itemCount = detectedLegacySnapshots.reduce((sum, snapshot) => sum + (snapshot.itemCount || 0), 0);
  const banner = document.createElement("section");
  banner.className = "safe-recovery-mode panel";
  banner.innerHTML = `
    <div>
      <p class="eyebrow">安全恢复模式</p>
      <h3>检测到旧数据</h3>
      <p>新版数据迁移未能完全执行，原始 localStorage key 已保留，您可以先恢复或导出旧数据。</p>
      <p>可恢复的项目数量：<strong>${projectCount}</strong> · 可恢复的清单数量：<strong>${itemCount}</strong></p>
      ${error ? `<p class="safe-recovery-error">错误信息：${escapeHtml(error.message || String(error))}</p>` : ""}
    </div>
    <div class="safe-recovery-actions">
      <button class="primary-button" type="button" data-safe-recovery-action="restore">恢复旧数据</button>
      <button class="ghost-button" type="button" data-safe-recovery-action="export">导出旧数据备份</button>
      <button class="ghost-button" type="button" data-safe-recovery-action="continue">继续使用空项目</button>
    </div>
  `;
  const main = document.querySelector("main") || document.body;
  main.prepend(banner);
  safeAddEventListener(banner, "click", (event) => {
    const action = event.target.closest("[data-safe-recovery-action]")?.dataset.safeRecoveryAction;
    if (!action) return;
    if (action === "restore") {
      detectedLegacySnapshots.forEach((snapshot) => mergeRecoveredWorkspace(snapshot.workspace));
      saveState();
      render();
      safeShowToast(`已恢复 ${projectCount} 个旧项目`);
      banner.remove();
    }
    if (action === "export") exportLegacySnapshotsBackup();
    if (action === "continue") banner.remove();
  });
}

function exportLegacySnapshotsBackup() {
  const payload = { exportedAt: new Date().toISOString(), source: "safe-recovery-mode", snapshots: detectedLegacySnapshots };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `maison-boq-legacy-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function loadWorkspace() {
  detectedLegacySnapshots = scanStorageSnapshots();
  const currentSnapshot = detectedLegacySnapshots.find((snapshot) => snapshot.key === STORAGE_KEY);
  const legacySnapshots = detectedLegacySnapshots.filter((snapshot) => snapshot.key !== STORAGE_KEY);

  if (legacySnapshots.length) {
    const baseWorkspace = currentSnapshot?.workspace && !isSampleOnlyWorkspace(currentSnapshot.workspace)
      ? currentSnapshot.workspace
      : { version: CURRENT_DATA_VERSION, activeProjectId: "", projects: [] };
    const merged = mergeWorkspaces(baseWorkspace, legacySnapshots.map((snapshot) => snapshot.workspace));
    if (merged.projects.length) return normalizeWorkspace(merged);
  }

  if (currentSnapshot?.workspace?.projects?.length) return normalizeWorkspace(currentSnapshot.workspace);

  const project = normalizeProject(defaultProject());
  return { version: CURRENT_DATA_VERSION, activeProjectId: project.id, projects: [project] };
}

function scanStorageSnapshots() {
  const keys = getCandidateStorageKeys();
  return keys.map((key) => {
    try {
      const raw = readStorageValue(key);
      const migrated = migrateLegacyData(raw, key);
      if (!migrated?.projects?.length) return null;
      const workspaceValue = normalizeWorkspace(migrated);
      return {
        key,
        workspace: workspaceValue,
        projectCount: workspaceValue.projects.length,
        itemCount: workspaceValue.projects.reduce((sum, project) => sum + (project.items?.length || 0), 0),
        projectNames: workspaceValue.projects.map((project) => project.name),
      };
    } catch (error) {
      console.warn(`迁移旧数据失败，已保留原始 key: ${key}`, error);
      return null;
    }
  }).filter(Boolean);
}

function getCandidateStorageKeys() {
  const keys = new Set(KNOWN_LEGACY_STORAGE_KEYS);
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && LEGACY_KEY_PATTERN.test(key)) keys.add(key);
    }
  } catch (error) {
    console.warn("扫描 localStorage 旧数据失败", error);
  }
  return [...keys];
}

function isSampleOnlyWorkspace(value) {
  const projects = value?.projects || [];
  return projects.length === 1 && /滨江私宅 240㎡/.test(projects[0]?.name || "");
}

function mergeWorkspaces(baseWorkspace, incomingWorkspaces = []) {
  const hasBaseProjects = Array.isArray(baseWorkspace?.projects) && baseWorkspace.projects.length > 0;
  const merged = hasBaseProjects
    ? normalizeWorkspace(baseWorkspace)
    : { version: CURRENT_DATA_VERSION, activeProjectId: "", projects: [] };
  if (isSampleOnlyWorkspace(merged)) merged.projects = [];
  incomingWorkspaces.forEach((workspaceValue) => {
    normalizeWorkspace(workspaceValue).projects.forEach((project) => appendRecoveredProject(merged, project));
  });
  if (!merged.projects.length) {
    const project = normalizeProject(defaultProject());
    merged.projects = [project];
  }
  merged.activeProjectId = merged.activeProjectId && merged.projects.some((project) => project.id === merged.activeProjectId)
    ? merged.activeProjectId
    : merged.projects[0].id;
  merged.version = CURRENT_DATA_VERSION;
  return merged;
}

function appendRecoveredProject(targetWorkspace, project) {
  const normalized = normalizeProject(project);
  const signature = getProjectSignature(normalized);
  if ((targetWorkspace.projects || []).some((entry) => getProjectSignature(entry) === signature)) return;
  const existingNames = new Set((targetWorkspace.projects || []).map((entry) => entry.name));
  const existingIds = new Set((targetWorkspace.projects || []).map((entry) => entry.id));
  if (existingIds.has(normalized.id)) normalized.id = createId();
  if (existingNames.has(normalized.name)) normalized.name = createRecoveredProjectName(normalized.name, existingNames);
  targetWorkspace.projects.push(normalized);
}

function getProjectSignature(project) {
  return [project.name, project.clientName || "", project.area || "", project.items?.length || 0, project.items?.[0]?.productName || project.items?.[0]?.name || ""].join("|");
}

function createRecoveredProjectName(name, existingNames) {
  const base = `${name}（恢复版）`;
  if (!existingNames.has(base)) return base;
  let index = 2;
  while (existingNames.has(`${base}${index}`)) index += 1;
  return `${base}${index}`;
}


async function scanIndexedDbSnapshots() {
  if (!globalThis.indexedDB?.databases) return [];
  try {
    const databases = await indexedDB.databases();
    const candidates = (databases || []).filter((database) => database?.name && LEGACY_KEY_PATTERN.test(database.name));
    const snapshots = [];
    for (const database of candidates) {
      const db = await openExistingIndexedDb(database.name).catch(() => null);
      if (!db) continue;
      const storeNames = [...db.objectStoreNames];
      for (const storeName of storeNames) {
        const values = await readAllFromIndexedDbStore(db, storeName).catch(() => []);
        values.forEach((value, index) => {
          const migrated = migrateLegacyData(value, `IndexedDB:${database.name}/${storeName}`);
          if (!migrated?.projects?.length) return;
          const workspaceValue = normalizeWorkspace(migrated);
          snapshots.push({
            key: `IndexedDB:${database.name}/${storeName}#${index + 1}`,
            workspace: workspaceValue,
            projectCount: workspaceValue.projects.length,
            itemCount: workspaceValue.projects.reduce((sum, project) => sum + (project.items?.length || 0), 0),
            projectNames: workspaceValue.projects.map((project) => project.name),
          });
        });
      }
      db.close();
    }
    return snapshots;
  } catch (error) {
    console.warn("扫描 IndexedDB 旧数据失败", error);
    return [];
  }
}

function openExistingIndexedDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("IndexedDB 打开失败")));
    request.addEventListener("blocked", () => reject(new Error("IndexedDB 被占用")));
  });
}

function readAllFromIndexedDbStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.addEventListener("success", () => resolve(request.result || []));
    request.addEventListener("error", () => reject(request.error || new Error("IndexedDB 读取失败")));
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("IndexedDB 读取中断")));
  });
}

async function recoverIndexedDbLegacyData() {
  const snapshots = await scanIndexedDbSnapshots();
  if (!snapshots.length) return;
  detectedLegacySnapshots = [...detectedLegacySnapshots, ...snapshots];
  const addedBefore = workspace.projects.length;
  snapshots.forEach((snapshot) => mergeRecoveredWorkspace(snapshot.workspace));
  if (workspace.projects.length > addedBefore) {
    await migrateInlineImagesToIndexedDb();
    saveState();
    render();
    showToast(`已从 IndexedDB 恢复 ${workspace.projects.length - addedBefore} 个旧项目`);
  }
}

function readStorageValue(key) {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn(`无法读取本地数据 ${key}`, error);
    return null;
  }
}

function migrateLegacyData(value, sourceKey = "旧版数据") {
  if (!value) return null;
  if (Array.isArray(value?.projects)) return { ...value, version: CURRENT_DATA_VERSION };
  if (Array.isArray(value)) {
    const project = normalizeProject({ id: createId(), name: getRecoveredProjectTitle(sourceKey), items: value });
    return { version: CURRENT_DATA_VERSION, activeProjectId: project.id, projects: [project] };
  }
  if (Array.isArray(value?.items) || value?.projectTitle || value?.name || value?.currentProject) {
    const projectSource = value.currentProject && !Array.isArray(value.items) ? value.currentProject : value;
    const project = normalizeProject(projectSource);
    return { version: CURRENT_DATA_VERSION, activeProjectId: project.id, projects: [project] };
  }
  if (Array.isArray(value?.list) || Array.isArray(value?.boqItems)) {
    const project = normalizeProject({ ...value, items: value.list || value.boqItems });
    return { version: CURRENT_DATA_VERSION, activeProjectId: project.id, projects: [project] };
  }
  return null;
}

function getRecoveredProjectTitle(sourceKey = "") {
  return sourceKey === "projects" ? "旧版项目数据" : `旧版恢复项目（${sourceKey}）`;
}

function normalizeWorkspace(value) {
  const rawProjects = Array.isArray(value?.projects) && value.projects.length ? value.projects : null;
  const projects = rawProjects ? rawProjects.map(normalizeProject) : [defaultProject()];
  const uniqueProjects = dedupeProjects(projects);
  const activeProjectId = uniqueProjects.some((project) => project.id === value?.activeProjectId)
    ? value.activeProjectId
    : uniqueProjects[0].id;
  return { version: CURRENT_DATA_VERSION, activeProjectId, projects: uniqueProjects };
}

function dedupeProjects(projects) {
  const seen = new Set();
  return projects.map((project) => {
    if (!seen.has(project.id)) {
      seen.add(project.id);
      return project;
    }
    const copy = { ...project, id: createId() };
    seen.add(copy.id);
    return copy;
  });
}

function normalizeProject(project = {}) {
  const fallback = defaultProject();
  const name = project.name || project.projectName || project.projectTitle || fallback.name;
  const projectStyle = project.style || inferProjectStyle(name);
  const rawItems = project.items || project.boqItems || project.list || [];
  const items = Array.isArray(rawItems) ? rawItems.map((item, index) => normalizeItem(item, index, projectStyle)) : [];
  const projectCategory = PROJECT_SUBTYPES[project.projectCategory] ? project.projectCategory : inferProjectCategory(project.projectType);
  const projectSubtype = normalizeSubtype(project.projectSubType || project.projectSubtype || project.subType || project.projectType, projectCategory);
  return {
    id: project.id || createId(),
    name,
    clientName: project.clientName || "",
    projectCategory,
    projectSubtype,
    projectSubType: projectSubtype,
    projectType: project.projectType || `${projectSubtype}软装`,
    area: normalizeArea(project.area ?? extractArea(name)),
    style: projectStyle,
    targetBudget: Number(project.targetBudget || 0),
    remark: project.remark || project.notes || "",
    floorPlans: normalizeAttachmentList(project.floorPlans || project.attachments?.floorPlans),
    renderings: normalizeAttachmentList(project.renderings || project.attachments?.renderings),
    attachments: normalizeAttachments(project.attachments || { floorPlans: project.floorPlans, renderings: project.renderings }),
    items,
  };
}

function normalizeItem(item = {}, index = 0, projectStyle = "雅奢") {
  const productName = item.productName || item.name || item.title || "未命名产品";
  const size = item.size || item.specs || item.spec || extractSizeFromLegacySpec(item.materialDescription) || "按图纸复核";
  const materialSuggestion = item.materialSuggestion || item.materialDescription || item.priceRange || extractMaterialSuggestionFromLegacySpec(item.spec || item.specs) || item.note || "待确认材质、颜色与工艺";
  const unitPrice = Number(item.unitPrice || item.suggestedPrice || item.price || 0);
  const quantity = Number(item.quantity || 0);
  const inferredSource = inferProductImageSource(item);
  const productImageUploaded = inferredSource === "manual-upload";
  const normalizedBase = {
    ...item,
    productName,
    name: productName,
    category: item.category || "待分类",
    materialSuggestion,
    priceRange: materialSuggestion,
  };
  const materialSwatches = normalizeMaterialSwatches(item.materialSwatches || item.materialSampleImages || item.materialSwatchImages || item.materialSwatchesImages, normalizedBase, projectStyle);
  return {
    id: item.id || createId(),
    code: formatItemCode(index),
    space: item.space || "未分区",
    category: item.category || "待分类",
    productImage: item.productImage || (item.productImageStorageKey ? "" : createProductPlaceholderImage(item.category || "待分类", projectStyle)),
    productImageSource: inferredSource,
    productImageCrop: normalizeProductImageCrop(item.productImageCrop),
    productImageUploaded,
    productImageStorageKey: item.productImageStorageKey || "",
    productImageStorage: item.productImageStorage || (item.productImageStorageKey ? "indexedDB" : "localStorage"),
    productName,
    size,
    quantity,
    unit: item.unit || "件",
    materialSuggestion,
    unitPrice,
    supplier: item.supplier || "",
    subtotal: Number(item.subtotal || quantity * unitPrice),
    status: item.status || "待确认",
    materialSwatches,
    materialSampleImages: normalizeMaterialSampleImages(item.materialSampleImages || item.materialSwatchImages || item.sampleImages),
    clientNote: item.clientNote || item.customerNote || item.internalNote || "",
    clientVisible: item.clientVisible ?? item.customerVisible ?? true,
    name: productName,
    spec: size,
    priceRange: materialSuggestion,
    note: item.note || item.internalNote || item.remark || "",
    customerVisible: item.clientVisible ?? item.customerVisible ?? true,
  };
}

function inferProductImageSource(item = {}) {
  if (PRODUCT_IMAGE_SOURCES.has(item.productImageSource)) return item.productImageSource;
  if (item.productImageUploaded || item.productImageStorageKey || (item.productImage && !isPlaceholderImage(item.productImage) && !item.productImageSource)) return "manual-upload";
  if (item.productImageSource === "uploaded-rendering") return "placeholder";
  return "placeholder";
}

function normalizeProductImageCrop(crop) {
  if (!crop) return null;
  if (typeof crop === "string") return PRODUCT_IMAGE_CROPS[crop] ? { type: crop } : null;
  return PRODUCT_IMAGE_CROPS[crop.type] ? { type: crop.type } : null;
}

function normalizeMaterialSampleImages(images = []) {
  return Array.isArray(images)
    ? images.filter(Boolean).slice(0, 3).map((image) => typeof image === "string" ? { id: createId(), dataUrl: image, name: "材料样板" } : {
      id: image.id || createId(),
      name: image.name || "材料样板",
      type: image.type || "image/*",
      size: Number(image.size || 0),
      dataUrl: image.dataUrl || image.url || "",
      storageKey: image.storageKey || "",
      storage: image.storage || (image.storageKey ? "indexedDB" : "localStorage"),
      uploadedAt: image.uploadedAt || new Date().toISOString(),
    }).filter((image) => image.dataUrl || image.storageKey)
    : [];
}


function normalizeMaterialSwatches(swatches = [], product = {}, projectStyle = getProjectStyle(state || {})) {
  const normalized = Array.isArray(swatches)
    ? swatches.filter(Boolean).slice(0, 4).map((swatch) => normalizeMaterialSwatch(swatch, product, projectStyle)).filter(Boolean)
    : [];
  const manualSwatches = normalized.filter((swatch) => swatch.source === "manual-upload");
  const currentGeneratedSwatches = normalized.filter((swatch) => swatch.source !== "manual-upload" && swatch.style === projectStyle);
  if (manualSwatches.length) {
    const recommended = generateMaterialSwatchesFromProduct({ ...product, style: projectStyle });
    return [...manualSwatches, ...recommended.filter((swatch) => !manualSwatches.some((manual) => manual.id === swatch.id))].slice(0, 4);
  }
  if (currentGeneratedSwatches.length) return currentGeneratedSwatches.slice(0, 4);
  return generateMaterialSwatchesFromProduct({ ...product, style: projectStyle }).slice(0, 4);
}

function normalizeMaterialSwatch(swatch, product = {}, projectStyle = getProjectStyle(state || {})) {
  if (typeof swatch === "string") return materialSampleToSwatch({ id: createId(), dataUrl: swatch, name: "材料样板" }, product);
  const type = swatch.type || inferSwatchType(`${swatch.name || ""} ${product.category || ""} ${product.materialSuggestion || product.priceRange || ""}`);
  const normalized = {
    id: swatch.id || createId(),
    name: swatch.name || getMaterialLabel(type, projectStyle),
    type,
    category: swatch.category || getMaterialTypeName(type),
    image: swatch.image || swatch.dataUrl || swatch.url || "",
    dataUrl: swatch.dataUrl || swatch.image || swatch.url || "",
    source: swatch.source || (swatch.storageKey ? "manual-upload" : "mock-ai"),
    note: swatch.note || buildSwatchNote(type, product),
    productName: swatch.productName || product.productName || product.name || product.category || "软装产品",
    storageKey: swatch.storageKey || "",
    storage: swatch.storage || (swatch.storageKey ? "indexedDB" : "inline-svg"),
    style: swatch.style || projectStyle,
    shortLabel: swatch.shortLabel || swatch.name || getMaterialLabel(type, projectStyle),
  };
  normalized.image = normalized.image || createMaterialSwatchImage(normalized);
  normalized.dataUrl = normalized.dataUrl || normalized.image;
  return normalized;
}

function materialSampleToSwatch(sample, product = {}) {
  return normalizeMaterialSwatch({
    id: sample.id || createId(),
    name: sample.name || "上传样板",
    type: sample.type?.startsWith?.("image/") ? inferSwatchType(product.materialSuggestion || product.category) : sample.type,
    image: sample.dataUrl || sample.image || "",
    dataUrl: sample.dataUrl || sample.image || "",
    source: "manual-upload",
    note: "手动上传的真实材料样板，可与自动推荐贴图并存。",
    storageKey: sample.storageKey || "",
    storage: sample.storage || (sample.storageKey ? "indexedDB" : "localStorage"),
  }, product, getProjectStyle(state));
}

function generateMaterialSwatchesFromProduct(product = {}) {
  const style = product.style || getProjectStyle(state || {}) || "雅奢";
  const category = product.category || "软装";
  const materialText = `${category} ${product.productName || product.name || ""} ${product.materialSuggestion || product.priceRange || ""}`;
  const recipe = getMaterialRecipe(category, materialText).slice(0, 4);
  return recipe.map((type, index) => normalizeMaterialSwatch({
    id: buildGeneratedSwatchId(product, style, type, index),
    name: getMaterialLabel(type, style),
    type,
    source: "mock-ai",
    note: buildSwatchNote(type, product),
    style,
  }, product, style));
}

function generateMaterialSwatchesFromReferenceImages(product = {}, uploadedImages = []) {
  const uploaded = uploadedImages.map((image) => materialSampleToSwatch(image, product));
  const generated = generateMaterialSwatchesFromProduct({ ...product, sourceImages: uploadedImages.length });
  return [...uploaded, ...generated].slice(0, 4);
}

function buildSwatchPreviewData(product = {}) {
  const uploadedImages = normalizeMaterialSampleImages(product.materialSampleImages);
  const swatches = uploadedImages.length
    ? generateMaterialSwatchesFromReferenceImages(product, uploadedImages)
    : normalizeMaterialSwatches(product.materialSwatches, product, getProjectStyle(state));
  product.materialSwatches = swatches.slice(0, 4);
  return product.materialSwatches;
}

function getMaterialRecipe(category = "", materialText = "") {
  const recipes = getMaterialSwatchRecipes();
  const directKey = Object.keys(recipes).find((key) => category.includes(key) || materialText.includes(key));
  if (directKey) return recipes[directKey];
  const inferred = ["wood", "stone", "metal", "fabric", "leather", "glass", "carpet", "ceramic"].filter((type) => materialText.includes(getMaterialTypeName(type).replace(/材|面|纹理/g, "")) || materialText.includes(getMaterialLabel(type, getProjectStyle(state))));
  return inferred.length ? inferred : getDefaultMaterialRecipe();
}

function getMaterialSwatchRecipes() {
  try {
    if (MATERIAL_SWATCH_RECIPES && typeof MATERIAL_SWATCH_RECIPES === "object") return MATERIAL_SWATCH_RECIPES;
  } catch (error) {
    console.warn("材料样板配置尚未完成初始化，已使用默认配置", error);
  }
  return { 软装: getDefaultMaterialRecipe() };
}

function getDefaultMaterialRecipe() {
  return ["fabric", "wood", "metal"];
}

function buildGeneratedSwatchId(product, style, type, index) {
  const base = `${product.id || product.code || product.category || "item"}-${style}-${type}-${index}`;
  return `swatch-${base}`.replace(/[^\w\u4e00-\u9fa5-]+/g, "-");
}

function inferSwatchType(text = "") {
  if (/木|胡桃|橡木|柚木|木饰面/.test(text)) return "wood";
  if (/石|岩板|大理石|洞石/.test(text)) return "stone";
  if (/金|铜|不锈钢|钛|金属/.test(text)) return "metal";
  if (/皮|真皮|皮革/.test(text)) return "leather";
  if (/玻璃/.test(text)) return "glass";
  if (/亚克力/.test(text)) return "acrylic";
  if (/毯|羊毛|绒|织/.test(text)) return "carpet";
  if (/陶/.test(text)) return "ceramic";
  return "fabric";
}

function getMaterialLabel(type, style = "雅奢") {
  return MATERIAL_STYLE_LABELS[style]?.[type] || MATERIAL_STYLE_LABELS.雅奢[type] || getMaterialTypeName(type);
}

function getMaterialTypeName(type) {
  return ({ wood: "木饰面", stone: "石材", metal: "金属", fabric: "布艺", leather: "皮革", glass: "玻璃", acrylic: "亚克力", carpet: "地毯纹理", velvet: "绒面", pattern: "图案纹理", ceramic: "陶瓷", linen: "亚麻", sheer: "纱帘", canvas: "画布" })[type] || "综合材质";
}

function buildSwatchNote(type, product = {}) {
  const category = product.category || "软装产品";
  const use = ({ stone: "建议用于桌面、台面或重点饰面。", wood: "建议用于框架、柜体或温润底座。", metal: "建议用于脚架、灯体或收口线条。", fabric: "建议用于坐面、靠包、窗帘或软包。", leather: "建议用于椅面、扶手或高触感软包。", glass: "建议用于灯罩、台面或通透层次。", acrylic: "建议用于灯罩、装饰件或轻透结构。", carpet: "建议用于地毯主材，关注脚感与耐污。", velvet: "建议用于局部软包或高级触感表面。", pattern: "建议用于地毯、床品或装饰面层。", ceramic: "建议用于艺术摆件、花器或陈设。", linen: "建议用于窗帘、床品与松弛感软包。", sheer: "建议用于纱帘与柔光层。", canvas: "建议用于装饰画肌理与框画表面。" })[type] || "建议结合现场色板复核。";
  return `${category}自动推荐：${use}`;
}

function createMaterialSwatchImage(swatch = {}) {
  const type = swatch.type || "fabric";
  const colors = MATERIAL_BASE_COLORS[type] || MATERIAL_BASE_COLORS.fabric;
  const name = swatch.name || getMaterialTypeName(type);
  const texture = getMaterialTextureSvg(type, colors);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="${escapeHtml(name)}材料样板"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .16"/></feComponentTransfer></filter></defs><rect width="240" height="240" rx="18" fill="url(#bg)"/><rect width="240" height="240" rx="18" filter="url(#grain)" opacity=".55"/>${texture}<rect x="10" y="10" width="220" height="220" rx="14" fill="none" stroke="rgba(255,250,241,.42)" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getMaterialTextureSvg(type, colors) {
  if (type === "wood") return `<path d="M20 50c44-28 78 12 120-12 36-21 56-4 80 12M10 105c48-24 78 22 124-5 34-20 62 2 92 16M18 164c52-22 82 20 132-8 30-17 50-5 72 12" fill="none" stroke="${colors[2]}" stroke-opacity=".42" stroke-width="8" stroke-linecap="round"/>`;
  if (type === "stone") return `<path d="M-20 70c65 28 92-36 154-8 44 20 70 5 126-20M-10 176c58-22 90 26 142-2 42-23 70-9 118 10" fill="none" stroke="${colors[2]}" stroke-opacity=".36" stroke-width="5"/><path d="M58 0c-8 54 26 80 9 132-10 32 0 70 22 108" fill="none" stroke="#fffaf1" stroke-opacity=".22" stroke-width="3"/>`;
  if (type === "metal") return `<rect width="240" height="240" fill="url(#bg)"/><path d="M-30 210L210-30M20 250L250 20M-40 100L100-40" stroke="#fff5d7" stroke-opacity=".26" stroke-width="18"/><path d="M0 0h240v240H0z" fill="${colors[2]}" opacity=".08"/>`;
  if (["fabric", "linen", "sheer"].includes(type)) return `<path d="M0 45h240M0 92h240M0 139h240M0 186h240M45 0v240M92 0v240M139 0v240M186 0v240" stroke="${colors[2]}" stroke-opacity=".24" stroke-width="2"/>`;
  if (["carpet", "velvet"].includes(type)) return `<g stroke="${colors[2]}" stroke-opacity=".35" stroke-width="3">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 22} 0c16 24-16 42 0 66s-16 42 0 66-16 42 0 108"/>`).join("")}</g>`;
  if (type === "pattern") return `<g fill="none" stroke="${colors[2]}" stroke-opacity=".34" stroke-width="5">${Array.from({ length: 4 }, (_, i) => `<circle cx="${60 + i * 42}" cy="${70 + (i % 2) * 54}" r="28"/>`).join("")}</g>`;
  if (["glass", "acrylic"].includes(type)) return `<path d="M20 210L210 20" stroke="#fff" stroke-opacity=".55" stroke-width="22"/><path d="M80 236L236 80" stroke="#fff" stroke-opacity=".32" stroke-width="10"/>`;
  return `<circle cx="62" cy="62" r="34" fill="${colors[2]}" opacity=".2"/><circle cx="168" cy="142" r="52" fill="#fffaf1" opacity=".16"/>`;
}

function extractSizeFromLegacySpec(spec = "") {
  const text = String(spec || "");
  if (!text) return "";
  return text.replace(/^常见尺寸：/, "").split(/[；;]/)[0].trim();
}

function extractMaterialSuggestionFromLegacySpec(spec = "") {
  const text = String(spec || "");
  const material = text.match(/材质：([^；;]+)/)?.[1]?.trim();
  const color = text.match(/颜色：([^；;]+)/)?.[1]?.trim();
  return [material, color].filter(Boolean).join(" / ");
}

function inferProjectCategory(projectType = "") {
  const text = String(projectType || "");
  if (PROJECT_SUBTYPES.工装.some((subtype) => text.includes(subtype)) || /售楼处|会所|酒店|办公|商业|公区|样板/.test(text)) return "工装";
  return "家装";
}

function normalizeSubtype(value = "", category = "家装") {
  const subtypes = PROJECT_SUBTYPES[category] || PROJECT_SUBTYPES.家装;
  const text = String(value || "");
  return subtypes.find((subtype) => text.includes(subtype)) || subtypes[0];
}

function normalizeAttachments(attachments = {}) {
  return {
    floorPlans: normalizeAttachmentList(attachments.floorPlans),
    renderings: normalizeAttachmentList(attachments.renderings),
  };
}

function normalizeAttachmentList(list = []) {
  return Array.isArray(list)
    ? list.filter((file) => file?.dataUrl || file?.storageKey).map((file) => ({
      id: file.id || createId(),
      name: file.name || "未命名图片",
      type: file.type || "image/*",
      size: Number(file.size || 0),
      dataUrl: file.dataUrl || "",
      storageKey: file.storageKey || "",
      storage: file.storage || (file.storageKey ? "indexedDB" : "localStorage"),
      storageNotice: file.storageNotice || "",
      uploadedAt: file.uploadedAt || new Date().toISOString(),
    }))
    : [];
}

function getActiveProject() {
  const active = workspace.projects.find((project) => project.id === workspace.activeProjectId);
  return active || workspace.projects[0];
}

function createPersistedWorkspace() {
  return {
    version: CURRENT_DATA_VERSION,
    activeProjectId: workspace.activeProjectId,
    projects: workspace.projects.map((project) => ({
      id: project.id,
      name: project.name,
      clientName: project.clientName || "",
      projectCategory: project.projectCategory || "家装",
      projectSubtype: project.projectSubtype || project.projectSubType || "私宅",
      projectSubType: project.projectSubType || project.projectSubtype || "私宅",
      projectType: project.projectType || project.projectSubtype || "",
      area: normalizeArea(project.area),
      style: project.style || "待定风格",
      targetBudget: Number(project.targetBudget || 0),
      remark: project.remark || "",
      floorPlans: createPersistedAttachments(project.attachments || { floorPlans: project.floorPlans, renderings: project.renderings }).floorPlans,
      renderings: createPersistedAttachments(project.attachments || { floorPlans: project.floorPlans, renderings: project.renderings }).renderings,
      attachments: createPersistedAttachments(project.attachments || { floorPlans: project.floorPlans, renderings: project.renderings }),
      items: project.items.map((item, index) => createPersistedItem(item, index, project.style)),
    })),
  };
}


function createPersistedAttachments(attachments = {}) {
  const normalized = normalizeAttachments(attachments);
  Object.keys(UPLOAD_COLLECTIONS).forEach((collection) => {
    normalized[collection] = normalized[collection].map((file) => ({ ...file, dataUrl: "" }));
  });
  return normalized;
}

function createPersistedItem(item, index, projectStyle) {
  const normalized = normalizeItem(item, index, projectStyle);
  if (normalized.productImageSource === "manual-upload" && normalized.productImageStorageKey) {
    normalized.productImage = "";
    normalized.productImageStorage = "indexedDB";
  }
  normalized.materialSwatches = normalizeMaterialSwatches(normalized.materialSwatches, normalized, projectStyle).map((swatch) => (
    swatch.source === "manual-upload" && swatch.storageKey ? { ...swatch, image: "", dataUrl: "", storage: "indexedDB" } : swatch
  ));
  normalized.materialSampleImages = normalizeMaterialSampleImages(normalized.materialSampleImages).map((image) => (
    image.storageKey ? { ...image, dataUrl: "", storage: "indexedDB" } : { ...image, dataUrl: "" }
  ));
  return normalized;
}

function buildImageStorageKey(projectId, collection, imageId) {
  return `${projectId || "project"}:${collection}:${imageId}`;
}

function buildItemImageStorageKey(projectId, itemId, field, imageId = "main") {
  return `${projectId || "project"}:items:${itemId}:${field}:${imageId}`;
}

function collectReferencedImageKeys() {
  const keys = new Set();
  workspace.projects.forEach((project) => {
    Object.keys(UPLOAD_COLLECTIONS).forEach((collection) => {
      (project.attachments?.[collection] || []).forEach((file) => {
        if (file.storageKey) keys.add(file.storageKey);
      });
    });
    (project.items || []).forEach((item) => {
      if (item.productImageStorageKey) keys.add(item.productImageStorageKey);
      normalizeMaterialSampleImages(item.materialSampleImages).forEach((image) => {
        if (image.storageKey) keys.add(image.storageKey);
      });
    });
  });
  return keys;
}

async function cleanupUnusedImages() {
  try {
    const referencedKeys = collectReferencedImageKeys();
    const allKeys = await getAllImageKeysFromIndexedDb();
    const unusedKeys = allKeys.filter((key) => !referencedKeys.has(String(key)));
    await Promise.all(unusedKeys.map((key) => deleteImageFromIndexedDb(key)));
    showToast(`清理完成，释放了 ${unusedKeys.length} 张未使用图片`);
  } catch (error) {
    console.warn("清理未使用图片失败", error);
    showToast(classifyImageStorageError(error));
  }
}

async function deleteAllUploadedImages() {
  if (!window.confirm("确认删除全部上传图片？项目结构与清单数据会保留，但上传的平面图、效果图、产品彩图和材料样板贴图将被移除。")) return;
  const keys = collectReferencedImageKeys();
  await Promise.allSettled([...keys].map((key) => deleteImageFromIndexedDb(key)));
  workspace.projects.forEach((project) => {
    project.attachments = { floorPlans: [], renderings: [] };
    (project.items || []).forEach((item, index) => {
      item.productImageStorageKey = "";
      item.productImageStorage = "localStorage";
      item.materialSampleImages = [];
      if (item.productImageSource === "manual-upload" || item.productImageSource === "uploaded-rendering") {
        item.productImage = createProductPlaceholderImage(item.category, getProjectStyle(project));
        item.productImageSource = "placeholder";
        item.productImageCrop = null;
        item.productImageUploaded = false;
      }
      item.code = formatItemCode(index);
    });
  });
  state = getActiveProject();
  saveState();
  render();
  showToast("已删除全部上传图片，项目结构与清单数据已保留");
}

async function createBackupWorkspaceWithImages() {
  const backup = { ...createPersistedWorkspace(), exportedAt: new Date().toISOString(), imageDatabase: IMAGE_DB_NAME };
  await Promise.all(backup.projects.flatMap((project) => [
    ...Object.keys(UPLOAD_COLLECTIONS).flatMap((collection) => (project.attachments?.[collection] || []).map(async (file) => {
      if (file.storageKey) file.dataUrl = await readImageFromIndexedDb(file.storageKey).catch(() => "");
    })),
    ...(project.items || []).map(async (item) => {
      if (item.productImageStorageKey) item.productImage = await readImageFromIndexedDb(item.productImageStorageKey).catch(() => "");
      await Promise.all((item.materialSampleImages || []).map(async (image) => {
        if (image.storageKey) image.dataUrl = await readImageFromIndexedDb(image.storageKey).catch(() => "");
      }));
    }),
  ]));
  return backup;
}

async function persistImportedImagesFromBackup() {
  const jobs = [];
  workspace.projects.forEach((project) => {
    Object.keys(UPLOAD_COLLECTIONS).forEach((collection) => {
      (project.attachments?.[collection] || []).forEach((file) => {
        if (!file.dataUrl) return;
        file.storageKey = file.storageKey || buildImageStorageKey(project.id, collection, file.id);
        file.storage = "indexedDB";
        jobs.push(saveImageToIndexedDb(file.storageKey, file.dataUrl));
      });
    });
    (project.items || []).forEach((item) => {
      if (item.productImage && item.productImageSource === "manual-upload") {
        item.productImageStorageKey = item.productImageStorageKey || buildItemImageStorageKey(project.id, item.id, "productImage");
        item.productImageStorage = "indexedDB";
        jobs.push(saveImageToIndexedDb(item.productImageStorageKey, item.productImage));
      }
      item.materialSampleImages = normalizeMaterialSampleImages(item.materialSampleImages).map((image) => {
        if (!image.dataUrl) return image;
        const storageKey = image.storageKey || buildItemImageStorageKey(project.id, item.id, "materialSampleImages", image.id);
        jobs.push(saveImageToIndexedDb(storageKey, image.dataUrl));
        return { ...image, storageKey, storage: "indexedDB" };
      });
    });
  });
  const results = await Promise.allSettled(jobs);
  if (results.some((result) => result.status === "rejected")) throw new Error("浏览器存储空间不足，请删除部分图片或清理未使用图片");
}

function openImageDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("当前浏览器不支持 IndexedDB"));
      return;
    }
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(IMAGE_STORE_NAME);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("IndexedDB 打开失败")));
  });
}

async function withImageStore(mode, callback) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, mode);
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    let request;
    try {
      request = callback(store);
    } catch (error) {
      reject(error);
      db.close();
      return;
    }
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("IndexedDB 操作失败")));
    transaction.addEventListener("complete", () => db.close());
    transaction.addEventListener("abort", () => {
      db.close();
      reject(transaction.error || new Error("IndexedDB 写入中断"));
    });
  });
}

function saveImageToIndexedDb(key, dataUrl) {
  return withImageStore("readwrite", (store) => store.put(dataUrl, key));
}

function readImageFromIndexedDb(key) {
  return withImageStore("readonly", (store) => store.get(key));
}

function deleteImageFromIndexedDb(key) {
  return withImageStore("readwrite", (store) => store.delete(key));
}

function getAllImageKeysFromIndexedDb() {
  return withImageStore("readonly", (store) => store.getAllKeys());
}

function classifyImageStorageError(error) {
  const message = String(error?.message || error || "");
  if (!globalThis.indexedDB || /不支持 IndexedDB/i.test(message)) return "当前浏览器不支持 IndexedDB";
  if (/quota|storage|空间|存储|exceeded|full/i.test(message) || error?.name === "QuotaExceededError") {
    return "浏览器存储空间不足，请删除部分图片或清理未使用图片";
  }
  return message || "IndexedDB 保存失败，请稍后重试";
}

async function saveCompressedImageRecord(record, storageKey) {
  try {
    await saveImageToIndexedDb(storageKey, record.dataUrl);
    return { ...record, storageKey, storage: "indexedDB" };
  } catch (error) {
    throw new Error(classifyImageStorageError(error));
  }
}

function markWorkspaceImageAsIndexedDb(projectId, collection, imageId, storageKey) {
  const project = workspace.projects.find((entry) => entry.id === projectId);
  const file = project?.attachments?.[collection]?.find((entry) => entry.id === imageId);
  if (!file) return;
  file.storageKey = storageKey;
  file.storage = "indexedDB";
  file.storageNotice = "已保存预览图";
}

async function hydrateWorkspaceFromIndexedDb() {
  const imageFiles = workspace.projects.flatMap((project) => [
    ...Object.keys(UPLOAD_COLLECTIONS).flatMap((collection) => (
      (project.attachments?.[collection] || []).filter((file) => file.storageKey && !file.dataUrl)
    )),
    ...(project.items || []).filter((item) => item.productImageStorageKey && !item.productImage).map((item) => ({
      storageKey: item.productImageStorageKey,
      setDataUrl: (dataUrl) => { item.productImage = dataUrl; },
    })),
    ...(project.items || []).flatMap((item) => (item.materialSampleImages || []).filter((image) => image.storageKey && !image.dataUrl).map((image) => ({
      storageKey: image.storageKey,
      setDataUrl: (dataUrl) => { image.dataUrl = dataUrl; },
    }))),
    ...(project.items || []).flatMap((item) => (item.materialSwatches || []).filter((swatch) => swatch.storageKey && !swatch.image).map((swatch) => ({
      storageKey: swatch.storageKey,
      setDataUrl: (dataUrl) => { swatch.image = dataUrl; swatch.dataUrl = dataUrl; },
    }))),
  ]);
  if (!imageFiles.length) return;
  const results = await Promise.allSettled(imageFiles.map((file) => readImageFromIndexedDb(file.storageKey)));
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      if (imageFiles[index].setDataUrl) imageFiles[index].setDataUrl(result.value);
      else imageFiles[index].dataUrl = result.value;
    }
  });
  renderUploadPreviews();
  render();
}

function safeShowToast(message) {
  const toastElement = document.querySelector("#toast");
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add("is-visible");
  window.clearTimeout(toastElement.hideTimer);
  toastElement.hideTimer = window.setTimeout(() => toastElement.classList.remove("is-visible"), 3200);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createPersistedWorkspace()));
    return true;
  } catch (error) {
    console.warn("本地存储空间不足，准备改用 IndexedDB 保存图片", error);
    const fallbackWorkspace = createPersistedWorkspace();
    const saveJobs = [];
    fallbackWorkspace.projects.forEach((project) => {
      Object.keys(UPLOAD_COLLECTIONS).forEach((collection) => {
        project.attachments[collection] = (project.attachments[collection] || []).map((file) => {
          if (!file.dataUrl) return file;
          const storageKey = file.storageKey || buildImageStorageKey(project.id, collection, file.id);
          markWorkspaceImageAsIndexedDb(project.id, collection, file.id, storageKey);
          saveJobs.push(saveImageToIndexedDb(storageKey, file.dataUrl));
          return { ...file, dataUrl: "", storageKey, storage: "indexedDB", storageNotice: "已保存预览图" };
        });
      });
      project.items = (project.items || []).map((item) => {
        const nextItem = { ...item };
        if (nextItem.productImage && nextItem.productImageSource === "manual-upload") {
          const storageKey = nextItem.productImageStorageKey || buildItemImageStorageKey(project.id, nextItem.id, "productImage");
          saveJobs.push(saveImageToIndexedDb(storageKey, nextItem.productImage));
          const liveItem = workspace.projects.find((entry) => entry.id === project.id)?.items?.find((entry) => entry.id === nextItem.id);
          if (liveItem) liveItem.productImageStorageKey = storageKey;
          nextItem.productImage = "";
          nextItem.productImageStorageKey = storageKey;
          nextItem.productImageStorage = "indexedDB";
        }
        nextItem.materialSampleImages = normalizeMaterialSampleImages(nextItem.materialSampleImages).map((image) => {
          if (!image.dataUrl) return image;
          const storageKey = image.storageKey || buildItemImageStorageKey(project.id, nextItem.id, "materialSampleImages", image.id);
          saveJobs.push(saveImageToIndexedDb(storageKey, image.dataUrl));
          return { ...image, dataUrl: "", storageKey, storage: "indexedDB" };
        });
        return nextItem;
      });
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackWorkspace));
      hydrateWorkspaceFromIndexedDb();
      Promise.allSettled(saveJobs).then((results) => {
        if (results.some((result) => result.status === "rejected")) {
          safeShowToast("浏览器存储空间不足，部分图片未能保存，请压缩后重新上传");
        }
      });
      safeShowToast(STORAGE_WARNING_MESSAGE);
      return true;
    } catch (fallbackError) {
      console.error("无法保存项目数据", fallbackError);
      safeShowToast("浏览器存储空间不足，请删除部分图片或压缩后重新上传");
      return false;
    }
  }
}

function flushInlineEditSave() {
  saveState();
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
  return normalizeArea(project.area ?? extractArea(project.name));
}

function getProjectStyle(project) {
  return project.style || inferProjectStyle(project.name);
}

function getProjectTotal(project) {
  return project.items.reduce((sum, item) => sum + subtotal(item), 0);
}

function cloneProjectItems(items) {
  return items.map((item, index) => normalizeItem({ ...item, id: createId() }, index));
}

function money(value) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value || 0);
}

function formatItemCode(index) {
  return `KN-${String(Number(index || 0) + 1).padStart(2, "0")}`;
}

function renumberItems(items = state.items) {
  items.forEach((item, index) => { item.code = formatItemCode(index); });
  return items;
}

function getItemCode(item) {
  const index = state.items.findIndex((entry) => entry.id === item.id);
  return formatItemCode(index < 0 ? 0 : index);
}

function subtotal(item) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function materialSuggestionForStyle(profile) {
  return `${profile.material} / ${profile.color}`;
}

function isPlaceholderImage(dataUrl = "") {
  return String(dataUrl).startsWith("data:image/svg+xml") && String(dataUrl).includes("boq-placeholder");
}

function generateIsolatedProductImage(product = {}, referenceImages = []) {
  // AI 接口预留：后续可根据 referenceImages 识别并生成真实单品白底图；静态版返回风格化单品白底占位图。
  return createProductPlaceholderImage(product.category || product.productName || product.name || "软装", product.style || getProjectStyle(state || {}));
}

function extractProductFromRendering(product = {}, uploadedRenderings = []) {
  // AI 接口预留：后续可从效果图 / 软装方案中裁切单品并抠成白底图；当前不直接展示整张空间图。
  return generateIsolatedProductImage(product, uploadedRenderings);
}

function createProductPlaceholderImage(category = "软装", style = "雅奢") {
  const palette = getPlaceholderPalette(style);
  const shape = getPlaceholderShape(category);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 320 320" role="img" aria-label="软装产品白底占位图"><defs><filter id="boq-placeholder-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#2f2a22" flood-opacity=".12"/></filter></defs><rect class="boq-placeholder" width="320" height="320" rx="30" fill="#fff"/><rect x="16" y="16" width="288" height="288" rx="26" fill="#fbfaf7" stroke="#ede7dc"/><ellipse cx="160" cy="252" rx="86" ry="13" fill="#2f2a22" opacity=".08"/><g transform="translate(0 38)" fill="none" stroke="${palette.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".9" filter="url(#boq-placeholder-shadow)">${shape}</g></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createIsolatedProductImageFromRendering(rendering, item, crop = null) {
  if (!rendering?.dataUrl) return createProductPlaceholderImage(item.category, getProjectStyle(state));
  const cropMeta = PRODUCT_IMAGE_CROPS[crop?.type || "full"] || PRODUCT_IMAGE_CROPS.full;
  const [x, y, width, height] = cropMeta.viewBox.split(" ").map(Number);
  const safeHref = escapeXml(rendering.dataUrl);
  const safeCategory = escapeXml(item.category || "软装产品");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${safeCategory}白底单品参考图"><defs><clipPath id="boq-extract-clip"><rect x="96" y="96" width="608" height="608" rx="42"/></clipPath><filter id="boq-extract-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#2f2a22" flood-opacity=".16"/></filter></defs><rect class="boq-isolated-product" width="800" height="800" rx="48" fill="#fff"/><rect x="56" y="56" width="688" height="688" rx="44" fill="#fbfaf7" stroke="#ebe4d8"/><g clip-path="url(#boq-extract-clip)" filter="url(#boq-extract-shadow)"><svg x="96" y="96" width="608" height="608" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="${cropMeta.preserveAspectRatio}"><image href="${safeHref}" x="0" y="0" width="320" height="240" preserveAspectRatio="${cropMeta.preserveAspectRatio}"/></svg></g><rect x="96" y="96" width="608" height="608" rx="42" fill="none" stroke="#f0eadf" stroke-width="2"/><ellipse cx="400" cy="724" rx="160" ry="16" fill="#302b24" opacity=".07"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getPlaceholderPalette(style = "雅奢") {
  return ({
    奶油风: { bg1: "#fff8ea", bg2: "#d8c2a0", accent: "#b89263", ink: "#7a6249", line: "#8d765f" },
    中古风: { bg1: "#ead7bd", bg2: "#7c4d2f", accent: "#6b7a45", ink: "#4a2d1e", line: "#4a2d1e" },
    轻奢风: { bg1: "#f8f3e8", bg2: "#b9b5ad", accent: "#c6a45e", ink: "#6c6760", line: "#9f8f73" },
    法式: { bg1: "#fffdf5", bg2: "#e3d1b3", accent: "#b8914b", ink: "#82705a", line: "#ad966f" },
    雅奢: { bg1: "#e7ddcf", bg2: "#6f6258", accent: "#cbb782", ink: "#3f332c", line: "#6e6258" },
    度假风: { bg1: "#f2e4cc", bg2: "#c49d6d", accent: "#7e9a7d", ink: "#6e5436", line: "#8b704d" },
    黑金风: { bg1: "#1f211f", bg2: "#4d4d49", accent: "#d1a85d", ink: "#e6c57b", line: "#d1a85d" },
  })[style] || { bg1: "#f7efe2", bg2: "#c9b99a", accent: "#b6925c", ink: "#5f5447", line: "#8d806c" };
}

function getPlaceholderShape(category = "") {
  const text = String(category);
  if (/沙发/.test(text)) return '<path d="M56 128h208v32H56z"/><path d="M72 96h176q22 0 22 22v10H50v-10q0-22 22-22z"/><path d="M78 160v18M242 160v18"/>';
  if (/茶几|边几|桌|餐桌/.test(text)) return '<path d="M82 116h156"/><path d="M104 116l-18 48M216 116l18 48"/><path d="M112 88h96q22 0 34 28H78q12-28 34-28z"/>';
  if (/椅|单椅/.test(text)) return '<path d="M126 78h72v76h-72z"/><path d="M106 154h112"/><path d="M126 154l-16 30M198 154l16 30"/>';
  if (/地毯/.test(text)) return '<rect x="74" y="66" width="172" height="104" rx="12"/><path d="M98 92c32 22 64-22 96 0s32 44 64 10"/><path d="M104 136h112"/>';
  if (/灯|吊灯|落地灯|台灯/.test(text)) return '<path d="M160 50v42"/><path d="M118 92h84l-18 46h-48z"/><path d="M160 138v38"/><path d="M126 176h68"/>';
  if (/画|艺术品/.test(text)) return '<rect x="88" y="54" width="144" height="114" rx="8"/><path d="M112 142l35-36 28 26 20-20 21 30"/>';
  if (/花|绿植|花器/.test(text)) return '<path d="M140 136h40l-8 42h-24z"/><path d="M160 136c-6-36-34-42-48-66 28 0 42 12 48 34 7-24 23-38 48-42-8 28-25 48-48 74z"/>';
  if (/摆件|雕塑|装置|托盘/.test(text)) return '<path d="M104 164h112"/><path d="M148 154c-40-26-12-88 34-94-20 24 10 42 12 68 2 22-18 34-46 26z"/>';
  if (/窗帘|帘/.test(text)) return '<path d="M80 58h160"/><path d="M98 58v116M132 58v116M166 58v116M200 58v116"/><path d="M98 174c18-10 26-10 34 0s24 10 34 0 24-10 34 0"/>';
  return '<rect x="94" y="70" width="132" height="92" rx="18"/><path d="M118 112h84M142 88h36M142 138h36"/>';
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" })[char]);
}


function formatPriceRange(range) {
  const [min, max] = range;
  return `${money(min)} - ${money(max)}`;
}

function recommendedUnitPrice(range) {
  const [min, max] = range;
  return Math.round((Number(min) + Number(max)) / 2);
}

function getContextualTemplateRows(space, style, context = getGenerationContext()) {
  if (context.projectCategory === "工装" && context.projectSubtype === "样板间" && style === "轻奢风" && space === "客厅") {
    return [
      ["沙发", "轻奢定制模块沙发", "3200 × 980 × 720mm", 1, "套", [42000, 88000], "结合样板间客厅展示面，沙发体量需匹配开间与拍摄视角。"],
      ["茶几", "岩板金属茶几", "1200 × 700 × 380mm", 1, "张", [9800, 26000], "岩板纹理与金属脚颜色需呼应整体轻奢风格。"],
      ["边几", "金属边几", "Φ450 × 520mm", 2, "只", [3200, 8800], "建议与茶几金属色同批确认，兼顾陈设与拍摄。"],
      ["休闲椅", "轻奢皮革休闲椅", "780 × 820 × 760mm", 1, "把", [8800, 22000], "作为客厅角落焦点，皮革颜色建议低饱和暖灰或象牙白。"],
      ["地毯", "艺术羊毛地毯", "3000 × 4000mm", 1, "张", [16000, 36000], "建议覆盖沙发前脚，提升样板间完整度与脚感。"],
      ["落地灯", "金属落地灯", "H1550-1700mm，2700K-3000K", 1, "盏", [4200, 14000], "作为氛围补光，注意与拍摄灯光避免眩光。"],
      ["装饰画", "抽象艺术挂画", "1200 × 1600mm", 1, "幅", [6800, 22000], "画面色彩需呼应客厅主色与金属点缀。"],
      ["花艺", "艺术花艺组合", "H450-650mm，含花器", 1, "组", [2600, 9800], "选择低维护仿真花艺，保证长期展示效果。"],
      ["摆件", "金属雕塑摆件", "托盘 + 金属雕塑 + 艺术书", 1, "组", [3200, 12800], "控制金属摆件数量，避免画面过满。"],
    ];
  }

  if (context.projectCategory === "家装" && context.projectSubtype === "大平层" && style === "中古风" && space === "客厅") {
    return [
      ["沙发", "中古胡桃木框架沙发", "3200 × 980 × 720mm", 1, "套", [36000, 72000], "胡桃木框架需与茶几、边几木色同批确认。"],
      ["茶几", "胡桃木复古茶几", "1200 × 650 × 380mm", 1, "张", [8800, 22000], "保留木纹肌理，台面高度需匹配沙发坐高。"],
      ["休闲椅", "中古皮革休闲椅", "780 × 820 × 760mm", 1, "把", [6800, 18000], "皮革颜色建议选焦糖棕或深棕，与胡桃木形成层次。"],
      ["地毯", "中古感羊毛手工地毯", "2400 × 3400mm", 1, "张", [8500, 24000], "可选择低饱和几何纹样，覆盖沙发前脚。"],
      ["落地灯", "复古金属落地灯", "H1550-1700mm，2700K-3000K", 1, "盏", [3600, 12000], "金属件建议做旧铜或黑钛，作为夜间氛围光。"],
      ["边几", "胡桃木边几", "Φ450 × 520mm", 2, "只", [2600, 7800], "可放置落地灯、艺术书或小型雕塑。"],
      ["装饰画", "抽象肌理装饰画", "1200 × 1600mm", 1, "幅", [5200, 19000], "画面选择橄榄绿、暖棕或米灰呼应整体色板。"],
    ];
  }

  return null;
}

function getTemplateRows(space, style, context = getGenerationContext()) {
  return getContextualTemplateRows(space, style, context) || styleSpaceTemplateOverrides[style]?.[space] || spaceTemplates[space] || spaceTemplates.客厅;
}

function resolveProductName(style, category, baseName) {
  return styleProductNames[style]?.[category] || `${styleProfiles[style]?.adjective || "风格化"}${baseName}`;
}

function mapExplicitTemplateItem(space, item) {
  return normalizeItem({
    id: createId(),
    space,
    category: item.category,
    productName: item.name,
    size: item.specs,
    quantity: item.quantity,
    unit: item.unit || "件",
    unitPrice: Number(item.unitPrice || 0),
    materialSuggestion: item.materialSuggestion || item.suggestedPrice || "",
    supplier: item.supplier,
    status: item.status || "待确认",
    note: item.internalNote || "",
  }, 0, getProjectStyle(state));
}

function buildTemplateItems(space, style, context = getGenerationContext()) {
  const contextualRows = getContextualTemplateRows(space, style, context);
  const explicitTemplates = contextualRows ? null : BOQ_TEMPLATES[style]?.[space];
  const sourceItems = contextualRows || (explicitTemplates?.length
    ? explicitTemplates.map((item) => explicitTemplateToTuple(item))
    : getTemplateRows(space, style, context));
  const profile = styleProfiles[style] || styleProfiles.奶油风;
  const budgetRatio = getBudgetRatio(context);

  return sourceItems.map(([category, baseName, size, quantity, unit, priceRange, productNote], index) => {
    const adjustedRange = adjustPriceRange(priceRange, budgetRatio);
    const adjustedQuantity = adjustQuantity(quantity, context, space, category);
    const internalNote = buildInternalNote({ context, style, space, productNote, profile });
    const productName = resolveContextualProductName(style, category, baseName, context, space);
    const unitPrice = recommendedUnitPrice(adjustedRange);
    return {
      id: createId(),
      code: "",
      space,
      category,
      ...buildGeneratedProductImageFields(category, style, index),
      productName,
      size,
      quantity: adjustedQuantity,
      unit,
      materialSuggestion: materialSuggestionForStyle(profile),
      unitPrice,
      supplier: profile.supplier,
      subtotal: adjustedQuantity * unitPrice,
      status: context.projectCategory === "工装" ? "采购询价中" : "待确认",
      materialSampleImages: [],
      clientNote: buildClientNote(context, style, space),
      clientVisible: true,
      name: productName,
      spec: size,
      priceRange: materialSuggestionForStyle(profile),
      note: internalNote,
      customerVisible: true,
    };
  });
}

function buildGeneratedProductImageFields(category, style, index = 0) {
  const rendering = getRenderingForItem(index);
  if (rendering) {
    return {
      productImage: createProductPlaceholderImage(category, style),
      productImageSource: "placeholder",
      productImageCrop: null,
      productImageUploaded: false,
    };
  }
  return {
    productImage: createProductPlaceholderImage(category, style),
    productImageSource: "placeholder",
    productImageCrop: null,
    productImageUploaded: false,
  };
}

function getRenderingForItem(index = 0) {
  const renderings = getAvailableRenderings();
  return renderings.length ? renderings[index % renderings.length] : null;
}

function getAvailableRenderings() {
  state.attachments = normalizeAttachments(state.attachments);
  return state.attachments.renderings.filter((file) => file.id && (file.dataUrl || file.storageKey));
}

function explicitTemplateToTuple(item) {
  return [
    item.category,
    item.name,
    item.specs?.replace(/^常见尺寸：/, "") || "按图纸复核",
    item.quantity,
    item.unit || "件",
    parsePriceRange(item.suggestedPrice) || [Number(item.unitPrice || 0), Number(item.unitPrice || 0)],
    item.internalNote || "结合上传图纸与效果图复核。",
  ];
}

function parsePriceRange(value) {
  const matches = String(value || "").replaceAll(",", "").match(/\d+(?:\.\d+)?/g);
  return matches?.length >= 2 ? [Number(matches[0]), Number(matches[1])] : null;
}

function getGenerationContext() {
  return {
    projectName: state.name,
    clientName: state.clientName || "",
    projectCategory: state.projectCategory || "家装",
    projectSubtype: state.projectSubtype || normalizeSubtype(state.projectType, state.projectCategory || "家装"),
    area: getProjectArea(state),
    targetBudget: Number(state.targetBudget || 0),
    style: elements.templateStyleInput?.value || getProjectStyle(state),
    remark: state.remark || "",
    uploadSummary: getUploadSummary(),
  };
}

function getBudgetRatio(context) {
  if (!context.area || !context.targetBudget) return 1;
  const budgetPerSqm = context.targetBudget / context.area;
  if (budgetPerSqm >= 6000) return 1.22;
  if (budgetPerSqm >= 3500) return 1.08;
  if (budgetPerSqm <= 1800) return 0.82;
  return 1;
}

function adjustPriceRange(range, ratio) {
  return range.map((value) => Math.max(300, Math.round((Number(value) || 0) * ratio / 100) * 100));
}

function adjustQuantity(quantity, context, space, category) {
  const base = Number(quantity || 1);
  if (context.projectCategory === "工装" && ["洽谈椅", "公区坐凳", "休闲椅"].includes(category)) return Math.max(base, Math.ceil(base * 1.25));
  if (context.projectCategory === "家装" && ["窗帘", "床品", "地毯"].includes(category) && context.area >= 260) return Math.ceil(base * 1.1);
  return base;
}

function resolveContextualProductName(style, category, baseName, context, space) {
  if (getContextualTemplateRows(space, style, context)) return baseName;

  if (context.projectCategory === "工装" && context.projectSubtype === "样板间" && style === "雅奢" && space === "客厅") {
    return ({
      主沙发: "雅奢定制沙发",
      茶几: "岩板茶几",
      边几: "金属边几",
      地毯: "艺术地毯",
      装饰画: "装饰画",
      雕塑摆件: "雕塑摆件",
      花艺: "花艺",
      氛围灯具: "氛围灯具",
    })[category] || `雅奢${baseName}`;
  }
  if (context.projectCategory === "家装" && context.projectSubtype === "大平层" && style === "中古风" && space === "客厅") {
    return ({
      主沙发: "中古胡桃木框架沙发",
      茶几: "胡桃木茶几",
      休闲椅: "中古皮革休闲椅",
      地毯: "羊毛手工地毯",
      落地灯: "复古落地灯",
      边几: "边几",
      装饰画: "装饰画",
    })[category] || resolveProductName(style, category, baseName);
  }
  return resolveProductName(style, category, baseName);
}

function buildInternalNote({ context, style, space, productNote, profile }) {
  const typeFocus = context.projectCategory === "工装"
    ? "工装重点：展示效果、动线体验、拍照传播、批量采购、耐用性与交付周期。"
    : "家装重点：居住舒适度、家具尺度、收纳需求、窗帘地毯灯具装饰画花艺完整度。";
  const budgetText = context.targetBudget ? `目标预算 ${money(context.targetBudget)}，按 ${context.area || "待补充"}㎡ 做预算级配。` : "目标预算待补充，先按中高配模板估算。";
  return `${style} / ${space} / ${context.projectCategory}-${context.projectSubtype}。${typeFocus}${budgetText}${productNote}${profile.note}已结合${context.uploadSummary}生成，后续可接入 AI 图像识别精修。${context.remark ? `备注：${context.remark}` : ""}`;
}

function buildClientNote(context, style, space) {
  return `结合${context.uploadSummary}，按${context.projectCategory}${context.projectSubtype}的${style}${space}效果生成，后续以现场复尺和最终选样为准。`;
}

function getUploadSummary() {
  const floorCount = state.attachments?.floorPlans?.length || 0;
  const renderingCount = state.attachments?.renderings?.length || 0;
  return `${floorCount} 张平面图与 ${renderingCount} 张效果图 / 软装方案`;
}

function generateItemsForSpaceAndStyle(space, style) {
  return buildTemplateItems(space, style, currentGenerationContext || getGenerationContext());
}

function assignRenderingImagesToGeneratedItems(items = []) {
  return items.map((item) => ({
    ...item,
    productImage: generateIsolatedProductImage(item, getAvailableRenderings()),
    productImageSource: "placeholder",
    productImageCrop: null,
    productImageUploaded: false,
    materialSwatches: buildSwatchPreviewData(item),
  }));
}

function replaceItemsForSpaces(generatedItems, replaceSpaces) {
  const firstReplaceIndex = state.items.findIndex((item) => replaceSpaces.has(item.space));
  const existingItems = state.items.filter((item) => !replaceSpaces.has(item.space));

  if (firstReplaceIndex < 0) {
    return [...existingItems, ...generatedItems];
  }

  const insertIndex = Math.min(firstReplaceIndex, existingItems.length);
  return [
    ...existingItems.slice(0, insertIndex),
    ...generatedItems,
    ...existingItems.slice(insertIndex),
  ];
}

function validateGeneratedTemplateResult(spaces, style) {
  if (style !== "中古风" || !spaces.includes("客厅")) return;
  const firstLivingRoomItem = state.items.find((item) => item.space === "客厅");
  console.assert(
    firstLivingRoomItem?.name.includes("中古胡桃木框架沙发"),
    "调试验证失败：客厅 + 中古风生成后，客厅第一项应为中古胡桃木框架沙发，而不是奶油柔模块沙发。",
  );
}

function applyGeneratedItems(generatedItems, message, spacesToReplace = [], style = "", generatedSpaces = []) {
  const replaceSpaces = new Set(spacesToReplace);
  state.items = replaceSpaces.size ? replaceItemsForSpaces(generatedItems, replaceSpaces) : [...state.items, ...generatedItems];
  renumberItems(state.items);
  if (style) state.style = style;
  pendingOnly = false;
  query = "";
  saveState();
  render();
  validateGeneratedTemplateResult(generatedSpaces, style);
  document.querySelector("#boq").scrollIntoView({ behavior: "smooth" });
  showToast(message);
}

function runTemplateGeneration({ spaces, successMessage }) {
  syncProjectInfoFromForm();
  if (!hasRequiredUploads()) {
    showToast(REQUIRED_UPLOAD_MESSAGE);
    updateGeneratorAvailability();
    return;
  }
  const style = elements.templateStyleInput.value;
  currentGenerationContext = getGenerationContext();
  const generatedItems = assignRenderingImagesToGeneratedItems(spaces.flatMap((space) => generateItemsForSpaceAndStyle(space, style)));
  applyGeneratedItems(generatedItems, successMessage(style, generatedItems), spaces, style, spaces);
  currentGenerationContext = null;
}

function generateTemplate() {
  const space = elements.templateSpaceInput.value;
  runTemplateGeneration({
    spaces: [space],
    successMessage: (style, generatedItems) => `已根据图纸替换 ${space} · ${style} 清单模板，共 ${generatedItems.length} 项产品`,
  });
}

function generateAllSpacesTemplate() {
  syncProjectInfoFromForm();
  const spaces = getAllSpacesForCurrentProject();
  runTemplateGeneration({
    spaces,
    successMessage: (style, generatedItems) => `已根据图纸生成 ${spaces.length} 个空间 · ${style} 全案软装清单，共 ${generatedItems.length} 项产品`,
  });
}

function applyLibraryTemplate() {
  const space = elements.templateSpaceInput.value;
  runTemplateGeneration({
    spaces: [space],
    successMessage: (style, generatedItems) => `已替换模板库 ${space} · ${style}，生成 ${generatedItems.length} 项软装清单`,
  });
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
  exportMode = mode;
  clientMode = mode === "client";
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
  const selectedMode = exportMode || "client";
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

function parseInlineAmount(value) {
  const normalized = String(value ?? "").replaceAll(",", "").trim();
  if (!normalized) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function hasRequiredUploads() {
  return Boolean(state.attachments?.floorPlans?.length && state.attachments?.renderings?.length);
}

function syncProjectInfoToForm() {
  if (!elements.projectNameInput) return;
  elements.projectNameInput.value = state.name || "";
  elements.clientNameInput.value = state.clientName || "";
  elements.projectAreaInput.value = getProjectArea(state) || "";
  elements.projectCategoryInput.value = state.projectCategory || "家装";
  renderSubtypeOptions();
  elements.projectSubtypeInput.value = state.projectSubtype || PROJECT_SUBTYPES[elements.projectCategoryInput.value][0];
  elements.targetBudgetInput.value = state.targetBudget || "";
  elements.templateStyleInput.value = getProjectStyle(state) in styleProfiles ? getProjectStyle(state) : elements.templateStyleInput.value;
  elements.projectRemarkInput.value = state.remark || "";
}

function syncProjectInfoFromForm() {
  if (!elements.projectNameInput) return;
  state.name = elements.projectNameInput.value.trim() || state.name;
  state.clientName = elements.clientNameInput.value.trim();
  state.area = normalizeArea(elements.projectAreaInput.value);
  state.projectCategory = elements.projectCategoryInput.value;
  state.projectSubtype = elements.projectSubtypeInput.value || PROJECT_SUBTYPES[state.projectCategory][0];
  state.projectType = `${state.projectCategory} · ${state.projectSubtype}`;
  state.targetBudget = Number(elements.targetBudgetInput.value || 0);
  state.style = elements.templateStyleInput.value;
  state.remark = elements.projectRemarkInput.value.trim();
  saveState();
}

function renderSubtypeOptions() {
  const category = elements.projectCategoryInput.value || "家装";
  const current = state.projectSubtype || elements.projectSubtypeInput.value;
  elements.projectSubtypeInput.innerHTML = PROJECT_SUBTYPES[category].map((subtype) => `<option value="${escapeHtml(subtype)}">${escapeHtml(subtype)}</option>`).join("");
  elements.projectSubtypeInput.value = PROJECT_SUBTYPES[category].includes(current) ? current : PROJECT_SUBTYPES[category][0];
}

function updateGeneratorAvailability() {
  const ready = hasRequiredUploads();
  [elements.generateTemplateBtn, elements.generateAllSpacesBtn].forEach((button) => {
    button.disabled = false;
    button.title = ready ? "" : REQUIRED_UPLOAD_MESSAGE;
  });
  elements.uploadRequirementText.textContent = ready
    ? `资料已就绪：${getUploadSummary()}，可根据图纸生成软装清单。`
    : REQUIRED_UPLOAD_MESSAGE;
  elements.uploadRequirementText.classList.toggle("is-ready", ready);
  elements.aiGeneratorHint.textContent = ready
    ? "系统将结合平面图、效果图 / 软装方案、项目类型与风格生成软装 BOQ。"
    : REQUIRED_UPLOAD_MESSAGE;
}

function renderUploadPreviews() {
  renderUploadCollection("floorPlans");
  renderUploadCollection("renderings");
}

function renderUploadCollection(collection) {
  const config = UPLOAD_COLLECTIONS[collection];
  const files = state.attachments?.[collection] || [];
  const preview = elements[config.preview];
  const status = elements[config.status];
  if (!preview || !status) return;
  status.textContent = files.length ? `已上传 ${files.length} 张` : "未上传";
  preview.innerHTML = files.map((file) => {
    const notice = file.storageNotice ? `<span class="upload-thumb-notice">${escapeHtml(file.storageNotice)}</span>` : "";
    const imageMarkup = file.dataUrl
      ? `<img src="${escapeHtml(file.dataUrl)}" alt="${escapeHtml(file.name)}" />`
      : `<div class="upload-thumb-placeholder">预览加载中</div>`;
    return `
      <figure class="upload-thumb">
        ${imageMarkup}
        <figcaption title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</figcaption>
        ${notice}
        <button type="button" class="thumb-remove" data-upload-remove="${collection}" data-upload-id="${escapeHtml(file.id)}" aria-label="删除${escapeHtml(file.name)}">删除</button>
      </figure>
    `;
  }).join("");
}

async function handleUploadFiles(collection, fileList) {
  const selectedFiles = Array.from(fileList || []);
  if (!selectedFiles.length) return;
  const results = await Promise.allSettled(selectedFiles.map(async (file) => {
    const compressed = await readImageFile(file, collection);
    const storageKey = buildImageStorageKey(state.id, collection, compressed.id);
    return saveCompressedImageRecord(compressed, storageKey);
  }));
  const uploadedFiles = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  const failures = results.filter((result) => result.status === "rejected").map((result) => result.reason?.message || "图片读取失败，请重新上传");
  if (uploadedFiles.length) {
    state.attachments = normalizeAttachments(state.attachments);
    state.attachments[collection] = [...state.attachments[collection], ...uploadedFiles];
    saveState();
    renderUploadPreviews();
    updateGeneratorAvailability();
    if (collection === "renderings") render();
  }
  if (failures.length) {
    showToast([...new Set(failures)].join("；"));
    return;
  }
  if (collection === "renderings") {
    showToast("已保存压缩预览图，用于生成清单参考");
    return;
  }
  const compressedNotice = uploadedFiles.some((file) => file.wasCompressed || file.size >= LARGE_IMAGE_SIZE) ? "，图片过大，已尝试压缩" : "";
  showToast(`已上传 ${uploadedFiles.length} 张${UPLOAD_COLLECTIONS[collection].label}${compressedNotice}`);
}

function validateImageFile(file) {
  const hasSupportedType = SUPPORTED_IMAGE_TYPES.has(file.type);
  const hasSupportedExtension = SUPPORTED_IMAGE_EXTENSIONS.test(file.name || "");
  if (!hasSupportedType && !hasSupportedExtension) {
    throw new Error(`${file.name || "图片"} 图片格式不支持，请使用 JPG、PNG、WebP`);
  }
}

function readImageFile(file, purpose = "floorPlans") {
  return new Promise((resolve, reject) => {
    try {
      validateImageFile(file);
    } catch (error) {
      reject(error);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener("load", async () => {
      try {
        const compressed = await compressLoadedImage(image, file, purpose);
        resolve(compressed);
      } catch (error) {
        reject(new Error(error.message || `${file.name || "图片"} 图片过大，已尝试压缩，但压缩失败`));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`${file.name || "图片"} 图片读取失败，可能是图片格式不支持，请使用 JPG、PNG、WebP`));
    });
    image.src = objectUrl;
  });
}

function inferImageType(name = "") {
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  return "image/jpeg";
}

function getCompressionSettings(purpose = "floorPlans") {
  return IMAGE_COMPRESSION_SETTINGS[purpose] || IMAGE_COMPRESSION_SETTINGS.floorPlans;
}

function compressLoadedImage(image, file, purpose = "floorPlans") {
  return new Promise((resolve, reject) => {
    const settings = getCompressionSettings(purpose);
    const maxEdge = settings.maxEdge;
    const longestEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const scale = Math.min(1, maxEdge / Math.max(1, longestEdge));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      reject(new Error("无法压缩图片"));
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const finish = (blob, mimeType) => {
      if (!blob) {
        reject(new Error("图片过大，已尝试压缩，但当前浏览器无法生成压缩图片"));
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl.startsWith("data:image/")) {
          reject(new Error("图片读取失败，请重新上传"));
          return;
        }
        resolve({
          id: createId(),
          name: file.name,
          type: mimeType,
          size: blob.size,
          originalSize: file.size,
          width: canvas.width,
          height: canvas.height,
          dataUrl,
          storageNotice: settings.storageNotice,
          wasCompressed: scale < 1 || blob.size < file.size || file.size >= LARGE_IMAGE_SIZE,
          uploadedAt: new Date().toISOString(),
        });
      });
      reader.addEventListener("error", () => reject(new Error("图片读取失败，请重新上传")));
      reader.readAsDataURL(blob);
    };
    const tryJpeg = () => canvas.toBlob((blob) => finish(blob, "image/jpeg"), "image/jpeg", IMAGE_COMPRESSION_QUALITY);
    canvas.toBlob((blob) => {
      if (blob) finish(blob, "image/webp");
      else tryJpeg();
    }, "image/webp", IMAGE_COMPRESSION_QUALITY);
  });
}

function compressImageDataUrl(dataUrl, type, purpose = "floorPlans") {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      compressLoadedImage(image, { name: "图片", size: dataUrl.length, type: type || "image/jpeg" }, purpose)
        .then((record) => resolve(record.dataUrl))
        .catch(reject);
    });
    image.addEventListener("error", () => reject(new Error("读取失败，请重新上传")));
    image.src = dataUrl;
  });
}

function removeUploadedImage(collection, id) {
  state.attachments = normalizeAttachments(state.attachments);
  const removed = state.attachments[collection].find((file) => file.id === id);
  state.attachments[collection] = state.attachments[collection].filter((file) => file.id !== id);
  if (collection === "renderings") reassignItemsUsingRemovedRendering(id);
  if (removed?.storageKey) deleteImageFromIndexedDb(removed.storageKey).catch((error) => console.warn("删除 IndexedDB 图片失败", error));
  saveState();
  renderUploadPreviews();
  updateGeneratorAvailability();
  render();
  showToast(`${UPLOAD_COLLECTIONS[collection].label}已删除`);
}

function reassignItemsUsingRemovedRendering(removedId) {
  state.items.forEach((item, index) => {
    if (item.productImageSource !== "uploaded-rendering" || item.productImage !== removedId) return;
    assignRenderingImageToItem(item, index);
  });
}

function promptItemImageUpload(item, kind) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = kind === "material";
  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    try {
      const images = await Promise.all(files.map(async (file) => {
        const compressed = await readImageFile(file, kind === "product" ? "product" : "material");
        const storageKey = buildItemImageStorageKey(state.id, item.id, kind === "product" ? "productImage" : "materialSampleImages", compressed.id);
        return saveCompressedImageRecord(compressed, storageKey);
      }));
      if (kind === "product") {
        if (item.productImageStorageKey && item.productImageSource === "manual-upload") deleteImageFromIndexedDb(item.productImageStorageKey).catch((error) => console.warn("删除旧产品图 IndexedDB 失败", error));
        item.productImage = images[0].dataUrl;
        item.productImageSource = "manual-upload";
        item.productImageCrop = null;
        item.productImageUploaded = true;
        item.productImageStorageKey = images[0].storageKey;
        item.productImageStorage = "indexedDB";
        showToast("已上传/替换真实软装产品白底图，产品彩图已压缩至最长边 1200px");
      } else {
        const existing = normalizeMaterialSampleImages(item.materialSampleImages);
        item.materialSampleImages = [...existing, ...images].slice(0, 4);
        const uploadedSwatches = images.map((image) => materialSampleToSwatch(image, item));
        const generatedSwatches = normalizeMaterialSwatches(item.materialSwatches, item, getProjectStyle(state)).filter((swatch) => swatch.source !== "manual-upload");
        item.materialSwatches = [...uploadedSwatches, ...generatedSwatches].slice(0, 4);
        showToast(`已上传 ${Math.min(images.length, 4)} 张材料样板贴图，已压缩至最长边 800px`);
      }
      saveState();
      render();
    } catch (error) {
      console.warn("行内图片上传失败", error);
      showToast(error.message || "图片上传失败，请重试");
    }
  }, { once: true });
  input.click();
}

function removeProductImage(item) {
  if (item.productImageStorageKey && item.productImageSource === "manual-upload") deleteImageFromIndexedDb(item.productImageStorageKey).catch((error) => console.warn("删除产品图 IndexedDB 失败", error));
  item.productImage = createProductPlaceholderImage(item.category, getProjectStyle(state));
  item.productImageSource = "placeholder";
  item.productImageCrop = null;
  item.productImageUploaded = false;
  item.productImageStorageKey = "";
  item.productImageStorage = "localStorage";
  saveState();
  render();
  showToast("已恢复默认白底单品占位图");
}

function assignRenderingImageToItem(item, index = 0, crop = null, renderingId = "") {
  const rendering = renderingId ? getRenderingByReference(renderingId) : getRenderingForItem(index);
  item.productImage = extractProductFromRendering(item, rendering ? [rendering] : getAvailableRenderings());
  item.productImageSource = "ai-generated";
  item.productImageCrop = normalizeProductImageCrop(crop);
  item.productImageUploaded = false;
  return Boolean(rendering);
}

function openRenderingPicker(item) {
  const renderings = getAvailableRenderings();
  if (!renderings.length) {
    showToast("请先上传效果图 / 软装方案图");
    return;
  }
  elements.renderingPickerGrid.innerHTML = renderings.map((file) => renderRenderingPickerCard(item, file)).join("");
  elements.renderingPickerDialog.dataset.itemId = item.id;
  elements.renderingPickerDialog.showModal();
}

function renderRenderingPickerCard(item, file) {
  const safeImageId = escapeHtml(file.id);
  const thumb = file.dataUrl || createRenderingPendingImage(item.category);
  const cropButtons = Object.entries(PRODUCT_IMAGE_CROPS).map(([cropType, crop]) => `
    <button type="button" class="mini-button" data-action="select-rendering-image" data-rendering-id="${safeImageId}" data-crop="${escapeHtml(cropType)}">${escapeHtml(crop.label)}</button>`).join("");
  return `
    <article class="rendering-picker-card">
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(file.name)}" />
      <strong>${escapeHtml(file.name)}</strong>
      <span>选择一个聚焦区域生成白底单品图</span>
      <div class="rendering-crop-actions">${cropButtons}</div>
    </article>`;
}

function selectRenderingImageForItem(itemId, renderingId, cropType) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;
  assignRenderingImageToItem(item, getItemIndex(item), cropType, renderingId);
  saveState();
  render();
  elements.renderingPickerDialog.close();
  showToast("已生成白底单品参考图");
}

function getPreviewProductImage(item) {
  return resolveProductImage(item);
}

function openProductImageLightbox(item, title = "") {
  if (!elements.productImageLightbox || !elements.productLightboxImage) return;
  const previewImage = getPreviewProductImage(item);
  elements.productLightboxImage.src = previewImage;
  elements.productLightboxImage.alt = `${title || item.productName || item.name || item.category || "软装产品"}高清产品图`;
  if (elements.productLightboxTitle) elements.productLightboxTitle.textContent = title || item.productName || item.name || item.category || "软装产品彩图";
  setProductLightboxZoom(1);
  elements.productImageLightbox.showModal();
}

function setProductLightboxZoom(nextZoom) {
  productLightboxZoom = Math.min(PRODUCT_LIGHTBOX_MAX_ZOOM, Math.max(PRODUCT_LIGHTBOX_MIN_ZOOM, nextZoom));
  if (elements.productLightboxImage) elements.productLightboxImage.style.transform = `scale(${productLightboxZoom})`;
}

function setMaterialSwatchZoom(nextZoom) {
  materialSwatchZoom = Math.min(PRODUCT_LIGHTBOX_MAX_ZOOM, Math.max(PRODUCT_LIGHTBOX_MIN_ZOOM, nextZoom));
  if (elements.materialSwatchImage) elements.materialSwatchImage.style.transform = `scale(${materialSwatchZoom})`;
}

function closeProductImageLightbox() {
  if (!elements.productImageLightbox) return;
  elements.productImageLightbox.close();
  if (elements.productLightboxImage) elements.productLightboxImage.src = "";
}

function removeMaterialSample(item, sampleId) {
  const removed = normalizeMaterialSampleImages(item.materialSampleImages).find((image) => image.id === sampleId);
  if (removed?.storageKey) deleteImageFromIndexedDb(removed.storageKey).catch((error) => console.warn("删除材料样板 IndexedDB 失败", error));
  item.materialSampleImages = normalizeMaterialSampleImages(item.materialSampleImages).filter((image) => image.id !== sampleId);
  item.materialSwatches = normalizeMaterialSwatches(item.materialSwatches, item, getProjectStyle(state)).filter((swatch) => swatch.id !== sampleId);
  saveState();
  render();
  showToast("已删除材料样板贴图");
}

function getAllSpacesForCurrentProject() {
  return state.projectCategory === "工装" ? COMMERCIAL_SPACES : RESIDENTIAL_SPACES;
}

function updateBudgetSummary() {
  const total = getProjectTotal(state);
  const pendingTotal = state.items.filter((item) => PENDING_STATUSES.includes(item.status)).reduce((sum, item) => sum + subtotal(item), 0);
  const confirmed = state.items.filter((item) => item.status === "客户已确认").length;
  const score = state.items.length ? Math.round((confirmed / state.items.length) * 100) : 0;

  elements.totalBudget.textContent = money(total);
  elements.totalItems.textContent = `${state.items.length} 项产品`;
  elements.confirmedCount.textContent = `${confirmed} 项`;
  elements.pendingAmount.textContent = money(pendingTotal);
  elements.purchaseScore.textContent = `${score}%`;
}

function updateProjectCardTotals(project) {
  document.querySelectorAll(`[data-project-id="${CSS.escape(project.id)}"] [data-project-total]`).forEach((totalElement) => {
    totalElement.textContent = money(getProjectTotal(project));
  });
}

function updateInlineRowBudget(input, item) {
  const row = input.closest("tr");
  const subtotalCell = row?.querySelector("[data-subtotal-cell]");
  if (subtotalCell) subtotalCell.textContent = money(subtotal(item));
  updateBudgetSummary();
  updateProjectCardTotals(state);
}

function getVisibleItems() {
  const searchQuery = query.trim().toLowerCase();
  return state.items.filter((item) => {
    const matchesPending = !pendingOnly || PENDING_STATUSES.includes(item.status);
    const matchesClientMode = !clientMode || (item.clientVisible ?? item.customerVisible) !== false;
    const haystack = [item.space, item.category, item.productName || item.name, item.size || item.spec, item.materialSuggestion, item.supplier, item.status].join(" ").toLowerCase();
    return matchesPending && matchesClientMode && (!searchQuery || haystack.includes(searchQuery));
  });
}

function render() {
  if (!elements.tableBody || !elements.projectTitle) return;
  const visibleItems = getVisibleItems();
  const area = getProjectArea(state);
  const style = getProjectStyle(state);

  elements.projectTitle.textContent = state.name;
  elements.currentProjectName.textContent = state.name;
  elements.projectMenuCurrent.textContent = state.name;
  elements.reportModeLabel.textContent = exportMode === "internal" ? "软装全案 · 内部采购版" : "软装全案 · 客户汇报版";
  elements.projectMeta.textContent = `${workspace.projects.length} 个项目 · 当前 ${state.items.length} 项清单 · ${area ? `${area}㎡` : "面积待补充"} · ${style}`;
  syncProjectInfoToForm();
  renderUploadPreviews();
  updateGeneratorAvailability();
  elements.searchInput.value = query;
  elements.exportModeInput.value = exportMode || "client";
  elements.clearFilterBtn.hidden = !pendingOnly;
  elements.clientFieldsBtn.textContent = clientMode ? "客户版字段：已隐藏内部字段" : "客户版字段：全字段";
  document.body.classList.toggle("client-mode", clientMode);

  renderProjectSwitcher();

  elements.tableBody.innerHTML = visibleItems.length
    ? visibleItems.map(renderRow).join("")
    : '<tr><td colspan="15" class="empty-cell">暂无匹配产品，请清除筛选或新增产品。</td></tr>';

  updateBudgetSummary();
  renderTemplateLibrary();
}

function renderProjectSwitcher() {
  const cards = workspace.projects.map(renderProjectCard).join("");
  if (elements.projectDropdownList) elements.projectDropdownList.innerHTML = cards;
  if (elements.sidebarProjectList) elements.sidebarProjectList.innerHTML = cards;
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
        <strong>${escapeHtml(project.name)}</strong>
        <span class="project-card-meta">${area ? `${area}㎡` : "面积待补充"} · ${escapeHtml(style)}</span>
      </button>
      <dl class="project-card-stats">
        <div><dt>清单</dt><dd>${itemCount} 项</dd></div>
        <div><dt>总预算</dt><dd data-project-total>${money(total)}</dd></div>
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
  const code = getItemCode(item);
  item.code = code;
  const productName = item.productName || item.name || item.title || "未命名产品";
  const size = item.size || extractSizeFromLegacySpec(item.spec) || item.spec || "按图纸复核";
  const materialSuggestion = item.materialSuggestion || item.priceRange || extractMaterialSuggestionFromLegacySpec(item.spec) || "待确认材质、颜色与工艺";
  const productImage = resolveProductImage(item);
  const materialSwatches = buildSwatchPreviewData(item);
  const clientVisible = item.clientVisible ?? item.customerVisible ?? true;
  return `
    <tr>
      <td><strong class="item-code">${escapeHtml(code)}</strong></td>
      <td><strong>${escapeHtml(item.space)}</strong></td>
      <td>${escapeHtml(item.category)}</td>
      <td>${renderProductImageCell(item, productImage, safeId, productName)}</td>
      <td>${renderMaterialSwatchesCell(materialSwatches, safeId)}</td>
      <td>${escapeHtml(size)}</td>
      <td><div class="quantity-input-group"><input class="inline-number" type="text" inputmode="decimal" value="${escapeHtml(item.quantity)}" data-action="quantity" data-id="${safeId}" aria-label="调整数量" /><span>${escapeHtml(item.unit || "件")}</span></div></td>
      <td class="material-cell">${escapeHtml(materialSuggestion)}</td>
      <td class="money customer-hidden"><input class="inline-price" type="text" inputmode="decimal" value="${escapeHtml(item.unitPrice)}" data-action="unitPrice" data-id="${safeId}" aria-label="调整单价" /></td>
      <td class="customer-hidden">${escapeHtml(item.supplier)}</td>
      <td class="money" data-subtotal-cell>${money(subtotal(item))}</td>
      <td class="pdf-client-hidden"><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td class="client-note-cell">${escapeHtml(item.clientNote || item.note || "以最终选样、现场复尺及客户确认为准。")}</td>
      <td class="visibility-cell pdf-client-hidden"><button type="button" class="visibility-toggle no-print" data-action="toggle-client-visible" data-id="${safeId}">${clientVisible ? "是" : "否"}</button><span class="print-only">${clientVisible ? "是" : "否"}</span></td>
      <td class="actions-col row-actions internal-only">
        <button type="button" class="mini-button" data-action="edit" data-id="${safeId}">编辑</button>
        <button type="button" class="mini-button danger" data-action="delete" data-id="${safeId}">删除</button>
        <button type="button" class="mini-button" data-action="upload-product-image" data-id="${safeId}">上传产品图</button>
        <button type="button" class="mini-button" data-action="upload-material-sample" data-id="${safeId}">上传样板图</button>
      </td>
    </tr>`;
}

function renderProductImageCell(item, productImage, safeId, productName = "") {
  const sourceClassName = getProductImageSourceClassName(item);
  const fallbackImage = createProductPlaceholderImage(item.category, getProjectStyle(state));
  const previewTitle = escapeHtml(productName || item.category || "软装产品");
  return `
    <div class="product-image-cell ${sourceClassName}">
      <button type="button" class="product-image-card" data-action="preview-product-image" data-id="${safeId}" data-title="${previewTitle}" aria-label="查看${previewTitle}高清产品图">
        <img class="boq-product-image" src="${escapeHtml(productImage)}" alt="${escapeHtml(item.category)}软装产品彩图" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}';" />
      </button>
      <div class="image-actions no-print">
        <button type="button" class="mini-button" data-action="upload-product-image" data-id="${safeId}">上传 / 替换</button>
        <button type="button" class="mini-button" data-action="pick-rendering-image" data-id="${safeId}">从方案图选择</button>
        <button type="button" class="mini-button danger" data-action="remove-product-image" data-id="${safeId}">删除</button>
      </div>
    </div>`;
}

function resolveProductImage(item) {
  if (item.productImageSource === "manual-upload" && item.productImage) return item.productImage;
  if (item.productImageSource === "ai-generated" && item.productImage) return item.productImage;
  if (item.productImageSource === "uploaded-rendering") {
    item.productImageSource = "placeholder";
    item.productImageCrop = null;
  }
  return generateIsolatedProductImage(item, getAvailableRenderings());
}

function getRenderingByReference(reference) {
  const renderings = getAvailableRenderings();
  return renderings.find((file) => file.id === reference || file.dataUrl === reference) || null;
}

function getItemIndex(item) {
  return Math.max(0, state.items.findIndex((entry) => entry.id === item.id));
}

function createRenderingPendingImage(category = "软装") {
  return createProductPlaceholderImage(category, getProjectStyle(state));
}


function getProductImageSourceClassName(item) {
  return getProductImageSourceMeta(item).className;
}

function getProductImageSourceMeta(item) {
  if (item.productImageSource === "manual-upload") return { label: "手动上传", description: "", className: "source-manual" };
  if (item.productImageSource === "ai-generated") return { label: "AI 单品图", description: "", className: "source-ai" };
  return { label: "风格占位图", description: "", className: "source-placeholder" };
}


function renderMaterialSwatchesCell(swatches, safeId) {
  const displaySwatches = swatches.length ? swatches.slice(0, 4) : generateMaterialSwatchesFromProduct({ category: "软装", productName: "默认材料", materialSuggestion: "米白织物、浅金属", style: getProjectStyle(state) });
  const thumbs = displaySwatches.map((swatch) => `
    <span class="material-swatch-wrap">
      <button type="button" class="material-swatch-thumb ${swatch.source === "placeholder" ? "is-placeholder" : ""}" data-action="preview-material-swatch" data-id="${safeId}" data-swatch-id="${escapeHtml(swatch.id)}" aria-label="预览${escapeHtml(swatch.name)}材料样板">
        <img src="${escapeHtml(swatch.image || swatch.dataUrl || createMaterialSwatchImage(swatch))}" alt="${escapeHtml(swatch.name)}" loading="lazy" />
        <span>${escapeHtml(swatch.shortLabel || swatch.name)}</span>
      </button>
      ${swatch.source === "manual-upload" ? `<button type="button" class="sample-remove no-print" data-action="remove-material-sample" data-id="${safeId}" data-sample-id="${escapeHtml(swatch.id)}" aria-label="删除材料样板">×</button>` : ""}
    </span>`).join("");
  return `
    <div class="material-swatch-cell">
      <div class="material-swatch-strip">${thumbs}</div>
      <button type="button" class="mini-button no-print" data-action="upload-material-sample" data-id="${safeId}">上传样板</button>
    </div>`;
}

function renderMaterialSamplesCell(samples, safeId) {
  return renderMaterialSwatchesCell(samples.map((sample) => materialSampleToSwatch(sample, { id: safeId, category: "材料", productName: "上传样板" })), safeId);
}


function openMaterialSwatchPreview(item, swatchId) {
  const swatch = buildSwatchPreviewData(item).find((entry) => entry.id === swatchId);
  if (!swatch) return;
  elements.materialSwatchImage.src = swatch.image || swatch.dataUrl || createMaterialSwatchImage(swatch);
  elements.materialSwatchImage.alt = `${swatch.name}材料样板大图`;
  elements.materialSwatchName.textContent = swatch.name || "材料样板";
  elements.materialSwatchType.textContent = swatch.category || getMaterialTypeName(swatch.type);
  elements.materialSwatchProduct.textContent = swatch.productName || item.productName || item.name || item.category;
  elements.materialSwatchNote.textContent = swatch.note || "后续可通过 AI 图像识别自动补充材料用途与色彩倾向。";
  setMaterialSwatchZoom(1);
  elements.materialSwatchDialog.showModal();
}

function statusClass(status) {
  return {
    客户已确认: "confirmed",
    已确认: "confirmed",
    已下单: "confirmed",
    已完成: "confirmed",
    待确认: "pending",
    采购询价中: "pending",
    待下单: "review",
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
  elements.nameInput.value = item?.productName || item?.name || "";
  elements.specInput.value = item?.size || extractSizeFromLegacySpec(item?.spec) || item?.spec || "";
  elements.quantityInput.value = item?.quantity ?? 1;
  elements.unitInput.value = item?.unit || "件";
  elements.unitPriceInput.value = item?.unitPrice ?? 0;
  elements.priceRangeInput.value = item?.materialSuggestion || item?.priceRange || extractMaterialSuggestionFromLegacySpec(item?.spec) || "";
  elements.statusInput.value = item?.status || "待确认";
  elements.supplierInput.value = item?.supplier || "";
  elements.noteInput.value = item?.note || "";
  elements.clientNoteInput.value = item?.clientNote || "";
  elements.customerVisibleInput.checked = (item?.clientVisible ?? item?.customerVisible) !== false;
  updateFormSubtotal();
  elements.productDialog.showModal();
}

function collectFormItem() {
  const existing = state.items.find((entry) => entry.id === elements.editingId.value) || {};
  const quantity = Number(elements.quantityInput.value || 0);
  const unitPrice = Number(elements.unitPriceInput.value || 0);
  const productName = elements.nameInput.value.trim();
  const size = elements.specInput.value.trim();
  const materialSuggestion = elements.priceRangeInput.value.trim();
  const category = elements.categoryInput.value.trim();
  const fallbackProductImageFields = buildGeneratedProductImageFields(category, getProjectStyle(state), state.items.length);
  return {
    ...existing,
    id: elements.editingId.value || createId(),
    space: elements.spaceInput.value.trim(),
    category,
    productImage: existing.productImage || fallbackProductImageFields.productImage,
    productImageSource: existing.productImageSource || fallbackProductImageFields.productImageSource,
    productImageCrop: existing.productImageCrop || fallbackProductImageFields.productImageCrop,
    productImageUploaded: Boolean(existing.productImageUploaded),
    productName,
    size,
    quantity,
    unit: elements.unitInput.value.trim(),
    materialSuggestion,
    unitPrice,
    supplier: elements.supplierInput.value.trim(),
    subtotal: quantity * unitPrice,
    status: elements.statusInput.value,
    materialSwatches: normalizeMaterialSwatches(existing.materialSwatches, { ...existing, category, productName, name: productName, materialSuggestion, priceRange: materialSuggestion }, getProjectStyle(state)),
    materialSampleImages: normalizeMaterialSampleImages(existing.materialSampleImages),
    clientNote: elements.clientNoteInput.value.trim(),
    clientVisible: elements.customerVisibleInput.checked,
    name: productName,
    spec: size,
    priceRange: materialSuggestion,
    note: elements.noteInput.value.trim(),
    customerVisible: elements.customerVisibleInput.checked,
  };
}

function updateFormSubtotal() {
  const quantity = Number(elements.quantityInput.value || 0);
  const unitPrice = Number(elements.unitPriceInput.value || 0);
  elements.formSubtotal.textContent = money(quantity * unitPrice);
}

function importSamples() {
  const imported = sampleImportItems.map((item) => normalizeItem({ ...item, id: createId() }, 0, getProjectStyle(state)));
  state.items = renumberItems([...state.items, ...imported]);
  pendingOnly = false;
  saveState();
  render();
  showToast(`已导入 ${imported.length} 条示例清单数据`);
}


function mergeRecoveredWorkspace(recoveredWorkspace) {
  const beforeCount = workspace.projects.length;
  mergeWorkspaces({ ...workspace, projects: workspace.projects }, [recoveredWorkspace]).projects.forEach((project) => {
    if (!workspace.projects.some((entry) => getProjectSignature(entry) === getProjectSignature(project))) {
      appendRecoveredProject(workspace, project);
    }
  });
  workspace.version = CURRENT_DATA_VERSION;
  if (!workspace.activeProjectId || !workspace.projects.some((project) => project.id === workspace.activeProjectId)) {
    workspace.activeProjectId = workspace.projects[0]?.id || "";
  }
  state = getActiveProject();
  saveState();
  render();
  return workspace.projects.length - beforeCount;
}

async function openLegacyRecoveryCenter() {
  detectedLegacySnapshots = [...scanStorageSnapshots(), ...(await scanIndexedDbSnapshots())];
  renderLegacyRecoveryCenter();
  elements.legacyRecoveryDialog?.showModal();
}

function renderLegacyRecoveryCenter() {
  if (!elements.legacyRecoveryList) return;
  const legacySnapshots = detectedLegacySnapshots.filter((snapshot) => snapshot.key !== STORAGE_KEY);
  if (!legacySnapshots.length) {
    elements.legacyRecoveryList.innerHTML = `<div class="legacy-recovery-card"><h4>未检测到旧版本数据</h4><p>已扫描已知 key 和包含 boq、maison、project、soft、decor 的 localStorage key。</p></div>`;
    return;
  }
  elements.legacyRecoveryList.innerHTML = legacySnapshots.map((snapshot, index) => `
    <article class="legacy-recovery-card" data-legacy-index="${index}">
      <h4>${escapeHtml(snapshot.key)}</h4>
      <p>项目数量：${snapshot.projectCount} · 清单数量：${snapshot.itemCount}</p>
      <ul>${snapshot.workspace.projects.map((project) => `<li>${escapeHtml(project.name)}：${project.items?.length || 0} 项清单</li>`).join("")}</ul>
      <div class="legacy-recovery-actions">
        <button class="mini-button" type="button" data-legacy-action="merge" data-key="${escapeHtml(snapshot.key)}">合并旧项目</button>
        <button class="mini-button" type="button" data-legacy-action="restore" data-key="${escapeHtml(snapshot.key)}">恢复 / 覆盖当前</button>
        <button class="mini-button danger" type="button" data-legacy-action="skip" data-key="${escapeHtml(snapshot.key)}">跳过</button>
      </div>
    </article>`).join("");
}

async function handleLegacyRecoveryAction(event) {
  const button = event.target.closest("[data-legacy-action]");
  if (!button) return;
  const snapshot = detectedLegacySnapshots.find((entry) => entry.key === button.dataset.key);
  if (!snapshot) return;
  if (button.dataset.legacyAction === "skip") {
    button.closest(".legacy-recovery-card")?.remove();
    showToast(`已跳过 ${snapshot.key}`);
    return;
  }
  if (button.dataset.legacyAction === "restore") {
    if (!window.confirm("恢复会覆盖当前项目列表。该操作可能覆盖当前项目，请先导出备份。确认继续？")) return;
    workspace.version = CURRENT_DATA_VERSION;
    workspace.activeProjectId = snapshot.workspace.activeProjectId;
    workspace.projects = snapshot.workspace.projects.map(normalizeProject);
    state = getActiveProject();
  } else {
    const added = mergeRecoveredWorkspace(snapshot.workspace);
    showToast(added ? `已合并 ${added} 个旧项目` : "旧项目已存在，无需重复合并");
  }
  await migrateInlineImagesToIndexedDb();
  saveState();
  render();
  renderLegacyRecoveryCenter();
}

async function migrateInlineImagesToIndexedDb() {
  const jobs = [];
  workspace.projects.forEach((project) => {
    project.attachments = normalizeAttachments(project.attachments || { floorPlans: project.floorPlans, renderings: project.renderings });
    Object.keys(UPLOAD_COLLECTIONS).forEach((collection) => {
      (project.attachments[collection] || []).forEach((file) => {
        if (!file.dataUrl || file.storageKey) return;
        file.storageKey = buildImageStorageKey(project.id, collection, file.id);
        file.storage = "indexedDB";
        jobs.push(saveImageToIndexedDb(file.storageKey, file.dataUrl).then(() => { file.dataUrl = ""; }).catch(() => {}));
      });
    });
    (project.items || []).forEach((item) => {
      if (item.productImage && item.productImageSource === "manual-upload" && !item.productImageStorageKey) {
        item.productImageStorageKey = buildItemImageStorageKey(project.id, item.id, "productImage");
        item.productImageStorage = "indexedDB";
        jobs.push(saveImageToIndexedDb(item.productImageStorageKey, item.productImage).then(() => { item.productImage = ""; }).catch(() => {}));
      }
      item.materialSampleImages = normalizeMaterialSampleImages(item.materialSampleImages).map((image) => {
        if (!image.dataUrl || image.storageKey) return image;
        const storageKey = buildItemImageStorageKey(project.id, item.id, "materialSampleImages", image.id);
        jobs.push(saveImageToIndexedDb(storageKey, image.dataUrl).then(() => { image.dataUrl = ""; }).catch(() => {}));
        return { ...image, storageKey, storage: "indexedDB" };
      });
    });
  });
  await Promise.allSettled(jobs);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function exportBackupJson() {
  saveState();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const backup = await createBackupWorkspaceWithImages();
  downloadJson(`maison-boq-backup-${timestamp}.json`, backup);
  showToast("已导出完整项目与图片备份 JSON");
}

function importBackupJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const nextWorkspace = normalizeWorkspace(migrateLegacyData(parsed) || parsed);
      const shouldMerge = window.confirm(`导入备份默认建议使用“合并”，避免误删当前 ${workspace.projects.length} 个项目。\n\n点击“确定”=合并到当前项目列表；点击“取消”后可选择覆盖或放弃。`);
      if (shouldMerge) {
        mergeRecoveredWorkspace(nextWorkspace);
      } else {
        if (!window.confirm("确认覆盖当前所有项目？该操作会替换当前数据，建议先导出备份。")) return;
        workspace.version = CURRENT_DATA_VERSION;
        workspace.activeProjectId = nextWorkspace.activeProjectId;
        workspace.projects = nextWorkspace.projects;
      }
      state = getActiveProject();
      await persistImportedImagesFromBackup();
      pendingOnly = false;
      query = "";
      saveState();
      render();
      showToast(`已导入备份，当前共 ${workspace.projects.length} 个项目`);
    } catch (error) {
      console.warn("导入备份失败", error);
      showToast(error.message || "备份 JSON 格式不正确，导入失败");
    } finally {
      elements.backupFileInput.value = "";
    }
  });
  reader.readAsText(file, "utf-8");
}

function restoreSampleData() {
  const firstConfirm = window.confirm("该操作可能覆盖当前项目，请先导出备份。是否继续恢复示例数据？");
  if (!firstConfirm) return;
  const secondConfirm = window.confirm("请再次确认：这会用示例项目替换当前 localStorage 数据，真实项目将不再显示。");
  if (!secondConfirm) return;
  const project = defaultProject();
  workspace.version = CURRENT_DATA_VERSION;
  workspace.activeProjectId = project.id;
  workspace.projects = [project];
  state = project;
  pendingOnly = false;
  query = "";
  clientMode = false;
  exportMode = "client";
  saveState();
  render();
  showToast("已恢复示例数据");
}

function exportCsv() {
  renumberItems(state.items);
  const isClientReport = exportMode !== "internal";
  const headers = isClientReport
    ? ["编号", "空间", "品类", "软装产品彩图", "材料样板贴图", "常见尺寸", "数量", "材质建议", "预算小计", "客户版备注"]
    : ["编号", "空间", "品类", "软装产品彩图", "材料样板贴图", "常见尺寸", "数量", "材质建议", "执行单价", "供应商", "预算小计", "状态", "是否客户可见"];
  const rows = state.items.filter((item) => !isClientReport || (item.clientVisible ?? item.customerVisible) !== false).map((item, index) => {
    const productImageStatus = getProductImageSourceMeta(item).label || "白底单品图";
    const swatches = buildSwatchPreviewData(item);
    const sampleStatus = swatches.map((swatch) => swatch.name).join(" / ") || "默认样板";
    const common = [formatItemCode(index), item.space, item.category, `${productImageStatus}：${item.productName || item.name}`, sampleStatus, item.size || extractSizeFromLegacySpec(item.spec), item.quantity, item.materialSuggestion || item.priceRange || extractMaterialSuggestionFromLegacySpec(item.spec)];
    return isClientReport
      ? [...common, subtotal(item), item.clientNote || customerNote(item)]
      : [...common, item.unitPrice, item.supplier, subtotal(item), item.status, (item.clientVisible ?? item.customerVisible) === false ? "否" : "是"];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const modeName = isClientReport ? "客户汇报版" : "内部采购版";
  link.href = URL.createObjectURL(blob);
  link.download = `${state.name.replace(/[\\/:*?"<>|]/g, "-")}-${modeName}.csv`;
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
  const previousClientMode = clientMode;
  clientMode = true;
  render();
  document.body.classList.add("printing-client");
  window.setTimeout(() => {
    window.print();
    document.body.classList.remove("printing-client");
    clientMode = previousClientMode;
    render();
  }, 80);
}

function addProject() {
  const name = window.prompt("请输入新项目名称", "新项目软装 BOQ 管理");
  if (!name?.trim()) return;
  const area = normalizeArea(window.prompt("请输入项目面积（㎡，可留空）", extractArea(name) || ""));
  const style = window.prompt("请输入项目风格（可留空）", inferProjectStyle(name) === "待定风格" ? "" : inferProjectStyle(name))?.trim() || "待定风格";
  const project = { ...defaultProject(), name: name.trim(), area, style, items: [] };
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
  showToast(`已切换到「${state.name}」`);
}

function renameProject(projectId) {
  const project = workspace.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  const nextName = window.prompt("请输入新的项目名称", project.name);
  if (!nextName?.trim()) return;
  const nextArea = normalizeArea(window.prompt("请输入项目面积（㎡，可留空）", getProjectArea(project) || ""));
  const nextStyle = window.prompt("请输入项目风格（可留空）", getProjectStyle(project))?.trim() || "待定风格";
  project.name = nextName.trim();
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
    name: `${project.name} 副本`,
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
  if (!window.confirm(`确认删除项目“${project.name}”？此操作不会保留该项目清单。`)) return;
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

function setupEventBindings() {
  if (elements.tableBody) {
    elements.tableBody.addEventListener("input", (event) => {
      const input = event.target.closest("input[data-action]");
      if (!input) return;
      const item = state.items.find((entry) => entry.id === input.dataset.id);
      if (!item) return;
      item[input.dataset.action] = parseInlineAmount(input.value);
      updateInlineRowBudget(input, item);
});

    elements.tableBody.addEventListener("change", (event) => {
      const input = event.target.closest("input[data-action]");
      if (input) flushInlineEditSave();
});

    elements.tableBody.addEventListener("focusout", (event) => {
      const input = event.target.closest("input[data-action]");
      if (input) flushInlineEditSave();
});

    elements.tableBody.addEventListener("keydown", (event) => {
      const input = event.target.closest("input[data-action]");
      if (!input || event.key !== "Enter") return;
      event.preventDefault();
      input.blur();
});
  }

  safeAddEventListener(elements.tableBody, "click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = state.items.find((entry) => entry.id === button.dataset.id);
    if (!item) return;
    if (button.dataset.action === "preview-product-image") return openProductImageLightbox(item, button.dataset.title);
    if (button.dataset.action === "upload-product-image") return promptItemImageUpload(item, "product");
    if (button.dataset.action === "remove-product-image") return removeProductImage(item);
    if (button.dataset.action === "pick-rendering-image") return openRenderingPicker(item);
    if (button.dataset.action === "upload-material-sample") return promptItemImageUpload(item, "material");
    if (button.dataset.action === "remove-material-sample") return removeMaterialSample(item, button.dataset.sampleId);
    if (button.dataset.action === "preview-material-swatch") return openMaterialSwatchPreview(item, button.dataset.swatchId);
    if (button.dataset.action === "toggle-client-visible") {
      item.clientVisible = !(item.clientVisible ?? item.customerVisible ?? true);
      item.customerVisible = item.clientVisible;
      saveState();
      render();
      return showToast(item.clientVisible ? "已设为客户可见" : "已在客户版隐藏");
    }
    if (button.dataset.action === "edit") openProductDialog(item);
    if (button.dataset.action === "delete" && window.confirm(`确认删除“${item.name}”？`)) {
      state.items = renumberItems(state.items.filter((entry) => entry.id !== item.id));
      saveState();
      render();
      showToast("已删除产品");
    }
  });

  safeAddEventListener(elements.productForm, "submit", (event) => {
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
    renumberItems(state.items);
    saveState();
    render();
    elements.productDialog?.close();
  });

  [elements.quantityInput, elements.unitPriceInput].forEach((input) => safeAddEventListener(input, "input", updateFormSubtotal));
  safeClick(elements.closeDialogBtn, () => elements.productDialog?.close());
  safeClick(elements.cancelDialogBtn, () => elements.productDialog?.close());
  safeClick(elements.addProductBtn, () => openProductDialog());

  safeClick(elements.floorPlanUploadBtn, () => elements.floorPlanInput?.click());
  safeClick(elements.renderingUploadBtn, () => elements.renderingInput?.click());
  document.querySelectorAll("[data-upload-trigger]").forEach((trigger) => {
    safeClick(trigger, () => {
      const collection = trigger.dataset.uploadTrigger;
      (collection === "floorPlans" ? elements.floorPlanInput : elements.renderingInput)?.click();
    });
    ["dragenter", "dragover"].forEach((eventName) => {
      safeAddEventListener(trigger, eventName, (event) => {
        event.preventDefault();
        trigger.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      safeAddEventListener(trigger, eventName, (event) => {
        event.preventDefault();
        trigger.classList.remove("is-dragover");
      });
    });
    trigger.addEventListener("drop", (event) => handleUploadFiles(trigger.dataset.uploadTrigger, event.dataTransfer?.files));
  });
  safeAddEventListener(elements.floorPlanInput, "change", (event) => {
    handleUploadFiles("floorPlans", event.target.files);
    event.target.value = "";
  });
  safeAddEventListener(elements.renderingInput, "change", (event) => {
    handleUploadFiles("renderings", event.target.files);
    event.target.value = "";
  });
  safeAddEventListener(document.querySelector("#templateBuilder"), "click", (event) => {
    const removeButton = event.target.closest("[data-upload-remove]");
    if (removeButton) removeUploadedImage(removeButton.dataset.uploadRemove, removeButton.dataset.uploadId);
  });
  [elements.projectNameInput, elements.clientNameInput, elements.projectAreaInput, elements.targetBudgetInput, elements.projectRemarkInput].forEach((input) => {
    safeAddEventListener(input, "change", () => {
      syncProjectInfoFromForm();
      render();
    });
  });
  safeAddEventListener(elements.projectCategoryInput, "change", () => {
    renderSubtypeOptions();
    syncProjectInfoFromForm();
    render();
  });
  safeAddEventListener(elements.projectSubtypeInput, "change", () => {
    syncProjectInfoFromForm();
    render();
  });
  safeClick(elements.generateTemplateBtn, generateTemplate);
  safeClick(elements.generateAllSpacesBtn, generateAllSpacesTemplate);
  safeAddEventListener(elements.templateSpaceInput, "change", () => {
    activeLibraryCard = "space";
    renderTemplateLibrary();
  });
  safeAddEventListener(elements.templateStyleInput, "change", () => {
    activeLibraryCard = "style";
    state.style = elements.templateStyleInput.value;
    saveState();
    renderTemplateLibrary();
  });
  safeClick(elements.templateLibraryCards, (event) => {
    const card = event.target.closest("[data-library-card]");
    if (card) setLibraryCard(card.dataset.libraryCard);
  });
  safeClick(elements.templateLibraryPanel, (event) => {
    const spaceButton = event.target.closest("[data-library-space]");
    if (spaceButton) return selectLibrarySpace(spaceButton.dataset.librarySpace);
    const styleButton = event.target.closest("[data-library-style]");
    if (styleButton) return selectLibraryStyle(styleButton.dataset.libraryStyle);
    const modeButton = event.target.closest("[data-library-mode]");
    if (modeButton) return selectDeliveryMode(modeButton.dataset.libraryMode);
    const applyButton = event.target.closest("[data-library-action='apply']");
    if (applyButton) applyLibraryTemplate();
  });
  [elements.newProjectBtn, elements.dropdownNewProjectBtn, elements.sidebarNewProjectBtn].forEach((button) => safeClick(button, addProject));
  safeClick(elements.projectMenuBtn, toggleProjectMenu);
  safeClick(elements.projectDropdownList, handleProjectAction);
  safeClick(elements.sidebarProjectList, handleProjectAction);
  safeAddEventListener(document, "click", (event) => {
    if (elements.projectSwitcher && !elements.projectSwitcher.contains(event.target)) closeProjectMenu();
  });
  safeAddEventListener(document, "keydown", (event) => {
    if (event.key === "Escape") closeProjectMenu();
  });
  safeAddEventListener(elements.exportModeInput, "change", (event) => {
    exportMode = event.target.value;
    clientMode = event.target.value === "client";
    saveState();
    render();
    showToast(exportMode === "client" ? "已切换为客户汇报版导出" : "已切换为内部采购版导出");
  });
  safeClick(elements.importBtn, importSamples);
  safeClick(elements.backupExportBtn, exportBackupJson);
  safeClick(elements.backupImportBtn, () => elements.backupFileInput?.click());
  safeClick(elements.legacyRecoveryBtn, openLegacyRecoveryCenter);
  safeClick(elements.closeLegacyRecoveryBtn, () => elements.legacyRecoveryDialog?.close());
  safeClick(elements.legacyRecoveryList, handleLegacyRecoveryAction);
  safeAddEventListener(elements.backupFileInput, "change", (event) => importBackupJson(event.target.files?.[0]));
  safeClick(elements.restoreSamplesBtn, restoreSampleData);
  safeClick(elements.cleanupUnusedImagesBtn, cleanupUnusedImages);
  safeClick(elements.deleteAllImagesBtn, deleteAllUploadedImages);
  safeClick(elements.uploadBackupExportBtn, exportBackupJson);
  safeClick(elements.uploadRestoreSamplesBtn, restoreSampleData);
  safeClick(elements.exportBtn, exportCsv);
  safeClick(elements.printClientBtn, printClientPdf);
  safeClick(elements.filterPendingBtn, () => {
    pendingOnly = true;
    saveState();
    render();
    document.querySelector("#boq")?.scrollIntoView({ behavior: "smooth" });
    showToast("已筛选待确认、采购询价中、需复核尺寸的产品");
  });
  safeClick(elements.clearFilterBtn, () => {
    pendingOnly = false;
    saveState();
    render();
  });
  safeClick(elements.clientFieldsBtn, () => {
    clientMode = !clientMode;
    saveState();
    render();
    showToast(clientMode ? "已隐藏供应商、单价和内部备注" : "已显示完整内部字段");
  });
  safeAddEventListener(elements.searchInput, "input", (event) => {
    query = event.target.value;
    saveState();
    render();
  });
  safeClick(elements.showSuggestionsBtn, () => elements.suggestionDialog?.showModal());
  safeClick(elements.closeSuggestionBtn, () => elements.suggestionDialog?.close());
  safeClick(elements.closeRenderingPickerBtn, () => elements.renderingPickerDialog?.close());
  safeClick(elements.closeProductLightboxBtn, closeProductImageLightbox);
  safeClick(elements.productZoomInBtn, () => setProductLightboxZoom(productLightboxZoom + PRODUCT_LIGHTBOX_ZOOM_STEP));
  safeClick(elements.productZoomOutBtn, () => setProductLightboxZoom(productLightboxZoom - PRODUCT_LIGHTBOX_ZOOM_STEP));
  safeClick(elements.productZoomResetBtn, () => setProductLightboxZoom(1));
  safeAddEventListener(elements.productLightboxStage, "wheel", (event) => {
    event.preventDefault();
    setProductLightboxZoom(productLightboxZoom + (event.deltaY < 0 ? PRODUCT_LIGHTBOX_ZOOM_STEP : -PRODUCT_LIGHTBOX_ZOOM_STEP));
  }, { passive: false });
  safeAddEventListener(elements.productLightboxStage, "dblclick", () => setProductLightboxZoom(productLightboxZoom === 1 ? 2 : 1));
  safeClick(elements.productImageLightbox, (event) => {
    const rect = elements.productImageLightbox.getBoundingClientRect();
    const isBackdropClick = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (isBackdropClick) closeProductImageLightbox();
  });
  safeClick(elements.closeMaterialSwatchBtn, () => elements.materialSwatchDialog?.close());
  safeClick(elements.materialSwatchZoomInBtn, () => setMaterialSwatchZoom(materialSwatchZoom + PRODUCT_LIGHTBOX_ZOOM_STEP));
  safeClick(elements.materialSwatchZoomOutBtn, () => setMaterialSwatchZoom(materialSwatchZoom - PRODUCT_LIGHTBOX_ZOOM_STEP));
  safeClick(elements.materialSwatchZoomResetBtn, () => setMaterialSwatchZoom(1));
  safeClick(elements.materialSwatchDialog, (event) => {
    const rect = elements.materialSwatchDialog.getBoundingClientRect();
    const isBackdropClick = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (isBackdropClick) elements.materialSwatchDialog.close();
  });
  safeClick(elements.renderingPickerDialog, (event) => {
    const button = event.target.closest("button[data-action=\"select-rendering-image\"]");
    if (!button) return;
    selectRenderingImageForItem(elements.renderingPickerDialog.dataset.itemId, button.dataset.renderingId, button.dataset.crop);
  });
}

function initializeApp() {
  try {
    setupEventBindings();
    if (window.__maisonStartupError) enterSafeRecoveryMode(window.__maisonStartupError);
    migrateInlineImagesToIndexedDb()
      .then(() => saveState())
      .then(() => recoverIndexedDbLegacyData())
      .then(() => hydrateWorkspaceFromIndexedDb())
      .catch((error) => console.warn("IndexedDB 图片恢复失败", error));
    render();
  } catch (error) {
    console.error("应用初始化失败，已进入安全恢复模式", error);
    enterSafeRecoveryMode(error);
  }
}

runWhenDomReady(initializeApp);
