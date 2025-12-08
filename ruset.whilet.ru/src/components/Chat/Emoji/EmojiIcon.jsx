import { getEmojiImageUrl } from "@/utils/emoji";

export const EmojiIcon = ({
  emoji,
  imageUrl,
  className = "",
  size = 20,
  ...props
}) => {
  const resolvedImage = imageUrl || getEmojiImageUrl(emoji);

  if (resolvedImage) {
    return (
      <img
        src={resolvedImage}
        alt={emoji}
        className={`emoji-icon ${className}`.trim()}
        width={size}
        height={size}
        loading="lazy"
        draggable="false"
        {...props}
      />
    );
  }

  return (
    <span className={`emoji-icon ${className}`.trim()} {...props}>
      {emoji}
    </span>
  );
};
