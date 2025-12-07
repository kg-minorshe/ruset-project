import React, { useState, useRef } from "react";
import { BiPlay, BiPause, BiError } from "react-icons/bi";
import { formatTime } from "@/utils/formatting";

export function VideoMedia({
  media,
  isMe,
  inGroup,
  onClick,
  setFullscreenData,
}) {
  const [loadState, setLoadState] = useState("loading");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);

  const handleClick = (e) => {
    if (e.target.closest(".video-controls")) return;
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
    <div
      className={`rs-video ${loadState}`}
      onClick={handleClick}
      onMouseEnter={() => {
        if (loadState !== "error") {
          setShowControls(true);
        }
      }}
      onMouseLeave={() => {
        if (loadState !== "error") {
          setShowControls(false);
        }
      }}
    >
      {loadState === "error" && (
        <div className="error-placeholder">
          <BiError></BiError>
        </div>
      )}
      <video
        ref={videoRef}
        src={media.url}
        poster={media.thumbnail}
        onLoadedMetadata={() => {
          setLoadState("loaded");
          setDuration(videoRef.current?.duration || 0);
        }}
        onError={() => setLoadState("error")}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
        }}
        style={{
          opacity: loadState !== "error" ? 1 : 0,
          transition: "opacity 0.3s ease",
          display: loadState === "error" ? "none" : "block",
        }}
        playsInline
        muted
      />

      {loadState !== "error" && (
        <>
          {!isPlaying && (
            <div
              className="video-play-button"
              onClick={(e) => {
                e.stopPropagation();
                if (loadState === "error" || loadState === "loading") return;
                videoRef.current?.play();
                setIsPlaying(true);
              }}
            >
              <BiPlay size={24} />
            </div>
          )}

          {duration > 0 && !isPlaying && (
            <div className="video-duration">{formatTime(duration)}</div>
          )}

          {showControls && isPlaying && (
            <div
              className="video-controls"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="control-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (loadState === "error" || loadState === "loading") return;
                  if (isPlaying) {
                    videoRef.current?.pause();
                  } else {
                    videoRef.current?.play();
                  }
                  setIsPlaying(!isPlaying);
                }}
              >
                {isPlaying ? <BiPause size={18} /> : <BiPlay size={18} />}
              </button>
              <div className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
