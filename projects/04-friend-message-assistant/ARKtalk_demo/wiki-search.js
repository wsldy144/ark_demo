const fs = require("node:fs");
const path = require("node:path");
const { classifyWikiRecord } = require("./wiki-validate");

const OPERATORS_DIR = path.join(__dirname, "data", "wiki", "operators");
const MATERIALS_DIR = path.join(__dirname, "data", "wiki", "materials");
const PLAYER_PROFILE_PATH = path.join(__dirname, "data", "player-profile.json");
const GAME_CONTEXT_PATH = path.join(__dirname, "data", "game-context.json");

function loadOperators() {
  if (!fs.existsSync(OPERATORS_DIR)) return [];

  return fs
    .readdirSync(OPERATORS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(OPERATORS_DIR, file);
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    });
}

function loadMaterials() {
  if (!fs.existsSync(MATERIALS_DIR)) return [];

  return fs
    .readdirSync(MATERIALS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(MATERIALS_DIR, file);
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    });
}

function loadPlayerProfile() {
  if (!fs.existsSync(PLAYER_PROFILE_PATH)) {
    return {
      ownedOperators: [],
      missingOperators: [],
    };
  }

  return JSON.parse(fs.readFileSync(PLAYER_PROFILE_PATH, "utf8"));
}

