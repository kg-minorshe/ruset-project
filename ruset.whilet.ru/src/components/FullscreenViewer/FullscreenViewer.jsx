import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BiX,
  BiChevronLeft,
  BiChevronRight,
  BiZoomIn,
  BiZoomOut,
  BiRotateRight,
  BiExpand,
  BiDownload,
  BiShare,
  BiPlay,
  BiPause,
  BiVolumeFull,
  BiVolumeMute,
  BiFullscreen,
  BiExitFullscreen,
  BiFile,
  BiError,
} from "react-icons/bi";
import "./FullscreenViewer.scss";

export function FullscreenViewer({
  media,
  currentIndex,
  setCurrentIndex,
  onClose,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Добавляем состояние для отслеживания свайпов
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, time: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0, time: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeThreshold] = useState(50); // Минимальное расстояние для свайпа
  const [swipeTimeThreshold] = useState(500); // Максимальное время для свайпа (мс)

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [currentMedia, setCurrentMedia] = useState(
    Array.isArray(media) ? media[currentIndex] : media
  );
  const isMobileDevice = useCallback(() => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  }, []);
  const mobile = isMobileDevice();

  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [onClose]);

  useEffect(() => {
    if (Array.isArray(media)) {
      setCurrentMedia(media[currentIndex]);
    }
  }, [currentIndex, media]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case " ":
          if (currentMedia.type === "video") {
            toggleVideoPlay();
          }
          e.preventDefault();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentMedia]);

  useEffect(() => {
    // Сброс трансформаций при смене медиа
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const goToNext = (e) => {
    if (e) e.stopPropagation();
    if (Array.isArray(media) && media.length > 1) {
      const newIndex = (currentIndex + 1) % media.length;
      setCurrentIndex(newIndex);
      setCurrentMedia(media[newIndex]);
    }
  };

  const goToPrev = (e) => {
    if (e) e.stopPropagation();
    if (Array.isArray(media) && media.length > 1) {
      const newIndex = currentIndex === 0 ? media.length - 1 : currentIndex - 1;
      setCurrentIndex(newIndex);
      setCurrentMedia(media[newIndex]);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      });
      setIsSwiping(false);

      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        });
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];

      if (isDragging && zoom > 1) {
        e.preventDefault();
        setPosition({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        });
        return;
      }

      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        setIsSwiping(true);
      }
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);

    if (!isSwiping || !Array.isArray(media) || media.length <= 1 || zoom > 1) {
      setIsSwiping(false);
      return;
    }

    // Получаем последний касание из changedTouches
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    if (
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) > swipeThreshold &&
      deltaTime < swipeTimeThreshold
    ) {
      if (deltaX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }

    setIsSwiping(false);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentMedia.url;
    link.download = currentMedia.name || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleForward = () => {
    // Логика пересылки
    console.log("Forward media:", currentMedia);
  };

  const showControlsTemporary = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const renderFullscreenMedia = () => {
    const transform = `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`;

    switch (currentMedia.type) {
      case "photo":
        return (
          <>
            <img
              key={currentMedia.url}
              src={currentMedia.url}
              alt=""
              className="fullscreen-image"
              onError={(e) => {
                e.target.classList.add("is-none");
                e.target.parentNode
                  .querySelector(".fullscreen-error")
                  .classList.remove("is-none");
              }}
              style={{ transform }}
              onMouseDown={handleMouseDown}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              draggable={false}
            />
            <div className="fullscreen-error is-none">Ошибка загрузки</div>
          </>
        );
      case "video":
        return (
          <div>
            <video
              ref={videoRef}
              key={currentMedia.url}
              src={currentMedia.url}
              className="fullscreen-video"
              style={{ transform }}
              onError={(e) => {
                e.target.classList.add("is-none");
                e.target.parentNode
                  .querySelector(".fullscreen-error")
                  .classList.remove("is-none");
              }}
              onMouseDown={handleMouseDown}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              controls={showControls}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <div className="fullscreen-error is-none">Ошибка загрузки</div>
          </div>
        );
      case "audio":
        return (
          <>
            <div className="fullscreen-audio">
              <div className="audio-visualization">
                <span className="bg"></span>
                <BiVolumeFull size={80} />
              </div>
              <audio
                key={currentMedia.url}
                src={currentMedia.url}
                controls
                className="fullscreen-audio-player"
                onError={(e) => {
                  e.target.parentNode.classList.add("is-none");
                  e.target.parentNode.parentNode
                    .querySelector(".fullscreen-error")
                    .classList.remove("is-none");
                }}
              />
              <div className="fullscreen-audio-title">
                {currentMedia.name || "Audio"}
              </div>
            </div>
            <div className="fullscreen-error is-none">Ошибка загрузки</div>
          </>
        );
      case "file":
        return (
          <div className="fullscreen-file">
            <div className="file-visualization">
              <span className="bg"></span>
              <BiFile size={80} />
            </div>
            <div className="fullscreen-file-title">
              {currentMedia.name || "File"}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fullscreen-overlay enhanced"
      ref={containerRef}
      onMouseMove={showControlsTemporary}
      onTouchStart={showControlsTemporary}
    >
      {/* Верхняя панель управления */}
      <div className={`fullscreen-header ${showControls ? "visible" : ""}`}>
        <div className="header-left">
          <button className="control-btn" onClick={onClose}>
            <BiX />
          </button>
        </div>
        <div className="header-right">
          <button className="control-btn" onClick={handleDownload}>
            <BiDownload />
          </button>
          <button className="control-btn" onClick={handleForward}>
            <BiShare />
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="fullscreen-content">{renderFullscreenMedia()}</div>

      {/* Боковая панель с инструментами */}
      {(currentMedia.type === "photo" || currentMedia.type === "video") && (
        <div className={`fullscreen-tools ${showControls ? "visible" : ""}`}>
          <button className="tool-btn" onClick={handleZoomIn} title="Увеличить">
            <BiZoomIn />
          </button>
          <button
            className="tool-btn"
            onClick={handleZoomOut}
            title="Уменьшить"
          >
            <BiZoomOut />
          </button>
          <button className="tool-btn" onClick={handleRotate} title="Повернуть">
            <BiRotateRight />
          </button>
          <button
            className="tool-btn"
            onClick={resetTransform}
            title="Сбросить"
          >
            <BiExpand />
          </button>
        </div>
      )}

      {/* Навигация */}
      {Array.isArray(media) && media.length > 1 && (
        <>
          <button
            className="fullscreen-nav-button nav-button prev"
            onClick={(e) => {
              if (mobile) return;
              e.stopPropagation();
              goToPrev(e);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              goToPrev(e);
            }}
          >
            <BiChevronLeft />
          </button>
          <button
            className="fullscreen-nav-button nav-button next"
            onClick={(e) => {
              if (mobile) return;
              e.stopPropagation();
              goToNext(e);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              goToNext(e);
            }}
          >
            <BiChevronRight />
          </button>

          {/* Индикатор прогресса */}
          <div
            className={`fullscreen-progress ${showControls ? "visible" : ""}`}
          >
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((currentIndex + 1) / media.length) * 100}%`,
                }}
              />
            </div>
            <span className="progress-text">
              {currentIndex + 1} / {media.length}
            </span>
          </div>
        </>
      )}

      {/* Миниатюры внизу */}
      {Array.isArray(media) && media.length > 1 && (
        <div
          className={`fullscreen-thumbnails ${showControls ? "visible" : ""}`}
        >
          <div className="thumbnails-container">
            {media.map((item, index) => (
              <div onClick={() => setCurrentIndex(index)} key={index}>
                <div
                  key={index}
                  className={`thumbnail ${
                    index === currentIndex ? "active" : ""
                  }`}
                >
                  {item.type === "photo" && (
                    <>
                      <img
                        src={item.url}
                        onError={(e) => {
                          e.target.classList.add("is-none");
                          e.target.parentNode
                            .querySelector(".thumbnail-error")
                            .classList.remove("is-none");
                        }}
                        alt=""
                      />
                      <div className="thumbnail-error is-none">
                        <BiError />
                      </div>
                    </>
                  )}
                  {item.type === "video" && (
                    <>
                      <div>
                        <video
                          src={item.url}
                          key={item.url}
                          preload="metadata"
                          muted={true}
                          onError={(e) => {
                            e.target.parentNode.classList.add("is-none");
                            e.target.parentNode.parentNode
                              .querySelector(".thumbnail-error")
                              .classList.remove("is-none");
                          }}
                        />
                        <BiPlay className="thumbnail-play" />
                      </div>
                      <div className="thumbnail-error is-none">
                        <BiError />
                      </div>
                    </>
                  )}
                  {item.type === "audio" && (
                    <div className="thumbnail-audio">
                      <span className="bg"></span>
                      <BiVolumeFull />
                    </div>
                  )}
                  {item.type === "file" && (
                    <div className="thumbnail-audio">
                      <span className="bg"></span>
                      <BiFile />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
