const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("data admin page loads the inventory client script", () => {
  const html = fs.readFileSync("data-admin.html", "utf8");

  assert.match(html, /id="inventoryRoot"/);
  assert.match(html, /data-admin\.js/);
  assert.match(html, /portfolio\.html/);
});

test("data admin client fetches wiki inventory and renders trust statuses", () => {
  const js = fs.readFileSync("data-admin.js", "utf8");

  assert.match(js, /\/api\/wiki\/inventory/);
  assert.match(js, /complete/);
  assert.match(js, /imported-skeleton/);
  assert.match(js, /incomplete/);
});
