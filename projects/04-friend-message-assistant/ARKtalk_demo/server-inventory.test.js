const test = require("node:test");
const assert = require("node:assert/strict");

const { createServer, resolveStaticPath } = require("./server");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("static server resolves the wiki data management page", () => {
  assert.match(resolveStaticPath("/data-admin.html"), /data-admin\.html$/);
  assert.match(resolveStaticPath("/data-admin.js"), /data-admin\.js$/);
});

test("GET /api/wiki/inventory returns safe wiki validation summary", async () => {
  const server = createServer();
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/wiki/inventory`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.summary.total, body.items.length);
    assert.ok(body.summary.byStatus.complete >= 1);
    assert.ok(body.summary.byStatus["imported-skeleton"] >= 1);
    assert.ok(body.items.every((item) => !("skills" in item)));
    assert.ok(body.items.every((item) => !("baseSkills" in item)));
  } finally {
    await close(server);
  }
});
