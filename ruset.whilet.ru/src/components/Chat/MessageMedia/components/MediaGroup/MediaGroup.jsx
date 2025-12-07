import React, { useState, useEffect } from "react";
import { PhotoMedia } from "../PhotoMedia/PhotoMedia";
import { VideoMedia } from "../VideoMedia/VideoMedia";
import { AudioMedia } from "../AudioMedia/AudioMedia";
import { FileMedia } from "../FileMedia/FileMedia";
import { useVideoThumbnail } from "../../hooks/useVideoThumbnail";
import { formatTime } from "@/utils/formatting";
import { useMediaPreloader } from "../../hooks/useMediaPreloader";
import {
  BiFile,
  BiPlay,
  BiSpreadsheet,
  BiArchive,
  BiImage,
  BiMoviePlay,
  BiMusic,
  BiFileBlank,
} from "react-icons/bi";

export function MediaGroup({ media, isMe, setFullscreenData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { preloadMedia } = useMediaPreloader();

  useEffect(() => {
    media.forEach((item) => {
      if (["photo", "image", "video", "audio"].includes(item.type)) {
        preloadMedia(item);
      }
    });
  }, [media, preloadMedia]);

  const mediaItems = media.filter((item) =>
    ["photo", "video", "file", "audio"].includes(item.type)
  );

  const visualMedia = mediaItems.filter(
    (item) => item.type === "photo" || item.type === "video"
  );
  const fileAudioMedia = mediaItems.filter(
    (item) => item.type === "file" || item.type === "audio"
  );

  const toggleFullscreen = (e, index) => {
    if (e && setFullscreenData) {
      if (
        e.target.closest(".file-download") ||
        e.target.closest(".audio-player")
      )
        return;
    }

    if (setFullscreenData && visualMedia.length > 0) {
      setFullscreenData({
        media: visualMedia,
        currentIndex: index,
        setCurrentIndex,
        groupCaption: media.find((item) => item.groupCaption)?.groupCaption,
      });
    }
  };

  // === GridItem Component ===
  const GridItem = ({ item, index, onClick }) => {
    const [loadState, setLoadState] = useState("loading");

    React.useEffect(() => {
      setLoadState("loading");
    }, [item.url]);

    if (item.type === "photo") {
      return (
        <div className="grid-item" onClick={(e) => onClick(e, index)}>
          {loadState === "loading" && (
            <div className="grid-upload-overlay">
              <div className="loading-placeholder" />
            </div>
          )}
          <img
            src={item.url}
            alt=""
            onLoad={() => setLoadState("loaded")}
            onError={() => setLoadState("error")}
            style={{
              opacity: loadState !== "error" ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        </div>
      );
    }

    if (item.type === "video") {
      const thumbnail = useVideoThumbnail(item.url, item.thumbnail);
      return (
        <div className="grid-item" onClick={(e) => onClick(e, index)}>
          {loadState === "loading" && (
            <div className="grid-upload-overlay">
              <div className="loading-placeholder" />
            </div>
          )}
          <div className="video-grid-item">
            <img
              src={thumbnail || item.url}
              alt=""
              onLoad={() => setLoadState("loaded")}
              onError={() => setLoadState("error")}
              style={{
                opacity: loadState !== "error" ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />
            <div className="video-play-overlay">
              <BiPlay />
            </div>
            {item.duration && (
              <div className="video-duration-overlay">
                {formatTime(item.duration)}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderVisualGrid = () => {
    if (visualMedia.length === 0) return null;
    const mediaCount = visualMedia.length;

    if (mediaCount === 1) {
      return (
        <div className="media-single">
          <GridItem
            item={visualMedia[0]}
            index={0}
            onClick={toggleFullscreen}
          />
        </div>
      );
    }

    if (mediaCount === 2) {
      return (
        <div className="media-grid grid-2">
          {visualMedia.map((item, index) => (
            <GridItem
              key={index}
              item={item}
              index={index}
              onClick={toggleFullscreen}
            />
          ))}
        </div>
      );
    }

    if (mediaCount === 3) {
      return (
        <div className="media-grid grid-3">
          <div className="grid-item large">
            <GridItem
              item={visualMedia[0]}
              index={0}
              onClick={toggleFullscreen}
            />
          </div>
          <div className="grid-column">
            {visualMedia.slice(1).map((item, index) => (
              <GridItem
                key={index + 1}
                item={item}
                index={index + 1}
                onClick={toggleFullscreen}
              />
            ))}
          </div>
        </div>
      );
    }

    if (mediaCount === 4) {
      return (
        <div className="media-grid grid-4">
          {visualMedia.map((item, index) => (
            <GridItem
              key={index}
              item={item}
              index={index}
              onClick={toggleFullscreen}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="media-grid grid-4">
        {visualMedia.slice(0, 3).map((item, index) => (
          <GridItem
            key={index}
            item={item}
            index={index}
            onClick={toggleFullscreen}
          />
        ))}
        <div
          className="grid-item has-more"
          onClick={(e) => toggleFullscreen(e, 3)}
        >
          <GridItem
            item={visualMedia[3]}
            index={3}
            onClick={toggleFullscreen}
          />
          <div className="more-overlay">
            <span>+{mediaCount - 4}</span>
          </div>
        </div>
      </div>
    );
  };

  const getFileIconComponent = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <BiFile size={24} />;
      case "doc":
      case "docx":
        return <BiFile size={24} />;
      case "xls":
      case "xlsx":
        return <BiSpreadsheet size={24} />;
      case "ppt":
      case "pptx":
        return <BiMoviePlay size={24} />;
      case "zip":
      case "rar":
      case "7z":
        return <BiArchive size={24} />;
      case "txt":
        return <BiFileBlank size={24} />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <BiImage size={24} />;
      case "mp4":
      case "avi":
      case "mov":
        return <BiMoviePlay size={24} />;
      case "mp3":
      case "wav":
        return <BiMusic size={24} />;
      default:
        return <BiFile size={24} />;
    }
  };

  return (
    <div className="rs-media-group">
      {visualMedia.length > 0 && renderVisualGrid()}

      {fileAudioMedia.length > 0 && (
        <div className="media-group-file-list">
          {fileAudioMedia.map((item, index) => (
            <div key={index} className="media-group-file-item">
              {item.type === "file" && <FileMedia media={item} isMe={isMe} />}
              {item.type === "audio" && <AudioMedia media={item} isMe={isMe} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
