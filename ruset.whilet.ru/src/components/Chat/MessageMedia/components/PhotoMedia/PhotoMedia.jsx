import React, { useState, useEffect } from "react";
import { httpCache } from "../../services/httpCacheService";
import { BiError } from "react-icons/bi";

export function PhotoMedia({
  media,
  isMe,
  inGroup,
  onClick,
  setFullscreenData,
}) {
  const [loadState, setLoadState] = useState("loading");
  const [optimizedUrl, setOptimizedUrl] = useState("");

  useEffect(() => {
    const url = httpCache.createOptimizedUrl(media.url, {
      width: 800,
      quality: 100,
    });
    setOptimizedUrl(url);
  }, [media.url]);

  const handleImageLoad = () => {
    setLoadState("loaded");
  };

  const handleImageError = () => {
    setLoadState("error");
  };

  const handleClick = () => {
    if (inGroup && onClick) {
      onClick();
    } else if (!inGroup && setFullscreenData) {
      setFullscreenData({
        media: [media],
        currentIndex: 0,
        setCurrentIndex: () => {},
        groupCaption: null,
      });
    }
  };

  return (
    <div className={`rs-photo ${loadState}`}>
      {loadState === "error" && (
        <div className="error-placeholder">
          <BiError></BiError>
        </div>
      )}
      {optimizedUrl && (
        <img
          src={optimizedUrl}
          alt=""
          onClick={handleClick}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            opacity: loadState !== "error" ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
          loading="lazy"
        />
      )}
    </div>
  );
}
