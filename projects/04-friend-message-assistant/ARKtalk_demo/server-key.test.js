const test = require("node:test");
const assert = require("node:assert/strict");

const { extractDeepSeekApiKey } = require("./server");

test("extractDeepSeekApiKey extracts an sk-prefixed key from annotated text", () => {
  const key = extractDeepSeekApiKey("DeepSeek 密钥：sk-abc_123-XYZ\n请勿外传");

  assert.equal(key, "sk-abc_123-XYZ");
});
