const {
  STICKER_CATALOG,
  appendIncomingGuideCardMessage,
  appendIncomingTextMessage,
  createChatState,
  sendStickerMessage,
  sendTextMessage,
} = window.ChatState;

const CONTACTS = {
  kaltsit: {
    name: "凯尔希",
    avatar: "图片/头像_凯尔希.png",
    placeholder: "发送给凯尔希",
  },
  prts: {
    name: "PRTS",
    avatar: "图片/PRTS.png",
    placeholder: "向 PRTS 查询明日方舟资料",
    ai: true,
  },
};

const STORAGE_KEY = "arktalk.conversations.v2";
const SETTINGS_KEY = "arktalk.friendSettings.v1";
const FEEDBACK_KEY = "arktalk.feedback.v1";

const body = document.body;
const friendCards = document.querySelectorAll(".friend-card");
const backButton = document.querySelector("#backButton");
const composer = document.querySelector("#composer");
const input = document.querySelector("#messageInput");
const messageLog = document.querySelector("#messageLog");
const chatTitle = document.querySelector("#chatTitle");
const stickerButton = document.querySelector("#stickerButton");
const imageButton = document.querySelector("#imageButton");
const stickerPanel = document.querySelector("#stickerPanel");
const stickerGrid = document.querySelector("#stickerGrid");
const quickPrompts = document.querySelector("#quickPrompts");
const friendSearch = document.querySelector("#friendSearch");
const pinButton = document.querySelector("#pinButton");
const muteButton = document.querySelector("#muteButton");
const deleteButton = document.querySelector("#deleteButton");

let activeFriendId = "kaltsit";
const defaultConversations = {
  kaltsit: createChatState({
    messages: [
      { type: "text", sender: "them", text: "这片大地", createdAt: "2026-06-03T12:00:00.000Z" },
      { type: "text", sender: "them", text: "仍有许多苦难", createdAt: "2026-06-03T12:01:00.000Z" },
      { type: "text", sender: "them", text: "如果你已经准备好，就回复我。", createdAt: "2026-06-03T12:02:00.000Z" },
      { type: "text", sender: "me", text: "我在。", createdAt: "2026-06-03T12:03:00.000Z" },
    ],
  }),
  prts: createChatState({
    messages: [
      {
        type: "text",
        sender: "them",
        text: "PRTS 资料查询终端已接入。请输入明日方舟资料查询指令。查询结束。",
        createdAt: "2026-06-03T12:04:00.000Z",
      },
    ],
  }),
};
let conversations = loadStoredConversations();
let friendSettings = loadStoredSettings();
let feedbackStore = loadFeedbackStore();
let lastPrtsEntity = "";

function loadStoredConversations() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored ? { ...defaultConversations, ...stored } : { ...defaultConversations };
  } catch {
    return { ...defaultConversations };
  }
}

function loadStoredSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function loadFeedbackStore() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];
  } catch {
    return [];
  }
}

function persistConversations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function persistSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(friendSettings));
}

function persistFeedback() {
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackStore));
}

function getActiveContact() {
  return CONTACTS[activeFriendId];
}

function getActiveState() {
  return conversations[activeFriendId];
}

function setActiveState(state) {
  conversations[activeFriendId] = state;
  persistConversations();
}

function getLastPreview(message) {
  if (!message) return "";
  if (message.type === "sticker") return "已发送表情包";
  if (message.type === "loading") return "PRTS 正在检索...";
  if (message.type === "guide-card") return message.card?.title || "已生成攻略卡片";
  return message.text || "";
}

function updateQuickPromptVisibility() {
  quickPrompts.hidden = !getActiveContact().ai;
  const entity = lastPrtsEntity || "凯尔希";
  const buttons = quickPrompts.querySelectorAll("[data-prompt]");
  if (buttons[0]) {
    buttons[0].dataset.prompt = `${entity}的技能是什么？`;
  }
  if (buttons[1]) {
    buttons[1].dataset.prompt = `${entity}的基建技能是什么？`;
  }
}

function updateFriendPreview(friendId) {
  const card = document.querySelector(`[data-friend="${friendId}"]`);
  const preview = card?.querySelector(".friend-copy small");
  if (!preview) return;

  const lastMessage = conversations[friendId].messages.at(-1);
  const muted = friendSettings[friendId]?.muted ? "免打扰 · " : "";
  preview.textContent = `${muted}${getLastPreview(lastMessage)}`;
}

