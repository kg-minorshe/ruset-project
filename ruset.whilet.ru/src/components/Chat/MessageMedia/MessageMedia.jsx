import React, { useEffect } from "react";
import { MediaGroup } from "./components/MediaGroup/MediaGroup";
import { PhotoMedia } from "./components/PhotoMedia/PhotoMedia";
import { VideoMedia } from "./components/VideoMedia/VideoMedia";
import { AudioMedia } from "./components/AudioMedia/AudioMedia";
import { FileMedia } from "./components/FileMedia/FileMedia";
import { useMediaPreloader } from "./hooks/useMediaPreloader";
import "./MessageMedia.scss";

export function MessageMedia({ media, isMe, setFullscreenData }) {
  const { preloadMedia, preloadMediaGroup } = useMediaPreloader();

  // Предзагрузка медиа при монтировании
  useEffect(() => {
    if (Array.isArray(media)) {
      if (media.length > 1) {
        preloadMediaGroup(media);
      } else if (media.length === 1) {
        preloadMedia(media[0]);
      }
    } else if (media) {
      preloadMedia(media);
    }
  }, [media, preloadMedia, preloadMediaGroup]);

  if (Array.isArray(media) && media.length > 1) {
    return (
      <MediaGroup
        media={media}
        isMe={isMe}
        setFullscreenData={setFullscreenData}
      />
    );
  }

  if (Array.isArray(media) && media.length === 0) return null;

  const renderMedia = () => {
    if (!media) return null;

    const mediaContent = media[0] && media[0].id ? media[0] : media;

    switch (mediaContent.type) {
      case "photo":
      case "image":
        return (
          <PhotoMedia
            media={mediaContent}
            isMe={isMe}
            setFullscreenData={setFullscreenData}
          />
        );
      case "video":
        return (
          <VideoMedia
            media={mediaContent}
            isMe={isMe}
            setFullscreenData={setFullscreenData}
          />
        );
      case "audio":
        return <AudioMedia media={mediaContent} isMe={isMe} />;
      case "file":
        return <FileMedia media={mediaContent} isMe={isMe} />;
      default:
        return null;
    }
  };

  return <div className="message-media">{renderMedia()}</div>;
}
