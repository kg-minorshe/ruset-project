const APPLE_EMOJI_BASE_URL = "/emoji/apple/64";

const emojiImageMap = new Map();

export const getEmojiImageUrl = (emojiChar) => {
  if (!emojiChar) return null;
  if (emojiImageMap.has(emojiChar)) {
    return emojiImageMap.get(emojiChar);
  }

  const codePoints = Array.from(emojiChar)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-");

  if (!codePoints) return null;

  const imageUrl = `${APPLE_EMOJI_BASE_URL}/${codePoints}.png`;
  emojiImageMap.set(emojiChar, imageUrl);

  return imageUrl;
};

const sanitizeWithDomParser = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild;
  if (!root) return "";
  const safeRoot = doc.createElement("div");

  const processNode = (node, target) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        target.appendChild(doc.createTextNode(child.textContent));
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) return;

      if (child.tagName === "BR") {
        target.appendChild(doc.createElement("br"));
        return;
      }

      if (child.tagName === "IMG" && child.classList.contains("message-emoji")) {
        const img = doc.createElement("img");
        const src = child.getAttribute("src");
        if (src) img.setAttribute("src", src);
        img.setAttribute("alt", child.getAttribute("alt") || "emoji");
        img.setAttribute("class", "message-emoji");
        img.setAttribute("draggable", "false");
        target.appendChild(img);
        return;
      }

      if (child.tagName === "DIV" || child.tagName === "P") {
        processNode(child, target);
        target.appendChild(doc.createElement("br"));
        return;
      }

      processNode(child, target);
    });
  };

  processNode(root, safeRoot);

  return safeRoot.innerHTML.replace(/<br>$/, "");
};

const fallbackSanitize = (html) =>
  (html || "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<(?!br\b|img\b)[^>]*>/gi, "")
    .replace(/<img(?![^>]*class="message-emoji")[^>]*>/gi, "");

export const sanitizeMessageHtml = (html) => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return fallbackSanitize(html);
  }

  try {
    return sanitizeWithDomParser(html);
  } catch (error) {
    console.error("Failed to sanitize message HTML", error);
    return fallbackSanitize(html);
  }
};

export const hasMessageContent = (html) => {
  const safeHtml = sanitizeMessageHtml(html);
  if (!safeHtml) return false;

  const textOnly = safeHtml
    .replace(/<img[^>]*class="message-emoji"[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();

  const hasEmoji = /<img[^>]*class="message-emoji"[^>]*>/i.test(safeHtml);

  return hasEmoji || textOnly.length > 0;
};
