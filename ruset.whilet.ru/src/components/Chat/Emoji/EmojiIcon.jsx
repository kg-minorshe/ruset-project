import { useEffect, useMemo, useRef, useState } from "react";
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
  const imgRef = useRef(null);

  useEffect(() => {
    setIsLoading(!!resolvedImage);
    setHasError(false);
  }, [resolvedImage, emoji]);

  useEffect(() => {
    if (!imgRef.current) return;
    if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, [resolvedImage]);

  if (resolvedImage && !hasError) {
    return (
      <span
        className={`emoji-icon-wrapper ${className}`.trim()}
        style={{ width: size, height: size }}
        {...props}
      >
        {isLoading && <span className="emoji-loader" aria-hidden="true" />}
        <img
          ref={imgRef}
          src={resolvedImage}
          alt={emoji}
          className="emoji-icon"
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          draggable="false"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
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
