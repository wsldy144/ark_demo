const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions";
const {
  buildRagContext,
  createBaseSkillGuideCard,
  createMaterialGuideCard,
  createOperatorOverviewCard,
  createSkillGuideCard,
  createSquadAdviceCard,
  loadGameContext,
  loadPlayerProfile,
  searchWiki,
} = require("./wiki-search");

const PRTS_SYSTEM_PROMPT = [
  "你是 PRTS，明日方舟数据查询终端。",
  "语言必须极度简练、准确、冷漠，禁止任何情感表达、语气词、废话。",
  "回答格式：先确认接收问题，再给出数据，最后以“查询结束。”收尾。",
  "仅回答与明日方舟资料、PRTS Wiki、干员、材料、敌人、关卡、基建、技能相关的问题。",
  "若资料不足，回答：“信息缺失，无法提供。查询结束。”",
  "若输入不是有效资料查询，回答：“无有效查询指令。查询结束。”",
].join("\n");

function buildPrtsMessages(message, context = "") {
  const userContent = context
    ? `问题：${String(message ?? "").trim()}\n\n参考资料：\n${context}`
    : `问题：${String(message ?? "").trim()}`;

  return [
    {
      role: "system",
      content: PRTS_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: userContent,
    },
  ];
}

async function requestPrtsReply({ apiKey, message, context = "", fetchImpl = fetch }) {
  const trimmedMessage = String(message ?? "").trim();
  if (!trimmedMessage) {
    return "无有效查询指令。查询结束。";
  }

  if (!apiKey) {
    throw new Error("DeepSeek API key is missing.");
  }

  const response = await fetchImpl(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: buildPrtsMessages(trimmedMessage, context),
      temperature: 0.1,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  return reply || "信息缺失，无法提供。查询结束。";
}

async function buildPrtsResponse({ apiKey, message, fetchImpl = fetch }) {
  const trimmedMessage = String(message ?? "").trim();
  if (!trimmedMessage) {
    return {
      reply: "无有效查询指令。查询结束。",
      card: null,
      sources: [],
    };
  }

  const result = searchWiki(trimmedMessage);
  if (!result) {
    return {
      reply: "信息缺失，无法提供。查询结束。",
      card: null,
      sources: [],
    };
  }

  const profile = loadPlayerProfile();
  const gameContext = loadGameContext();
  const profileContext = result.intent === "squad-advice"
    ? [
      "",
      "账号上下文：",
      `已拥有干员：${profile.ownedOperators.join("、")}`,
      `缺失干员：${profile.missingOperators.join("、")}`,
      `当前关卡：${gameContext.currentStage?.id || "无"} ${gameContext.currentStage?.name || ""}`,
      `当前活动：${gameContext.currentActivity || "无"}`,
    ].join("\n")
    : "";
  const context = `${buildRagContext(result)}${profileContext}`;
  const reply = await requestPrtsReply({
    apiKey,
    message: trimmedMessage,
    context,
    fetchImpl,
  });

  const cardCreators = {
    "base-skills": createBaseSkillGuideCard,
    material: createMaterialGuideCard,
    profile: createOperatorOverviewCard,
    skills: createSkillGuideCard,
    "squad-advice": (searchResult) => createSquadAdviceCard(searchResult, profile, gameContext),
  };
  const card = cardCreators[result.intent]?.(result) || null;
  return {
    reply,
    card,
    sources: [
      {
        name: result.source.name,
        url: result.source.url,
        updatedAt: result.source.updatedAt,
      },
    ],
  };
}

module.exports = {
  DEEPSEEK_CHAT_COMPLETIONS_URL,
  PRTS_SYSTEM_PROMPT,
  buildPrtsResponse,
  buildPrtsMessages,
  requestPrtsReply,
};
