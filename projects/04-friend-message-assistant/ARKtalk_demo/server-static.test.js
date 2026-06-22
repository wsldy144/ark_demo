const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveStaticPath } = require("./server");

test("static server never resolves the DeepSeek API key file", () => {
  assert.equal(resolveStaticPath("/deepseekapi.txt"), "");
});

test("static server rejects path traversal outside the project", () => {
  assert.equal(resolveStaticPath("/../deepseekapi.txt"), "");
});
