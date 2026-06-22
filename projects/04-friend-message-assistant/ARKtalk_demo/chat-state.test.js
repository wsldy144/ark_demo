const test = require("node:test");
const assert = require("node:assert/strict");

const {
  appendIncomingGuideCardMessage,
  appendIncomingTextMessage,
  createChatState,
  sendTextMessage,
  sendStickerMessage,
} = require("./chat-state");

test("sendTextMessage trims whitespace and stores a text message", () => {
  const state = createChatState();
  const next = sendTextMessage(state, "  我在。  ");

  assert.equal(next.messages.at(-1).type, "text");
  assert.equal(next.messages.at(-1).text, "我在。");
  assert.ok(next.messages.at(-1).createdAt);
  assert.equal(next.messages.length, 1);
});

test("sendStickerMessage stores sticker metadata", () => {
  const state = createChatState();
  const next = sendStickerMessage(state, {
    id: "cat-surprised",
    url: "https://example.com/cat.png",
    alt: "惊讶猫",
  });

  assert.equal(next.messages.at(-1).type, "sticker");
  assert.equal(next.messages.at(-1).sticker.id, "cat-surprised");
  assert.equal(next.messages.at(-1).sticker.url, "https://example.com/cat.png");
});

test("appendIncomingTextMessage stores text from the active friend", () => {
  const state = createChatState();
  const next = appendIncomingTextMessage(state, "检索完成。查询结束。");

  assert.equal(next.messages.at(-1).type, "text");
  assert.equal(next.messages.at(-1).sender, "them");
  assert.equal(next.messages.at(-1).text, "检索完成。查询结束。");
});

test("appendIncomingGuideCardMessage stores structured PRTS guide cards", () => {
  const state = createChatState();
  const next = appendIncomingGuideCardMessage(state, {
    reply: "检索完成。查询结束。",
    card: {
      type: "skill-guide",
      title: "凯尔希 技能资料",
      skills: [],
      source: { name: "PRTS Wiki", url: "https://prts.wiki/w/凯尔希" },
      updatedAt: "2026-06-03",
    },
  });

  assert.equal(next.messages.at(-1).type, "guide-card");
  assert.equal(next.messages.at(-1).sender, "them");
  assert.equal(next.messages.at(-1).reply, "检索完成。查询结束。");
  assert.equal(next.messages.at(-1).card.title, "凯尔希 技能资料");
});
