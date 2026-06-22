const fs = require("node:fs");
const path = require("node:path");

const WIKI_ROOT = path.join(__dirname, "data", "wiki");
const COLLECTIONS = [
  { type: "operator", dir: path.join(WIKI_ROOT, "operators") },
  { type: "material", dir: path.join(WIKI_ROOT, "materials") },
];

const REQUIRED_FIELDS = [
  "id",
  "name",
  "type",
  "source.name",
  "source.url",
  "source.updatedAt",
  "searchText",
];

const STATUS_LABELS = {
  complete: "完整可用",
  demo: "演示数据",
  "imported-skeleton": "导入骨架",
  incomplete: "待补充",
};

function getValue(record, pathName) {
  return pathName.split(".").reduce((current, key) => current?.[key], record);
}

function hasValue(record, pathName) {
  const value = getValue(record, pathName);
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isPlaceholder(value) {
  const text = String(value || "").trim();
  return !text || text === "待补充" || text.includes("寰呰ˉ鍏");
}

function collectMissingFields(record) {
  const missing = REQUIRED_FIELDS.filter((field) => !hasValue(record, field));

  if (record.type === "operator") {
    if (!Number(record.rarity)) missing.push("rarity");
    if (isPlaceholder(record.class)) missing.push("class");
    if (isPlaceholder(record.branch)) missing.push("branch");
    if (!Array.isArray(record.skills) || record.skills.length === 0) missing.push("skills");
  }

  if (record.type === "material") {
    if (!Number(record.rarity)) missing.push("rarity");
    if (!Array.isArray(record.recommendedStages) || record.recommendedStages.length === 0) {
      missing.push("recommendedStages");
    }
  }

  return [...new Set(missing)];
}

function classifyWikiRecord(record) {
  if (record.dataMode === "imported-skeleton") return "imported-skeleton";

  const missing = collectMissingFields(record);
  if (missing.length === 0) return "complete";
  if (record.dataMode === "demo") return "demo";
  return "incomplete";
}

function scoreRecord(record, missing) {
  const totalChecks =
    REQUIRED_FIELDS.length +
    (record.type === "operator" ? 4 : 0) +
    (record.type === "material" ? 2 : 0);
  const passedChecks = Math.max(totalChecks - missing.length, 0);
  return Math.round((passedChecks / totalChecks) * 100);
}

function validateWikiRecord(record, relativePath = "") {
  const missing = collectMissingFields(record);
  const status = classifyWikiRecord(record);

  return {
    id: record.id || "",
    name: record.name || path.basename(relativePath, ".json"),
    type: record.type || "unknown",
    status,
    statusLabel: STATUS_LABELS[status] || status,
    score: scoreRecord(record, missing),
    missing,
    sourceName: record.source?.name || "",
    sourceUrl: record.source?.url || "",
    updatedAt: record.source?.updatedAt || "",
    dataMode: record.dataMode || (status === "complete" ? "complete" : status),
    path: relativePath,
  };
}

function readCollection(collection) {
  if (!fs.existsSync(collection.dir)) return [];

  return fs
    .readdirSync(collection.dir)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => {
      const filePath = path.join(collection.dir, file);
      const relativePath = path.relative(WIKI_ROOT, filePath).replace(/\\/g, "/");
      try {
        const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return validateWikiRecord(record, relativePath);
      } catch (error) {
        return {
          id: path.basename(file, ".json"),
          name: path.basename(file, ".json"),
          type: collection.type,
          status: "incomplete",
          statusLabel: STATUS_LABELS.incomplete,
          score: 0,
          missing: ["validJson"],
          sourceName: "",
          sourceUrl: "",
          updatedAt: "",
          dataMode: "incomplete",
          path: relativePath,
          error: error.message,
        };
      }
    });
}

function buildSummary(items) {
  const summary = {
    total: items.length,
    averageScore: 0,
    byType: {},
    byStatus: {},
  };

  for (const item of items) {
    summary.byType[item.type] = (summary.byType[item.type] || 0) + 1;
    summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + 1;
    summary.averageScore += item.score;
  }

  summary.averageScore = items.length ? Math.round(summary.averageScore / items.length) : 0;
  return summary;
}

function buildWikiInventory() {
  const items = COLLECTIONS.flatMap(readCollection);
  return {
    generatedAt: new Date().toISOString(),
    summary: buildSummary(items),
    items,
  };
}

module.exports = {
  buildWikiInventory,
  classifyWikiRecord,
  collectMissingFields,
  validateWikiRecord,
};
