const STORAGE_KEY = "maison-boq-state-v1";
const LEGACY_STORAGE_KEYS = ["maison-boq-workspace-v2", "maison-boq-state", "maison-boq-project"];
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
const COMMERCIAL_SPACES = ["样板间", "售楼处", "洽谈区", "沙盘区", "VIP室", "会所休闲区", "公区"];
const UPLOAD_COLLECTIONS = {
  floorPlans: { label: "平面图", status: "floorPlanUploadStatus", preview: "floorPlanPreview" },
  renderings: { label: "效果图 / 软装方案", status: "renderingUploadStatus", preview: "renderingPreview" },
};
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_IMAGE_FILE_SIZE = 25 * 1024 * 1024;
const LARGE_IMAGE_SIZE = 2 * 1024 * 1024;
const IMAGE_PREVIEW_MAX_EDGE = 1800;
const IMAGE_PREVIEW_QUALITY = 0.86;
const IMAGE_DB_NAME = "maison-boq-images-v1";
const IMAGE_STORE_NAME = "images";
const STORAGE_WARNING_MESSAGE = "浏览器存储空间不足，已尝试改用 IndexedDB 保存图片预览。";

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
let clientMode = false;
let exportMode = "client";
let pendingOnly = false;
let query = "";
let activeLibraryCard = null;
let currentGenerationContext = null;
saveState();

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
  backupFileInput: document.querySelector("#backupFileInput"),
  restoreSamplesBtn: document.querySelector("#restoreSamplesBtn"),
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
  closeSuggestionBtn: document.querySelector("#closeSuggestionBtn"),
  toast: document.querySelector("#toast"),
};

function loadWorkspace() {
  const current = readStorageValue(STORAGE_KEY);
  if (current) return normalizeWorkspace(migrateLegacyData(current) || current);

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = readStorageValue(key);
    if (legacy) {
      const migrated = migrateLegacyData(legacy);
      return normalizeWorkspace(migrated);
    }
  }

  const project = defaultProject();
  return { version: 1, activeProjectId: project.id, projects: [project] };
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

function migrateLegacyData(value) {
  if (Array.isArray(value?.projects)) return value;
  if (Array.isArray(value?.items) || value?.projectTitle || value?.name) {
    const project = normalizeProject(value);
    return { version: 1, activeProjectId: project.id, projects: [project] };
  }
  if (Array.isArray(value)) {
    const project = { ...defaultProject(), id: createId(), name: "旧版导入项目", items: value };
    return { version: 1, activeProjectId: project.id, projects: [project] };
  }
  return null;
}

function normalizeWorkspace(value) {
  const rawProjects = Array.isArray(value?.projects) && value.projects.length ? value.projects : null;
  const projects = rawProjects ? rawProjects.map(normalizeProject) : [defaultProject()];
  const uniqueProjects = dedupeProjects(projects);
  const activeProjectId = uniqueProjects.some((project) => project.id === value?.activeProjectId)
    ? value.activeProjectId
    : uniqueProjects[0].id;
  return { version: 1, activeProjectId, projects: uniqueProjects };
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
  const name = project.name || project.projectTitle || fallback.name;
  const items = Array.isArray(project.items) ? project.items.map(normalizeItem) : [];
  const projectCategory = PROJECT_SUBTYPES[project.projectCategory] ? project.projectCategory : inferProjectCategory(project.projectType);
  const projectSubtype = normalizeSubtype(project.projectSubtype || project.projectType, projectCategory);
  return {
    id: project.id || createId(),
    name,
    clientName: project.clientName || "",
    projectCategory,
    projectSubtype,
    projectType: project.projectType || `${projectSubtype}软装`,
    area: normalizeArea(project.area ?? extractArea(name)),
    style: project.style || inferProjectStyle(name),
    targetBudget: Number(project.targetBudget || 0),
    remark: project.remark || project.notes || "",
    attachments: normalizeAttachments(project.attachments),
    items,
  };
}

