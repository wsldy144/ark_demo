const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildWikiInventory,
  classifyWikiRecord,
  validateWikiRecord,
} = require("./wiki-validate");

test("validateWikiRecord classifies complete operator data", () => {
  const record = {
    id: "kaltsit",
    name: "Kal'tsit",
    type: "operator",
    rarity: 6,
    class: "Medic",
    branch: "Physician",
    source: {
      name: "PRTS Wiki",
      url: "https://prts.wiki/w/Kal'tsit",
      updatedAt: "2026-06-03",
    },
    skills: [{ name: "Command", effect: "Test effect" }],
    searchText: "Kal'tsit Medic skill",
  };

  const result = validateWikiRecord(record, "operators/kaltsit.json");

  assert.equal(result.status, "complete");
  assert.equal(result.score, 100);
  assert.deepEqual(result.missing, []);
  assert.equal(classifyWikiRecord(record), "complete");
});

test("validateWikiRecord reports imported skeleton operator gaps", () => {
  const record = {
    id: "saria",
    name: "Saria",
    type: "operator",
    rarity: 0,
    class: "待补充",
    branch: "待补充",
    dataMode: "imported-skeleton",
    source: {
      name: "PRTS Wiki",
      url: "https://prts.wiki/w/Saria",
      updatedAt: "2026-06-04",
    },
    skills: [],
    searchText: "Saria PRTS",
  };

  const result = validateWikiRecord(record, "operators/saria.json");

  assert.equal(result.status, "imported-skeleton");
  assert.ok(result.score < 100);
  assert.ok(result.missing.includes("skills"));
  assert.ok(result.missing.includes("class"));
  assert.ok(result.missing.includes("branch"));
});

test("buildWikiInventory summarizes operators and materials from disk", () => {
  const inventory = buildWikiInventory();

  assert.ok(inventory.generatedAt);
  assert.equal(inventory.summary.total, inventory.items.length);
  assert.ok(inventory.summary.byType.operator >= 6);
  assert.ok(inventory.summary.byType.material >= 1);
  assert.ok(inventory.summary.byStatus.complete >= 1);
  assert.ok(inventory.summary.byStatus["imported-skeleton"] >= 1);
  assert.ok(inventory.items.some((item) => item.name && item.sourceName === "PRTS Wiki"));
});