function incrementUnread(friendId) {
  if (friendId === activeFriendId || friendSettings[friendId]?.muted) return;
  const badge = document.querySelector(`[data-friend="${friendId}"] [data-unread]`);
  if (!badge) return;
  const nextValue = Number(badge.textContent || "0") + 1;
  badge.textContent = String(nextValue);
  badge.classList.remove("is-empty");
}

function updateFriendSettingsUi() {
  friendCards.forEach((card) => {
    const friendId = card.dataset.friend;
    const settings = friendSettings[friendId] || {};
    card.classList.toggle("is-pinned", Boolean(settings.pinned));
    card.classList.toggle("is-muted", Boolean(settings.muted));
    card.style.order = settings.pinned ? "-1" : "";
  });

  const activeSettings = friendSettings[activeFriendId] || {};
  pinButton.textContent = activeSettings.pinned ? "取消置顶" : "置顶";
  muteButton.textContent = activeSettings.muted ? "取消免打扰" : "免打扰";
}

function openChat(card) {
  const friendId = card.dataset.friend;
  if (!CONTACTS[friendId]) return;

  activeFriendId = friendId;
  friendCards.forEach((item) => item.classList.toggle("is-active", item === card));
  body.classList.add("is-chat");

  const unread = card.querySelector("[data-unread]");
  if (unread) {
    unread.textContent = "0";
    unread.classList.add("is-empty");
  }

  chatTitle.textContent = getActiveContact().name;
  input.placeholder = getActiveContact().placeholder;
  updateQuickPromptVisibility();
  updateFriendSettingsUi();
  stickerPanel.classList.remove("is-open");
  syncMessageLog();
  input.focus();
}

function renderMessage(message) {
  const article = document.createElement("article");
  article.className = `message-row ${message.sender === "me" ? "mine" : "theirs"}`;
  if (isNewDay(message, getActiveState().messages)) {
    article.dataset.showDate = formatMessageDate(message.createdAt);
  }
  if (message.type === "loading") {
    article.classList.add("is-loading");
  }

  const avatar = document.createElement("img");
  const contact = getActiveContact();
  avatar.src = message.sender === "me" ? "图片/头像__博士65.png" : contact.avatar;
  avatar.alt = message.sender === "me" ? "博士头像" : `${contact.name}头像`;

  const bubble = document.createElement(message.type === "guide-card" ? "div" : "p");

  if (message.type === "sticker") {
    bubble.classList.add("sticker-bubble");
    const stickerImage = document.createElement("img");
    stickerImage.dataset.sticker = "true";
    stickerImage.dataset.stickerId = message.sticker.id;
    stickerImage.dataset.stickerLabel = message.sticker.label;
    stickerImage.dataset.stickerUrl = message.sticker.url;
    stickerImage.src = message.sticker.url;
    stickerImage.alt = message.sticker.alt;
    bubble.append(stickerImage);
  } else if (message.type === "guide-card") {
    bubble.classList.add("guide-card-bubble");
    bubble.append(renderGuideCard(message));
  } else {
    bubble.textContent = message.text;
  }

  article.append(avatar, bubble);

  if (message.createdAt) {
    const time = document.createElement("time");
    time.className = "message-time";
    time.dateTime = message.createdAt;
    time.textContent = formatMessageTime(message.createdAt);
    article.append(time);
  }

  return article;
}

function isNewDay(message, messages) {
  if (!message.createdAt) return false;
  const index = messages.indexOf(message);
  if (index <= 0) return true;
  const previous = messages[index - 1];
  if (!previous?.createdAt) return true;
  return new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
}

function formatMessageDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderGuideCard(message) {
  const card = message.card;
  const wrapper = document.createElement("section");
  wrapper.className = "guide-card";

  const reply = document.createElement("p");
  reply.className = "guide-card-reply";
  reply.textContent = message.reply || "检索完成。查询结束。";
  wrapper.append(reply);

  const head = document.createElement("div");
  head.className = "guide-card-head";

  const title = document.createElement("strong");
  title.textContent = card.title;
  const meta = document.createElement("span");
  if (card.operator) {
    meta.textContent = `${card.operator.class} / ${card.operator.branch} / ${card.operator.rarity}★`;
  } else if (card.material) {
    meta.textContent = `材料 / ${card.material.rarity}★`;
  } else {
    meta.textContent = card.type;
  }
  head.append(title, meta);
  wrapper.append(head);

  const trust = document.createElement("div");
  const mode = card.dataMode || "demo";
  trust.className = `guide-card-trust status-${mode}`;
  const trustLabels = {
    complete: "完整可用",
    demo: "演示数据",
    "imported-skeleton": "真实页面导入骨架",
    incomplete: "待补充",
  };
  trust.textContent = trustLabels[mode] || trustLabels.demo;
  wrapper.append(trust);

  if (Array.isArray(card.skills)) {
    const skillList = document.createElement("div");
    skillList.className = "skill-card-list";
    card.skills.forEach((skill) => {
      const item = document.createElement("article");
      item.className = "skill-card";

      const skillTitle = document.createElement("h3");
      skillTitle.textContent = `${skill.slot}技能：${skill.name}`;

      const facts = document.createElement("dl");
      [
        ["类型", skill.activation],
        ["消耗", String(skill.spCost)],
        ["初始", String(skill.initialSp)],
        ["持续", skill.duration ? `${skill.duration}s` : "瞬发"],
      ].forEach(([label, value]) => {
        const term = document.createElement("dt");
        term.textContent = label;
        const detail = document.createElement("dd");
        detail.textContent = value;
        facts.append(term, detail);
      });

      const effect = document.createElement("p");
      effect.textContent = skill.effect;

      item.append(skillTitle, facts, effect);
      skillList.append(item);
    });
    wrapper.append(skillList);
  }

  if (Array.isArray(card.sections)) {
    const sectionList = document.createElement("div");
    sectionList.className = "skill-card-list";
    card.sections.forEach((section) => {
    const item = document.createElement("article");
    item.className = "skill-card";

      const sectionTitle = document.createElement("h3");
      sectionTitle.textContent = section.title;

    const facts = document.createElement("dl");
      (section.rows || []).forEach(({ label, value }) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const detail = document.createElement("dd");
      detail.textContent = value;
      facts.append(term, detail);
    });

      const effect = document.createElement("p");
      effect.textContent = section.body || "";

      item.append(sectionTitle, facts, effect);
      sectionList.append(item);
  });
    wrapper.append(sectionList);
  }

  const source = document.createElement("footer");
  source.className = "guide-card-source";
  const sourceLink = document.createElement("a");
  sourceLink.href = card.source.url;
  sourceLink.target = "_blank";
  sourceLink.rel = "noreferrer";
  sourceLink.textContent = `来源：${card.source.name}`;
  const updated = document.createElement("span");
  updated.textContent = `更新时间：${card.updatedAt}`;
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "复制来源";
  copyButton.addEventListener("click", () => {
    navigator.clipboard?.writeText(card.source.url);
    copyButton.textContent = "已复制";
  });
  source.append(sourceLink, updated, copyButton);
  wrapper.append(source);

  const feedback = document.createElement("div");
  feedback.className = "guide-card-feedback";
  ["有用", "错误"].forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      feedbackStore.push({
        cardType: card.type,
        title: card.title,
        value: label,
        createdAt: new Date().toISOString(),
      });
      persistFeedback();
      button.textContent = "已记录";
    });
    feedback.append(button);
  });
  wrapper.append(feedback);

  return wrapper;
}

function syncMessageLog() {
  const state = getActiveState();
  messageLog.replaceChildren(...state.messages.map(renderMessage));
  messageLog.scrollTop = messageLog.scrollHeight;
  updateFriendPreview(activeFriendId);
}

function appendLoadingMessage(friendId, text = "PRTS 正在检索 Wiki...") {
  conversations[friendId] = {
    ...conversations[friendId],
    messages: [
      ...conversations[friendId].messages,
      { type: "loading", sender: "them", text },
    ],
  };
  persistConversations();
  if (friendId === activeFriendId) syncMessageLog();
}

function updateLoadingMessage(friendId, text) {
  const messages = conversations[friendId].messages.map((message) => (
    message.type === "loading" ? { ...message, text } : message
  ));
  conversations[friendId] = { ...conversations[friendId], messages };
  persistConversations();
  if (friendId === activeFriendId) syncMessageLog();
}

function replaceLoadingWithReply(friendId, payload) {
  const messages = conversations[friendId].messages.filter((message) => message.type !== "loading");
  conversations[friendId] = payload?.card
    ? appendIncomingGuideCardMessage({ messages }, payload)
    : appendIncomingTextMessage({ messages }, payload?.reply || payload);
  if (payload?.card?.operator?.name) {
    lastPrtsEntity = payload.card.operator.name;
  }
  persistConversations();
  incrementUnread(friendId);
  if (friendId === activeFriendId) syncMessageLog();
  updateFriendPreview(friendId);
}