function normalizeItem(item = {}) {
  return {
    id: item.id || createId(),
    space: item.space || "未分区",
    category: item.category || "待分类",
    name: item.name || "未命名产品",
    spec: item.spec || "",
    quantity: Number(item.quantity || 0),
    unit: item.unit || "件",
    unitPrice: Number(item.unitPrice || item.price || 0),
    priceRange: item.priceRange || "",
    supplier: item.supplier || "",
    status: item.status || "待确认",
    note: item.note || item.remark || "",
    clientNote: item.clientNote || item.customerNote || "",
    customerVisible: item.customerVisible !== false,
  };
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
      storage: file.storage || "localStorage",
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
    version: 1,
    activeProjectId: workspace.activeProjectId,
    projects: workspace.projects.map((project) => ({
      id: project.id,
      name: project.name,
      clientName: project.clientName || "",
      projectCategory: project.projectCategory || "家装",
      projectSubtype: project.projectSubtype || "私宅",
      projectType: project.projectType || project.projectSubtype || "",
      area: normalizeArea(project.area),
      style: project.style || "待定风格",
      targetBudget: Number(project.targetBudget || 0),
      remark: project.remark || "",
      attachments: createPersistedAttachments(project.attachments),
      items: project.items.map(normalizeItem),
    })),
  };
}


function createPersistedAttachments(attachments = {}) {
  const normalized = normalizeAttachments(attachments);
  Object.keys(UPLOAD_COLLECTIONS).forEach((collection) => {
    normalized[collection] = normalized[collection].map((file) => (
      file.storage === "indexedDB" && file.storageKey ? { ...file, dataUrl: "" } : file
    ));
  });
  return normalized;
}

function buildImageStorageKey(projectId, collection, imageId) {
  return `${projectId || "project"}:${collection}:${imageId}`;
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

function markWorkspaceImageAsIndexedDb(projectId, collection, imageId, storageKey) {
  const project = workspace.projects.find((entry) => entry.id === projectId);
  const file = project?.attachments?.[collection]?.find((entry) => entry.id === imageId);
  if (!file) return;
  file.storageKey = storageKey;
  file.storage = "indexedDB";
  file.storageNotice = "已保存预览图";
}

async function hydrateWorkspaceFromIndexedDb() {
  const imageFiles = workspace.projects.flatMap((project) => Object.keys(UPLOAD_COLLECTIONS).flatMap((collection) => (
    (project.attachments?.[collection] || []).filter((file) => file.storageKey && !file.dataUrl)
  )));
  if (!imageFiles.length) return;
  const results = await Promise.allSettled(imageFiles.map((file) => readImageFromIndexedDb(file.storageKey)));
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) imageFiles[index].dataUrl = result.value;
  });
  renderUploadPreviews();
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

function getTemplateRows(space, style) {
  return styleSpaceTemplateOverrides[style]?.[space] || spaceTemplates[space] || spaceTemplates.客厅;
}

function resolveProductName(style, category, baseName) {
  return styleProductNames[style]?.[category] || `${styleProfiles[style]?.adjective || "风格化"}${baseName}`;
}

function mapExplicitTemplateItem(space, item) {
  return {
    id: createId(),
    space,
    category: item.category,
    name: item.name,
    spec: item.specs,
    quantity: item.quantity,
    unit: item.unit || "件",
    unitPrice: Number(item.unitPrice || 0),
    priceRange: item.suggestedPrice || "",
    supplier: item.supplier,
    status: item.status || "待确认",
    note: item.internalNote || "",
  };
}

