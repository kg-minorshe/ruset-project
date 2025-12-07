import React, { useState, useRef, useEffect } from "react";
import {
  BiPlay,
  BiPause,
  BiDownload,
  BiLoaderAlt,
  BiErrorAlt,
} from "react-icons/bi";
import { formatTime } from "@/utils/formatting";

export function AudioMedia({ media, isMe }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isError, setIsError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;

    const $el = audioRef.current;

    const handleEvents = () => {
      if ($el.readyState > 0) {
        const dur = $el.duration;
        if (isFinite(dur) && !isNaN(dur)) {
          setDuration(dur);
        } else {
          setDuration(0);
        }
        setIsLoading(false);
      }
    };

    const onTimeUpdate = () => {
      const time = $el.currentTime;
      setCurrentTime(time);
      if (duration > 0) {
        setProgress((time / duration) * 100);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const onError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setIsError(true);
    };

    $el.addEventListener("loadedmetadata", handleEvents);
    $el.addEventListener("durationchange", handleEvents);
    $el.addEventListener("canplay", handleEvents);
    $el.addEventListener("timeupdate", onTimeUpdate);
    $el.addEventListener("ended", onEnded);
    $el.addEventListener("error", onError);

    const durationTimeout = setTimeout(() => {
      if ($el.duration === Infinity || isNaN($el.duration)) {
      }
    }, 1000);

    return () => {
      $el.removeEventListener("loadedmetadata", handleEvents);
      $el.removeEventListener("durationchange", handleEvents);
      $el.removeEventListener("canplay", handleEvents);
      $el.removeEventListener("timeupdate", onTimeUpdate);
      $el.removeEventListener("ended", onEnded);
      $el.removeEventListener("error", onError);
      clearTimeout(durationTimeout);
      $el.pause();
    };
  }, [duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Playback failed:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;

    const effectiveDuration = isFinite(audioRef.current.duration)
      ? audioRef.current.duration
      : duration > 0
      ? duration
      : 0;

    if (effectiveDuration > 0) {
      const newTime = pos * effectiveDuration;
      audioRef.current.currentTime = newTime;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(media.url);
      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = media.name || "download";

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      const fallbackLink = document.createElement("a");
      fallbackLink.href = media.url;
      fallbackLink.download = media.name || "download";
      fallbackLink.target = "_blank";
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rs-audio">
      <audio ref={audioRef} src={media.url} />

      <div className="audio-content">
        <button
          className={`audio-play-btn ${isLoading ? "no-active" : ""}`}
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading"></span>
          ) : isError ? (
            BiErrorAlt
          ) : isPlaying ? (
            <BiPause size={20} />
          ) : (
            <BiPlay size={20} />
          )}
        </button>

        <div className="audio-info">
          <div className="audio-title">
            {media.name || "Голосовое сообщение"}
            {media.type === "audio/webm" && " (WebM)"}
          </div>

          <div className="audio-waveform" onClick={handleProgressClick}>
            <div
              className="waveform-progress"
              style={{ width: `${progress}%` }}
            />
            <div className="waveform-bars">
              {Array.from({ length: 70 }, (_, i) => (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{ height: `${20 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          </div>

          <div className="audio-time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {!isLoading && !isError && (
          <button
            className={`audio-download-btn ${
              isDownloading ? "downloading" : ""
            }`}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <div className="download-spinner" />
            ) : (
              <BiDownload size={18} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
