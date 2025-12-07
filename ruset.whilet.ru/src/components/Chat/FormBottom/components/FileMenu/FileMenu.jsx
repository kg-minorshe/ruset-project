// src/components/Chat/FormBottom/components/FileMenu/FileMenu.jsx
import { useState, useRef, useEffect } from "react";
import {
  BiPaperclip,
  BiX,
  BiImage,
  BiVideo,
  BiMusic,
  BiFile,
  BiMicrophone,
  BiCamera,
  BiFolder,
} from "react-icons/bi";
import { Camera, CameraPermissionStatus } from "@capacitor/camera";
import "./FileMenu.scss";
import { walert } from "@/utils/miniModal";

const FILE_TYPES = [
  {
    id: "photo",
    name: "Фото",
    icon: <BiImage />,
    accept: "image/*",
    color: "#4CAF50",
  },
  {
    id: "video",
    name: "Видео",
    icon: <BiVideo />,
    accept: "video/*",
    color: "#2196F3",
  },
  {
    id: "audio",
    name: "Аудио",
    icon: <BiMusic />,
    accept: "audio/*",
    color: "#FF9800",
  },
  {
    id: "document",
    name: "Документ",
    icon: <BiFile />,
    accept: ".pdf,.doc,.docx,.txt,.rtf,.odt",
    color: "#9C27B0",
  },
  {
    id: "archive",
    name: "Архив",
    icon: <BiFolder />,
    accept: ".zip,.rar,.7z,.tar,.gz",
    color: "#795548",
  },
  {
    id: "all",
    name: "Файл",
    icon: <BiPaperclip />,
    accept: "*/*",
    color: "#607D8B",
  },
];

const FileMenu = ({
  isOpen,
  onClose,
  onFilesSelected,
  onCameraClick,
  onVoiceClick,
  disabled = false,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const menuRef = useRef(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // --- Запрос разрешения на камеру ---
  const requestCameraPermission = async () => {
    try {
      const status = await Camera.checkPermissions();
      if (status.camera !== "granted") {
        const result = await Camera.requestPermissions({
          permissions: ["camera"],
        });
        if (result.camera !== "granted") {
          walert(403, "Доступ к камере запрещён");
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Ошибка доступа к камере:", err);
      walert(403, "Не удалось запросить доступ к камере", err);
      return false;
    }
  };

  // --- Запрос разрешения на микрофон (через Web API) ---
  const requestMicrophonePermission = async () => {
    try {
      // Проверяем состояние разрешения (работает в Chrome/Edge)
      const permissionName = "microphone";

      // Используем type assertion, так как TypeScript не знает о 'microphone'
      const result = await navigator.permissions.query({
        name: permissionName,
      });

      if (result.state === "granted") {
        return true;
      }

      // Если нет — пытаемся запросить, включив микрофон
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Сразу останавливаем
      return true;
    } catch (err) {
      console.error("Ошибка доступа к микрофону:", err);
      walert("Не удалось получить доступ к микрофону", err);
      return false;
    }
  };

  // --- Обработка клика по типу файла ---
  const handleFileTypeClick = async (fileType) => {
    if (disabled) return;

    if (fileType.id === "camera") {
      const hasPermission = await requestCameraPermission();
      if (hasPermission) {
        onCameraClick?.();
        onClose();
      }
      return;
    }

    if (fileType.id === "voice") {
      const hasPermission = await requestMicrophonePermission();
      if (hasPermission) {
        onVoiceClick?.();
        onClose();
      }
      return;
    }

    // Для обычных файлов — просто открываем input
    const input = fileInputRefs.current[fileType.id];
    if (input) {
      input.click();
    }
  };

  const handleFileChange = async (event, fileType) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    const processedFiles = await processFilesForPreview(files, fileType);
    if (processedFiles.length === 0) return;
    onFilesSelected(processedFiles);
    onClose();
    event.target.value = "";
  };

  const processFilesForPreview = async (files, fileType) => {
    const processed = [];
    for (const file of files) {
      const processedFile = {
        id: Date.now() + Math.random(),
        file: file,
        name: file.name,
        size: file.size,
        type: getFileType(file),
        originalType: fileType.id,
        url: null,
      };
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        processedFile.url = URL.createObjectURL(file);
      }
      processed.push(processedFile);
    }
    return processed;
  };

  const getFileType = (file) => {
    if (file.type.startsWith("image/")) return "photo";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  };

  if (!isOpen) return null;

  return (
    <div className="file-menu-overlay">
      <div className="file-menu" ref={menuRef}>
        <div className="file-menu-header">
          <h3>Прикрепить файл</h3>
          <button className="file-menu-close" onClick={onClose}>
            <BiX />
          </button>
        </div>
        <div className="file-menu-grid">
          {FILE_TYPES.map((fileType) => (
            <button
              key={fileType.id}
              className={`file-type-button ${disabled ? "disabled" : ""}`}
              onClick={() => handleFileTypeClick(fileType)}
              disabled={disabled}
              style={{ "--color": fileType.color }}
            >
              <div className="file-type-icon">{fileType.icon}</div>
              <span className="file-type-name">{fileType.name}</span>
            </button>
          ))}
          <button
            className={`file-type-button ${disabled ? "disabled" : ""}`}
            onClick={() => handleFileTypeClick({ id: "camera" })}
            disabled={disabled}
            style={{ "--color": "#E91E63" }}
          >
            <div className="file-type-icon">
              <BiCamera />
            </div>
            <span className="file-type-name">Камера</span>
          </button>
          <button
            className={`file-type-button ${disabled ? "disabled" : ""}`}
            onClick={() => handleFileTypeClick({ id: "voice" })}
            disabled={disabled}
            style={{ "--color": "#FF5722" }}
          >
            <div className="file-type-icon">
              <BiMicrophone />
            </div>
            <span className="file-type-name">Голос</span>
          </button>
        </div>

        {/* Скрытые input'ы для выбора файлов */}
        {FILE_TYPES.map((fileType) => (
          <input
            key={fileType.id}
            ref={(el) => (fileInputRefs.current[fileType.id] = el)}
            type="file"
            accept={fileType.accept}
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e, fileType)}
          />
        ))}
      </div>
    </div>
  );
};

export default FileMenu;
