import { useState, useRef, useEffect } from "react";
import {
  BiCamera,
  BiX,
  BiCircle,
  BiSquareRounded,
  BiRefresh,
  BiCheck,
} from "react-icons/bi";
import "./CameraCapture.scss";

const CameraCapture = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [mediaType, setMediaType] = useState("photo"); // 'photo' or 'video'
  const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Определяем поддерживаемый MIME-тип
  const getSupportedMimeType = () => {
    const options = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (let mimeType of options) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return "video/webm";
  };

  // Запуск камеры
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        setError(null);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints = {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: mediaType === "video",
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Не удалось получить доступ к камере. Проверьте разрешения.");
      }
    };

    startCamera();

    return () => {
      cleanup();
    };
  }, [isOpen, facingMode, mediaType]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (capturedMedia?.url) {
      URL.revokeObjectURL(capturedMedia.url);
    }
  };

  const handleClose = () => {
    cleanup();
    setStream(null);
    setCapturedMedia(null);
    setIsRecording(false);
    setRecordingTime(0);
    setError(null);
    onClose();
  };

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Размеры canvas = размеру видео
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Рисуем кадр (без зеркала — сохраняем как видит камера)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Конвертируем в JPEG
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          const url = URL.createObjectURL(blob);
          setCapturedMedia({
            type: "photo",
            file,
            url,
          });
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleStartVideoRecording = () => {
    if (!stream) return;

    try {
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
          setError("Видео не было записано — пустые данные.");
          return;
        }

        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        if (blob.size === 0) {
          setError("Записанное видео пустое.");
          return;
        }

        const file = new File([blob], `video_${Date.now()}.webm`, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        setCapturedMedia({
          type: "video",
          file,
          url,
        });
      };

      recorder.start(100); // Сбор данных каждые 100мс
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      setError(`Ошибка записи: ${err.message}`);
    }
  };

  const handleStopVideoRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleCapture = () => {
    if (mediaType === "photo") {
      handleTakePhoto();
    } else {
      if (isRecording) {
        handleStopVideoRecording();
      } else {
        handleStartVideoRecording();
      }
    }
  };

  const handleSwitchCamera = async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    // Перезапустим камеру с новым facingMode
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleConfirm = () => {
    if (capturedMedia) {
      onCapture([
        {
          id: Date.now(),
          file: capturedMedia.file,
          name: capturedMedia.file.name,
          size: capturedMedia.file.size,
          type: capturedMedia.type,
          url: capturedMedia.url,
        },
      ]);
      handleClose();
    }
  };

  const handleRetake = () => {
    if (capturedMedia?.url) {
      URL.revokeObjectURL(capturedMedia.url);
    }
    setCapturedMedia(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="camera-capture-overlay">
      <div className="camera-capture-container">
        <div className="camera-header">
          <button className="camera-btn close-btn" onClick={handleClose}>
            <BiX />
          </button>

          <div className="camera-mode-switcher">
            <button
              className={`mode-btn ${mediaType === "photo" ? "active" : ""}`}
              onClick={() => !isRecording && setMediaType("photo")}
              disabled={isRecording}
            >
              Фото
            </button>
            <button
              className={`mode-btn ${mediaType === "video" ? "active" : ""}`}
              onClick={() => !isRecording && setMediaType("video")}
              disabled={isRecording}
            >
              Видео
            </button>
          </div>

          <button
            className="camera-btn switch-btn"
            onClick={handleSwitchCamera}
            disabled={isRecording}
          >
            <BiRefresh />
          </button>
        </div>

        <div className="camera-content">
          {error ? (
            <div className="camera-error">
              <BiCamera size={48} />
              <p>{error}</p>
              <button onClick={handleClose}>Закрыть</button>
            </div>
          ) : capturedMedia ? (
            <div className="captured-preview">
              {capturedMedia.type === "photo" ? (
                <img src={capturedMedia.url} alt="Снятое фото" />
              ) : (
                <video src={capturedMedia.url} controls />
              )}
            </div>
          ) : (
            <div className="camera-view">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={facingMode === "user" ? "video-mirrored" : ""}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {isRecording && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="camera-controls">
          {capturedMedia ? (
            <>
              <button className="control-btn retake-btn" onClick={handleRetake}>
                Переснять
              </button>
              <button
                className="control-btn confirm-btn"
                onClick={handleConfirm}
              >
                <BiCheck />
                Использовать
              </button>
            </>
          ) : (
            <div className="capture-controls">
              <button
                className={`capture-btn ${
                  mediaType === "video" ? "video-mode" : ""
                } ${isRecording ? "recording" : ""}`}
                onClick={handleCapture}
                disabled={!stream}
              >
                {mediaType === "photo" ? (
                  <BiCircle />
                ) : isRecording ? (
                  <BiSquareRounded />
                ) : (
                  <BiCircle />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
