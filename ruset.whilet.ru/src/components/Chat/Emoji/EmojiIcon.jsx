import { useEffect, useMemo, useState } from "react";
import { getEmojiImageUrl } from "@/utils/emoji";
import "./EmojiIcon.scss";

export const EmojiIcon = ({
  emoji,
  imageUrl,
  className = "",
  size = 20,
  ...props
}) => {
  const resolvedImage = useMemo(
    () => imageUrl || getEmojiImageUrl(emoji),
    [emoji, imageUrl]
  );
  const [isLoading, setIsLoading] = useState(!!resolvedImage);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(!!resolvedImage);
    setHasError(false);
  }, [resolvedImage, emoji]);

  if (resolvedImage && !hasError) {
    return (
      <span
        className={`emoji-icon-wrapper ${className}`.trim()}
        style={{ width: size, height: size }}
        {...props}
      >
        {isLoading && <span className="emoji-loader" aria-hidden="true" />}
        <img
          src={resolvedImage}
          alt={emoji}
          className="emoji-icon"
          width={size}
          height={size}
          loading="lazy"
          draggable="false"
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      </span>
    );
  }

  return (
    <span className={`emoji-icon ${className}`.trim()} {...props}>
      {emoji}
    </span>
  );
};