async function requestPrtsReply(friendId, text) {
  appendLoadingMessage(friendId, "PRTS 正在检索 Wiki...");
  const stageTimer = setTimeout(() => {
    updateLoadingMessage(friendId, "PRTS 正在生成攻略卡片...");
  }, 700);

  try {
    const resolvedText = resolvePronounQuery(text);
    const response = await fetch("/api/prts/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: resolvedText, contextEntity: lastPrtsEntity }),
    });
    const data = await response.json();
    clearTimeout(stageTimer);
    replaceLoadingWithReply(friendId, data);
  } catch {
    clearTimeout(stageTimer);
    replaceLoadingWithReply(friendId, { reply: "连接错误，无法提供。查询结束。" });
  }
}

function resolvePronounQuery(text) {
  const value = String(text || "").trim();
  if (!lastPrtsEntity) return value;
  if (/(他|她|其|这个干员|该干员)/.test(value) && !value.includes(lastPrtsEntity)) {
    return `${lastPrtsEntity}：${value}`;
  }
  return value;
}

function commitTextMessage(text) {
  const before = getActiveState();
  const next = sendTextMessage(before, text);
  if (next === before) return;

  setActiveState(next);
  syncMessageLog();

  if (getActiveContact().ai) {
    requestPrtsReply(activeFriendId, next.messages.at(-1).text);
  }
}

function sendPromptToPrts(prompt) {
  const prtsCard = document.querySelector('[data-friend="prts"]');
  if (prtsCard && activeFriendId !== "prts") {
    openChat(prtsCard);
  }
  commitTextMessage(prompt);
}

function commitStickerMessage(sticker) {
  setActiveState(sendStickerMessage(getActiveState(), sticker));
  syncMessageLog();
}

STICKER_CATALOG.forEach((sticker) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sticker-item";
  const preview = document.createElement("img");
  preview.src = sticker.url;
  preview.alt = sticker.alt;
  const caption = document.createElement("span");
  caption.textContent = sticker.label;
  button.append(preview, caption);
  button.addEventListener("click", () => {
    commitStickerMessage(sticker);
    input.value = "";
    input.style.height = "";
    stickerPanel.classList.remove("is-open");
  });
  stickerGrid.append(button);
});

friendCards.forEach((card) => {
  card.addEventListener("click", () => openChat(card));
});

imageButton.addEventListener("click", () => {
  commitTextMessage("[图片发送入口] 原型阶段：此处可接入游戏截图、干员卡片或作战记录图片。");
});

quickPrompts.addEventListener("click", (event) => {
  const target = event.target.closest("[data-prompt]");
  if (!target) return;
  sendPromptToPrts(target.dataset.prompt);
});

friendSearch.addEventListener("input", () => {
  const keyword = friendSearch.value.trim().toLowerCase();
  friendCards.forEach((card) => {
    const name = card.querySelector(".friend-copy strong")?.textContent.toLowerCase() || "";
    card.hidden = Boolean(keyword) && !name.includes(keyword);
  });
});

pinButton.addEventListener("click", () => {
  friendSettings[activeFriendId] = {
    ...friendSettings[activeFriendId],
    pinned: !friendSettings[activeFriendId]?.pinned,
  };
  persistSettings();
  updateFriendSettingsUi();
});

muteButton.addEventListener("click", () => {
  friendSettings[activeFriendId] = {
    ...friendSettings[activeFriendId],
    muted: !friendSettings[activeFriendId]?.muted,
  };
  persistSettings();
  updateFriendSettingsUi();
  updateFriendPreview(activeFriendId);
});

deleteButton.addEventListener("click", () => {
  conversations[activeFriendId] = createChatState({ messages: [] });
  persistConversations();
  syncMessageLog();
});

backButton.addEventListener("click", () => {
  body.classList.remove("is-chat");
});

stickerButton.addEventListener("click", () => {
  stickerPanel.classList.toggle("is-open");
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value;
  commitTextMessage(text);
  input.value = "";
  input.style.height = "";
  stickerPanel.classList.remove("is-open");
});

input.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    composer.requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "44px";
  input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
});

document.addEventListener("click", (event) => {
  if (!stickerPanel.contains(event.target) && !stickerButton.contains(event.target)) {
    stickerPanel.classList.remove("is-open");
  }
});

window.addEventListener("load", () => {
  chatTitle.textContent = getActiveContact().name;
  input.placeholder = getActiveContact().placeholder;
  updateQuickPromptVisibility();
  Object.keys(conversations).forEach(updateFriendPreview);
  updateFriendSettingsUi();
  syncMessageLog();
});
