(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.ChatState = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const STICKER_CATALOG = [
    {
      id: "cat-surprised",
      label: "惊讶猫",
      url: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Cat_looking_surprised.jpg",
      alt: "惊讶猫表情包",
    },
    {
      id: "cat-wide-eyed",
      label: "震惊猫",
      url: "https://upload.wikimedia.org/wikipedia/commons/e/ed/Surprised_Cat.jpg",
      alt: "震惊猫表情包",
    },
    {
      id: "disaster-girl",
      label: "灾难女孩",
      url: "https://upload.wikimedia.org/wikipedia/commons/6/60/Disaster_Girl_meme.png",
      alt: "灾难女孩表情包",
    },
  ];

  function createChatState(seed = {}) {
    return {
      messages: Array.isArray(seed.messages) ? [...seed.messages] : [],
    };
  }

  function createTimestamp() {
    return new Date().toISOString();
  }

  function sendTextMessage(state, text) {
    const value = String(text ?? "").trim();
    if (!value) return state;

    return {
      ...state,
      messages: [
        ...state.messages,
        {
          type: "text",
          sender: "me",
          text: value,
          createdAt: createTimestamp(),
        },
      ],
    };
  }

  function sendStickerMessage(state, sticker) {
    if (!sticker?.url) return state;

    return {
      ...state,
      messages: [
        ...state.messages,
        {
          type: "sticker",
          sender: "me",
          sticker: {
            id: sticker.id || sticker.url,
            label: sticker.label || sticker.alt || "表情包",
            url: sticker.url,
            alt: sticker.alt || sticker.label || "表情包",
          },
          createdAt: createTimestamp(),
        },
      ],
    };
  }

  function appendIncomingTextMessage(state, text) {
    const value = String(text ?? "").trim();
    if (!value) return state;

    return {
      ...state,
      messages: [
        ...state.messages,
        {
          type: "text",
          sender: "them",
          text: value,
          createdAt: createTimestamp(),
        },
      ],
    };
  }

  function appendIncomingGuideCardMessage(state, payload) {
    if (!payload?.card) return appendIncomingTextMessage(state, payload?.reply);

    return {
      ...state,
      messages: [
        ...state.messages,
        {
          type: "guide-card",
          sender: "them",
          reply: String(payload.reply || "").trim(),
          card: payload.card,
          sources: Array.isArray(payload.sources) ? payload.sources : [],
          createdAt: createTimestamp(),
        },
      ],
    };
  }

  return {
    STICKER_CATALOG,
    appendIncomingGuideCardMessage,
    appendIncomingTextMessage,
    createChatState,
    sendTextMessage,
    sendStickerMessage,
  };
});