function buildTemplateItems(space, style, context = getGenerationContext()) {
  const explicitTemplates = BOQ_TEMPLATES[style]?.[space];
  const sourceItems = explicitTemplates?.length
    ? explicitTemplates.map((item) => explicitTemplateToTuple(item))
    : getTemplateRows(space, style);
  const profile = styleProfiles[style] || styleProfiles.奶油风;
  const budgetRatio = getBudgetRatio(context);

  return sourceItems.map(([category, baseName, size, quantity, unit, priceRange, productNote]) => {
    const adjustedRange = adjustPriceRange(priceRange, budgetRatio);
    const adjustedQuantity = adjustQuantity(quantity, context, space, category);
    const internalNote = buildInternalNote({ context, style, space, productNote, profile });
    return {
      id: createId(),
      space,
      category,
      name: resolveContextualProductName(style, category, baseName, context, space),
      spec: `常见尺寸：${size}；材质：${profile.material}；颜色：${profile.color}`,
      quantity: adjustedQuantity,
      unit,
      unitPrice: recommendedUnitPrice(adjustedRange),
      priceRange: formatPriceRange(adjustedRange),
      supplier: profile.supplier,
      status: context.projectCategory === "工装" ? "采购询价中" : "待确认",
      note: internalNote,
      clientNote: buildClientNote(context, style, space),
      customerVisible: true,
    };
  });
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
  const generatedItems = spaces.flatMap((space) => generateItemsForSpaceAndStyle(space, style));
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

function subtotal(item) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
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
    button.disabled = !ready;
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
  const results = await Promise.allSettled(selectedFiles.map(readImageFile));
  const uploadedFiles = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  const failures = results.filter((result) => result.status === "rejected").map((result) => result.reason?.message || "读取失败，请重新上传");
  if (uploadedFiles.length) {
    state.attachments = normalizeAttachments(state.attachments);
    uploadedFiles.forEach((file) => {
      file.storageKey = buildImageStorageKey(state.id, collection, file.id);
      saveImageToIndexedDb(file.storageKey, file.dataUrl).catch((error) => console.warn("IndexedDB 图片保存失败", error));
    });
    state.attachments[collection] = [...state.attachments[collection], ...uploadedFiles];
    saveState();
    renderUploadPreviews();
    updateGeneratorAvailability();
  }
  if (failures.length) {
    showToast([...new Set(failures)].join("；"));
    return;
  }
  const previewNotice = uploadedFiles.some((file) => file.storageNotice) ? "，较大图片已保存预览图" : "";
  showToast(`已上传 ${uploadedFiles.length} 张${UPLOAD_COLLECTIONS[collection].label}${previewNotice}`);
}

function validateImageFile(file) {
  const hasSupportedType = SUPPORTED_IMAGE_TYPES.has(file.type);
  const hasSupportedExtension = SUPPORTED_IMAGE_EXTENSIONS.test(file.name || "");
  if (!hasSupportedType && !hasSupportedExtension) {
    throw new Error(`${file.name || "图片"} 格式不支持，请上传 JPG、JPEG、PNG 或 WebP`);
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(`${file.name || "图片"} 图片过大，请压缩到 25MB 以内后重新上传`);
  }
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    try {
      validateImageFile(file);
    } catch (error) {
      reject(error);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      const originalDataUrl = String(reader.result || "");
      if (!originalDataUrl.startsWith("data:image/")) {
        reject(new Error(`${file.name || "图片"} 读取失败，请重新上传`));
        return;
      }
      try {
        const dataUrl = file.size >= LARGE_IMAGE_SIZE ? await compressImageDataUrl(originalDataUrl, file.type) : originalDataUrl;
        resolve({
          id: createId(),
          name: file.name,
          type: file.type || inferImageType(file.name),
          size: file.size,
          dataUrl,
          storageNotice: dataUrl !== originalDataUrl ? "已保存预览图" : "",
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn("图片压缩失败，使用原图预览", error);
        resolve({
          id: createId(),
          name: file.name,
          type: file.type || inferImageType(file.name),
          size: file.size,
          dataUrl: originalDataUrl,
          uploadedAt: new Date().toISOString(),
        });
      }
    });
    reader.addEventListener("error", () => reject(new Error(`${file.name || "图片"} 读取失败，请重新上传`)));
    reader.addEventListener("abort", () => reject(new Error(`${file.name || "图片"} 读取已取消，请重新上传`)));
    reader.readAsDataURL(file);
  });
}

function inferImageType(name = "") {
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  return "image/jpeg";
}

function compressImageDataUrl(dataUrl, type) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const scale = Math.min(1, IMAGE_PREVIEW_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
      if (scale >= 1) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("无法压缩图片"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(type === "image/png" ? "image/png" : "image/jpeg", IMAGE_PREVIEW_QUALITY));
    });
    image.addEventListener("error", () => reject(new Error("读取失败，请重新上传")));
    image.src = dataUrl;
  });
}

function removeUploadedImage(collection, id) {
  state.attachments = normalizeAttachments(state.attachments);
  const removed = state.attachments[collection].find((file) => file.id === id);
  state.attachments[collection] = state.attachments[collection].filter((file) => file.id !== id);
  if (removed?.storageKey) deleteImageFromIndexedDb(removed.storageKey).catch((error) => console.warn("删除 IndexedDB 图片失败", error));
  saveState();
  renderUploadPreviews();
  updateGeneratorAvailability();
  showToast(`${UPLOAD_COLLECTIONS[collection].label}已删除`);
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
    const haystack = [item.space, item.category, item.name, item.spec, item.supplier, item.status].join(" ").toLowerCase();
    return matchesPending && (!searchQuery || haystack.includes(searchQuery));
  });
}

