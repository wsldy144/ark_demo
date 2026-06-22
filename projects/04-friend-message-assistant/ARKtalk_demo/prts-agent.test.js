const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPrtsResponse,
  buildPrtsMessages,
  requestPrtsReply,
} = require("./prts-agent");

test("buildPrtsMessages creates a mechanical PRTS prompt", () => {
  const messages = buildPrtsMessages("凯尔希的基建技能是什么？");

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /你是 PRTS/);
  assert.match(messages[0].content, /冷漠/);
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /凯尔希的基建技能是什么？/);
});

test("buildPrtsMessages includes retrieved wiki context when present", () => {
  const messages = buildPrtsMessages("凯尔希的技能是什么？", "实体：凯尔希\n技能资料：...");

  assert.match(messages[1].content, /参考资料/);
  assert.match(messages[1].content, /实体：凯尔希/);
});

test("buildPrtsResponse attaches a skill guide card for operator skill queries", async () => {
  const response = await buildPrtsResponse({
    apiKey: "test-key",
    message: "凯尔希的技能是什么？",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "检索完成。干员凯尔希技能资料如下。查询结束。",
              },
            },
          ],
        };
      },
    }),
  });

  assert.equal(response.reply, "检索完成。干员凯尔希技能资料如下。查询结束。");
  assert.equal(response.card.type, "skill-guide");
  assert.equal(response.card.operator.name, "凯尔希");
  assert.equal(response.sources[0].name, "PRTS Wiki");
});

test("buildPrtsResponse attaches material drop cards", async () => {
  const response = await buildPrtsResponse({
    apiKey: "test-key",
    message: "固源岩哪里刷",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: "检索完成。材料掉落资料如下。查询结束。" } }] };
      },
    }),
  });

  assert.equal(response.card.type, "material-drop-guide");
  assert.equal(response.card.title, "固源岩 掉落推荐");
});

test("buildPrtsResponse prefers base skill cards for base skill queries", async () => {
  const response = await buildPrtsResponse({
    apiKey: "test-key",
    message: "凯尔希的基建技能是什么？",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: "检索完成。基建技能资料如下。查询结束。" } }] };
      },
    }),
  });

  assert.equal(response.card.type, "base-skill-guide");
  assert.equal(response.card.title, "凯尔希 基建技能");
});

test("buildPrtsResponse attaches squad advice cards", async () => {
  const response = await buildPrtsResponse({
    apiKey: "test-key",
    message: "没有史尔特尔怎么打",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: "检索完成。账号替代建议如下。查询结束。" } }] };
      },
    }),
  });

  assert.equal(response.card.type, "squad-advice");
  assert.equal(response.card.title, "账号上下文配队建议");
});

test("requestPrtsReply calls DeepSeek chat completions and returns reply text", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "检索完成。测试回复。查询结束。",
              },
            },
          ],
        };
      },
    };
  };

  const reply = await requestPrtsReply({
    apiKey: "test-key",
    message: "能天使的第三技能是什么？",
    fetchImpl,
  });

  assert.equal(reply, "检索完成。测试回复。查询结束。");
  assert.equal(calls[0].url, "https://api.deepseek.com/chat/completions");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-key");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "deepseek-chat");
  assert.equal(body.temperature, 0.1);
  assert.equal(body.messages[0].role, "system");
});
