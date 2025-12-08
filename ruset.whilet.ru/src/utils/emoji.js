const APPLE_EMOJI_BASE_URL =
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64";

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
