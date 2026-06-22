const fs = require("node:fs");
const path = require("node:path");

const OUTPUT_DIR = path.join(__dirname, "..", "data", "wiki", "operators");

const KNOWN_IDS = {
  凯尔希: "kaltsit",
  能天使: "exusiai",
  银灰: "silverash",
  艾雅法拉: "eyjafjalla",
  史尔特尔: "surtr",
};

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, "")).trim();
}

function extractTitleFromHtml(html) {
  const headingMatch = String(html).match(/<h1[^>]*id=["']firstHeading["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (headingMatch) return stripTags(headingMatch[1]);

  const titleMatch = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return "";
  return stripTags(titleMatch[1]).replace(/\s*-\s*PRTS\s*$/i, "");
}

function slugifyOperatorName(name) {
  return KNOWN_IDS[name] || encodeURIComponent(name).toLowerCase();
}

function buildOperatorRecordFromHtml({ html, sourceUrl, updatedAt = new Date().toISOString().slice(0, 10) }) {
  const name = extractTitleFromHtml(html);
  const id = slugifyOperatorName(name);

  return {
    id,
    name,
    aliases: [],
    type: "operator",
    rarity: 0,
    class: "待补充",
    branch: "待补充",
    dataMode: "imported-skeleton",
    source: {
      name: "PRTS Wiki",
      url: sourceUrl,
      updatedAt,
    },
    skills: [],
    baseSkills: [],
    searchText: `${name} PRTS Wiki 干员 技能 基建`,
  };
}

async function importOperator(name) {
  const url = `https://prts.wiki/w/${encodeURIComponent(name)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const record = buildOperatorRecordFromHtml({
    html,
    sourceUrl: url,
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${record.id}.imported.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return outputPath;
}

if (require.main === module) {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: node scripts/import-prts-operator.js <干员名>");
    process.exit(1);
  }

  importOperator(name)
    .then((outputPath) => {
      console.log(`Imported skeleton: ${outputPath}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  buildOperatorRecordFromHtml,
  extractTitleFromHtml,
  importOperator,
};
