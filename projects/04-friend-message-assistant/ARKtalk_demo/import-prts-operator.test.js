const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildOperatorRecordFromHtml,
  extractTitleFromHtml,
} = require("./scripts/import-prts-operator");

const sampleHtml = `
  <html>
    <head><title>凯尔希 - PRTS</title></head>
    <body><h1 id="firstHeading">凯尔希</h1></body>
  </html>
`;

test("extractTitleFromHtml reads the PRTS page heading", () => {
  assert.equal(extractTitleFromHtml(sampleHtml), "凯尔希");
});

test("buildOperatorRecordFromHtml creates a maintainable operator JSON skeleton", () => {
  const record = buildOperatorRecordFromHtml({
    html: sampleHtml,
    sourceUrl: "https://prts.wiki/w/凯尔希",
    updatedAt: "2026-06-04",
  });

  assert.equal(record.id, "kaltsit");
  assert.equal(record.name, "凯尔希");
  assert.equal(record.source.name, "PRTS Wiki");
  assert.equal(record.source.updatedAt, "2026-06-04");
  assert.deepEqual(record.skills, []);
  assert.match(record.searchText, /凯尔希/);
});