function render() {
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
    : '<tr><td colspan="14" class="empty-cell">暂无匹配产品，请清除筛选或新增产品。</td></tr>';

  updateBudgetSummary();
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
  return `
    <tr>
      <td><strong>${escapeHtml(item.space)}</strong></td>
      <td>${escapeHtml(item.category)}</td>
      <td class="item-cell">${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.spec)}</td>
      <td><input class="inline-number" type="text" inputmode="decimal" value="${escapeHtml(item.quantity)}" data-action="quantity" data-id="${safeId}" aria-label="调整数量" /> ${escapeHtml(item.unit)}</td>
      <td class="price-range customer-hidden">${escapeHtml(item.priceRange || formatPriceRange([Number(item.unitPrice || 0), Number(item.unitPrice || 0)]))}</td>
      <td class="money customer-hidden"><input class="inline-price" type="text" inputmode="decimal" value="${escapeHtml(item.unitPrice)}" data-action="unitPrice" data-id="${safeId}" aria-label="调整单价" /></td>
      <td class="customer-hidden">${escapeHtml(item.supplier)}</td>
      <td class="money" data-subtotal-cell>${money(subtotal(item))}</td>
      <td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td class="customer-hidden note-cell">${escapeHtml(item.note || "-")}</td>
      <td class="note-cell">${escapeHtml(item.clientNote || customerNote(item))}</td>
      <td>${item.customerVisible === false ? "否" : "是"}</td>
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
  elements.clientNoteInput.value = item?.clientNote || "";
  elements.customerVisibleInput.checked = item?.customerVisible !== false;
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
    clientNote: elements.clientNoteInput.value.trim(),
    customerVisible: elements.customerVisibleInput.checked,
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
  pendingOnly = false;
  saveState();
  render();
  showToast(`已导入 ${imported.length} 条示例清单数据`);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportBackupJson() {
  saveState();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  downloadJson(`maison-boq-backup-${timestamp}.json`, createPersistedWorkspace());
  showToast("已导出完整项目备份 JSON");
}

function importBackupJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const nextWorkspace = normalizeWorkspace(migrateLegacyData(parsed) || parsed);
      if (!window.confirm(`确认导入备份？将替换当前浏览器中的 ${workspace.projects.length} 个项目。建议先导出备份。`)) return;
      workspace.version = 1;
      workspace.activeProjectId = nextWorkspace.activeProjectId;
      workspace.projects = nextWorkspace.projects;
      state = getActiveProject();
      pendingOnly = false;
      query = "";
      saveState();
      render();
      showToast(`已导入 ${workspace.projects.length} 个项目备份`);
    } catch (error) {
      console.warn("导入备份失败", error);
      showToast("备份 JSON 格式不正确，导入失败");
    } finally {
      elements.backupFileInput.value = "";
    }
  });
  reader.readAsText(file, "utf-8");
}

function restoreSampleData() {
  const firstConfirm = window.confirm("恢复示例数据会覆盖当前所有项目。是否已先导出备份 JSON？");
  if (!firstConfirm) return;
  const secondConfirm = window.confirm("请再次确认：这会用示例项目替换当前 localStorage 数据，真实项目将不再显示。");
  if (!secondConfirm) return;
  const project = defaultProject();
  workspace.version = 1;
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
  const isClientReport = exportMode !== "internal";
  const headers = isClientReport
    ? ["空间", "品类", "产品名称", "常见尺寸/材质/颜色", "数量", "单位", "建议单价区间", "预算小计", "状态", "客户备注", "是否客户可见"]
    : ["空间", "品类", "产品名称", "常见尺寸/材质/颜色", "数量", "单位", "建议单价区间", "执行单价", "预算小计", "供应商", "状态", "内部备注", "客户版备注", "是否客户可见"];
  const rows = state.items.map((item) => isClientReport
    ? [item.space, item.category, item.name, item.spec, item.quantity, item.unit, item.priceRange || "", subtotal(item), item.status, item.clientNote || customerNote(item), item.customerVisible === false ? "否" : "是"]
    : [item.space, item.category, item.name, item.spec, item.quantity, item.unit, item.priceRange || "", item.unitPrice, subtotal(item), item.supplier, item.status, item.note, item.clientNote || customerNote(item), item.customerVisible === false ? "否" : "是"]);
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
  if (!input) return;
  flushInlineEditSave();
});

elements.tableBody.addEventListener("focusout", (event) => {
  const input = event.target.closest("input[data-action]");
  if (!input) return;
  flushInlineEditSave();
});

elements.tableBody.addEventListener("keydown", (event) => {
  const input = event.target.closest("input[data-action]");
  if (!input || event.key !== "Enter") return;
  event.preventDefault();
  input.blur();
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

elements.floorPlanUploadBtn.addEventListener("click", () => elements.floorPlanInput.click());
elements.renderingUploadBtn.addEventListener("click", () => elements.renderingInput.click());
document.querySelectorAll("[data-upload-trigger]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const collection = trigger.dataset.uploadTrigger;
    (collection === "floorPlans" ? elements.floorPlanInput : elements.renderingInput).click();
  });
  ["dragenter", "dragover"].forEach((eventName) => {
    trigger.addEventListener(eventName, (event) => {
      event.preventDefault();
      trigger.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    trigger.addEventListener(eventName, (event) => {
      event.preventDefault();
      trigger.classList.remove("is-dragover");
    });
  });
  trigger.addEventListener("drop", (event) => {
    handleUploadFiles(trigger.dataset.uploadTrigger, event.dataTransfer?.files);
  });
});
elements.floorPlanInput.addEventListener("change", (event) => {
  handleUploadFiles("floorPlans", event.target.files);
  event.target.value = "";
});
elements.renderingInput.addEventListener("change", (event) => {
  handleUploadFiles("renderings", event.target.files);
  event.target.value = "";
});
document.querySelector("#templateBuilder").addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-upload-remove]");
  if (removeButton) removeUploadedImage(removeButton.dataset.uploadRemove, removeButton.dataset.uploadId);
});
[elements.projectNameInput, elements.clientNameInput, elements.projectAreaInput, elements.targetBudgetInput, elements.projectRemarkInput].forEach((input) => {
  input.addEventListener("change", () => {
    syncProjectInfoFromForm();
    render();
  });
});
elements.projectCategoryInput.addEventListener("change", () => {
  renderSubtypeOptions();
  syncProjectInfoFromForm();
  render();
});
elements.projectSubtypeInput.addEventListener("change", () => {
  syncProjectInfoFromForm();
  render();
});
elements.generateTemplateBtn.addEventListener("click", generateTemplate);
elements.generateAllSpacesBtn.addEventListener("click", generateAllSpacesTemplate);
elements.templateSpaceInput.addEventListener("change", () => {
  activeLibraryCard = "space";
  renderTemplateLibrary();
});
elements.templateStyleInput.addEventListener("change", () => {
  activeLibraryCard = "style";
  state.style = elements.templateStyleInput.value;
  saveState();
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
  exportMode = event.target.value;
  clientMode = event.target.value === "client";
  saveState();
  render();
  showToast(exportMode === "client" ? "已切换为客户汇报版导出" : "已切换为内部采购版导出");
});
elements.importBtn.addEventListener("click", importSamples);
elements.backupExportBtn.addEventListener("click", exportBackupJson);
elements.backupImportBtn.addEventListener("click", () => elements.backupFileInput.click());
elements.backupFileInput.addEventListener("change", (event) => importBackupJson(event.target.files?.[0]));
elements.restoreSamplesBtn.addEventListener("click", restoreSampleData);
elements.exportBtn.addEventListener("click", exportCsv);
elements.printClientBtn.addEventListener("click", printClientPdf);
elements.filterPendingBtn.addEventListener("click", () => {
  pendingOnly = true;
  saveState();
  render();
  document.querySelector("#boq").scrollIntoView({ behavior: "smooth" });
  showToast("已筛选待确认、采购询价中、需复核尺寸的产品");
});
elements.clearFilterBtn.addEventListener("click", () => {
  pendingOnly = false;
  saveState();
  render();
});
elements.clientFieldsBtn.addEventListener("click", () => {
  clientMode = !clientMode;
  saveState();
  render();
  showToast(clientMode ? "已隐藏供应商、单价和内部备注" : "已显示完整内部字段");
});
elements.searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  saveState();
  render();
});
elements.showSuggestionsBtn.addEventListener("click", () => elements.suggestionDialog.showModal());
elements.closeSuggestionBtn.addEventListener("click", () => elements.suggestionDialog.close());

hydrateWorkspaceFromIndexedDb().catch((error) => console.warn("IndexedDB 图片恢复失败", error));
render();
