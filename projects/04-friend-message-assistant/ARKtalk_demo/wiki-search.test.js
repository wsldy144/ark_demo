const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createBaseSkillGuideCard,
  createMaterialGuideCard,
  createOperatorOverviewCard,
  createSkillGuideCard,
  createSquadAdviceCard,
  loadGameContext,
  loadPlayerProfile,
  searchWiki,
} = require("./wiki-search");

test("searchWiki finds an operator by name and skill intent", () => {
  const result = searchWiki("凯尔希 三技能");

  assert.equal(result.operator.name, "凯尔希");
  assert.equal(result.intent, "skills");
  assert.equal(result.source.name, "PRTS Wiki");
  assert.match(result.source.url, /prts\.wiki/);
});

test("createSkillGuideCard returns structured skill card fields", () => {
  const result = searchWiki("凯尔希 三技能");
  const card = createSkillGuideCard(result);

  assert.equal(card.type, "skill-guide");
  assert.equal(card.title, "凯尔希 技能资料");
  assert.equal(card.source.name, "PRTS Wiki");
  assert.ok(card.updatedAt);
  assert.equal(card.dataMode, "complete");
  assert.ok(card.skills.length >= 3);
  assert.deepEqual(Object.keys(card.skills[0]), [
    "slot",
    "name",
    "activation",
    "spCost",
    "initialSp",
    "duration",
    "effect",
  ]);
});

test("createOperatorOverviewCard returns role and source metadata", () => {
  const result = searchWiki("银灰概览");
  const card = createOperatorOverviewCard(result);

  assert.equal(card.type, "operator-overview");
  assert.equal(card.title, "银灰 干员概览");
  assert.equal(card.sections[0].title, "定位");
  assert.equal(card.source.name, "PRTS Wiki");
});

test("createBaseSkillGuideCard returns base skill sections", () => {
  const result = searchWiki("凯尔希 基建技能");
  const card = createBaseSkillGuideCard(result);

  assert.equal(card.type, "base-skill-guide");
  assert.equal(card.title, "凯尔希 基建技能");
  assert.ok(card.sections[0].rows.some((row) => row.label === "房间"));
});

test("searchWiki can find material drop data", () => {
  const result = searchWiki("固源岩哪里刷");
  const card = createMaterialGuideCard(result);

  assert.equal(result.intent, "material");
  assert.equal(card.type, "material-drop-guide");
  assert.equal(card.title, "固源岩 掉落推荐");
  assert.equal(card.source.name, "PRTS Wiki");
});

test("createSquadAdviceCard uses player profile ownership", () => {
  const result = searchWiki("没有史尔特尔怎么打");
  const profile = loadPlayerProfile();
  const gameContext = loadGameContext();
  const card = createSquadAdviceCard(result, profile, gameContext);

  assert.equal(card.type, "squad-advice");
  assert.equal(card.title, "账号上下文配队建议");
  assert.ok(card.sections.some((section) => section.title === "已拥有干员"));
  assert.ok(card.sections.some((section) => section.title === "缺失干员"));
  assert.ok(card.sections.some((section) => section.title === "当前游戏上下文"));
});