function loadGameContext() {
  if (!fs.existsSync(GAME_CONTEXT_PATH)) {
    return {
      currentStage: null,
      currentActivity: "",
      recommendedRoles: [],
    };
  }

  return JSON.parse(fs.readFileSync(GAME_CONTEXT_PATH, "utf8"));
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function inferIntent(query) {
  const normalized = normalizeText(query);
  if (/(材料|掉落|哪里刷|刷取|理智|固源岩|源岩)/i.test(normalized)) return "material";
  if (/(配队|替代|没有|怎么打|阵容|打法)/i.test(normalized)) return "squad-advice";
  if (/(基建|后勤|贸易站|制造站|控制中枢|训练室)/i.test(normalized)) return "base-skills";
  if (/(技能|一技能|二技能|三技能|skill)/i.test(normalized)) return "skills";
  return "profile";
}

function scoreOperator(operator, query) {
  const normalizedQuery = normalizeText(query);
  const haystack = normalizeText([
    operator.name,
    ...(operator.aliases || []),
    operator.class,
    operator.branch,
    operator.searchText,
  ].join(" "));

  let score = 0;
  if (normalizedQuery.includes(normalizeText(operator.name))) score += 12;
  for (const alias of operator.aliases || []) {
    if (normalizedQuery.includes(normalizeText(alias))) score += 8;
  }

  for (const token of normalizedQuery.split(/[，。！？,.!?、\s]+/).filter(Boolean)) {
    if (haystack.includes(token)) score += 1;
  }

  return score;
}

function scoreMaterial(material, query) {
  const normalizedQuery = normalizeText(query);
  const haystack = normalizeText([
    material.name,
    ...(material.aliases || []),
    material.searchText,
  ].join(" "));

  let score = 0;
  if (normalizedQuery.includes(normalizeText(material.name))) score += 12;
  for (const alias of material.aliases || []) {
    if (normalizedQuery.includes(normalizeText(alias))) score += 8;
  }
  if (/(材料|掉落|哪里刷|刷取)/.test(normalizedQuery)) score += 3;
  if (haystack.includes(normalizedQuery)) score += 1;
  return score;
}

function searchWiki(query) {
  const intent = inferIntent(query);
  if (intent === "material") {
    const material = loadMaterials()
      .map((item) => ({
        material: item,
        score: scoreMaterial(item, query),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (material?.score > 0) {
      return {
        intent,
        material: material.material,
        source: material.material.source,
        score: material.score,
      };
    }
  }

  const operators = loadOperators();
  const ranked = operators
    .map((operator) => ({
      operator,
      score: scoreOperator(operator, query),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score <= 0) {
    return null;
  }

  return {
    intent,
    operator: best.operator,
    source: best.operator.source,
    score: best.score,
  };
}

function createCardBase(type, title, source) {
  return {
    type,
    title,
    sections: [],
    source,
    updatedAt: source.updatedAt,
    dataMode: "demo",
  };
}

function getRecordDataMode(record) {
  if (!record) return "demo";
  return record.dataMode || classifyWikiRecord(record);
}

function createOperatorOverviewCard(result) {
  if (!result?.operator) return null;
  const { operator } = result;
  const card = createCardBase("operator-overview", `${operator.name} 干员概览`, operator.source);
  card.dataMode = getRecordDataMode(operator);
  card.operator = {
    id: operator.id,
    name: operator.name,
    rarity: operator.rarity,
    class: operator.class,
    branch: operator.branch,
  };
  card.sections.push({
    title: "定位",
    rows: [
      { label: "职业", value: operator.class },
      { label: "分支", value: operator.branch },
      { label: "稀有度", value: `${operator.rarity}★` },
      { label: "关键词", value: (operator.aliases || []).join(" / ") || operator.name },
    ],
    body: `${operator.name}是${operator.class}/${operator.branch}干员。该卡片为演示资料，用于展示游戏内攻略助手的结构化输出。`,
  });
  return card;
}

function createBaseSkillGuideCard(result) {
  if (!result?.operator) return null;
  const { operator } = result;
  const card = createCardBase("base-skill-guide", `${operator.name} 基建技能`, operator.source);
  card.dataMode = getRecordDataMode(operator);
  card.operator = {
    id: operator.id,
    name: operator.name,
    rarity: operator.rarity,
    class: operator.class,
    branch: operator.branch,
  };
  card.sections = (operator.baseSkills || []).map((skill) => ({
    title: skill.name,
    rows: [
      { label: "解锁", value: skill.unlock },
      { label: "房间", value: skill.room },
    ],
    body: skill.effect,
  }));
  return card;
}

function createSkillGuideCard(result) {
  if (!result?.operator) return null;
  const { operator } = result;

  return {
    type: "skill-guide",
    title: `${operator.name} 技能资料`,
    operator: {
      id: operator.id,
      name: operator.name,
      rarity: operator.rarity,
      class: operator.class,
      branch: operator.branch,
    },
    skills: operator.skills.map((skill) => ({
      slot: skill.slot,
      name: skill.name,
      activation: skill.activation,
      spCost: skill.spCost,
      initialSp: skill.initialSp,
      duration: skill.duration,
      effect: skill.effect,
    })),
    source: operator.source,
    updatedAt: operator.source.updatedAt,
    dataMode: getRecordDataMode(operator),
  };
}

function createMaterialGuideCard(result) {
  if (!result?.material) return null;
  const { material } = result;
  const card = createCardBase("material-drop-guide", `${material.name} 掉落推荐`, material.source);
  card.dataMode = getRecordDataMode(material);
  card.material = {
    id: material.id,
    name: material.name,
    rarity: material.rarity,
  };
  card.sections = material.recommendedStages.map((stage) => ({
    title: `${stage.stage} ${stage.name}`,
    rows: [
      { label: "理智", value: String(stage.sanity) },
      { label: "用途", value: "材料刷取" },
    ],
    body: stage.reason,
  }));
  return card;
}

function createSquadAdviceCard(result, profile = loadPlayerProfile(), gameContext = loadGameContext()) {
  const source = result?.source || {
    name: "ARKtalk Demo Profile",
    url: "data/player-profile.json",
    updatedAt: "2026-06-03",
  };
  const card = createCardBase("squad-advice", "账号上下文配队建议", source);
  card.sections = [
    {
      title: "已拥有干员",
      rows: profile.ownedOperators.map((name) => ({ label: "可用", value: name })),
      body: "建议优先围绕已拥有高练度干员构建方案，减少不可执行推荐。",
    },
    {
      title: "缺失干员",
      rows: profile.missingOperators.map((name) => ({ label: "缺失", value: name })),
      body: "若攻略依赖缺失干员，PRTS 应提供替代职业或功能位。",
    },
    {
      title: "本次建议",
      rows: [
        { label: "输出", value: profile.ownedOperators.includes("银灰") ? "银灰" : "选择已练近卫" },
        { label: "治疗", value: profile.ownedOperators.includes("凯尔希") ? "凯尔希" : "选择高练医疗" },
        { label: "法伤", value: profile.ownedOperators.includes("艾雅法拉") ? "艾雅法拉" : "选择术师干员" },
      ],
      body: "演示建议：基于账号已有干员生成可执行替代方案。",
    },
  ];

  if (gameContext.currentStage) {
    card.sections.unshift({
      title: "当前游戏上下文",
      rows: [
        { label: "关卡", value: `${gameContext.currentStage.id} ${gameContext.currentStage.name}` },
        { label: "活动", value: gameContext.currentActivity },
        { label: "威胁", value: gameContext.currentStage.threat },
      ],
      body: `失败原因：${gameContext.currentStage.failedReason}`,
    });
  }
  return card;
}

function buildRagContext(result) {
  if (result?.material) {
    const { material } = result;
    return [
      `实体：${material.name}`,
      "材料掉落：",
      material.recommendedStages
        .map((stage) => `${stage.stage} ${stage.name}；理智：${stage.sanity}；说明：${stage.reason}`)
        .join("\n"),
      `来源：${material.source.name} ${material.source.url}`,
      `更新时间：${material.source.updatedAt}`,
    ].join("\n");
  }

  if (!result?.operator) return "";
  const { operator } = result;

  const skillLines = operator.skills
    .map((skill) => [
      `技能${skill.slot}：${skill.name}`,
      `类型：${skill.activation}`,
      `消耗：${skill.spCost}`,
      `初始：${skill.initialSp}`,
      `持续：${skill.duration}`,
      `效果：${skill.effect}`,
    ].join("；"))
    .join("\n");

  const baseSkillLines = (operator.baseSkills || [])
    .map((skill) => `${skill.name}（${skill.unlock} / ${skill.room}）：${skill.effect}`)
    .join("\n");

  return [
    `实体：${operator.name}`,
    `职业：${operator.class} / ${operator.branch}`,
    `稀有度：${operator.rarity}`,
    "技能资料：",
    skillLines,
    "基建技能：",
    baseSkillLines || "无演示数据",
    `来源：${operator.source.name} ${operator.source.url}`,
    `更新时间：${operator.source.updatedAt}`,
  ].join("\n");
}

module.exports = {
  buildRagContext,
  createBaseSkillGuideCard,
  createMaterialGuideCard,
  createOperatorOverviewCard,
  createSkillGuideCard,
  createSquadAdviceCard,
  inferIntent,
  loadGameContext,
  loadMaterials,
  loadOperators,
  loadPlayerProfile,
  searchWiki,
};
