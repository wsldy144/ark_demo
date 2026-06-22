const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const css = fs.readFileSync("style.css", "utf8");
const app = fs.readFileSync("app.js", "utf8");

function readRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : "";
}

test("sent sticker images override avatar sizing and keep square proportions", () => {
  const rule = readRule(".message-row .sticker-bubble img");

  assert.match(rule, /height:\s*auto/);
  assert.match(rule, /aspect-ratio:\s*1\s*\/\s*1/);
  assert.match(rule, /object-fit:\s*contain/);
});

test("guide card trust badges have distinct status colors", () => {
  assert.match(css, /\.guide-card-trust\.status-complete/);
  assert.match(css, /\.guide-card-trust\.status-demo/);
  assert.match(css, /\.guide-card-trust\.status-imported-skeleton/);
  assert.match(css, /\.guide-card-trust\.status-incomplete/);
  assert.match(app, /guide-card-trust status-/);
});
