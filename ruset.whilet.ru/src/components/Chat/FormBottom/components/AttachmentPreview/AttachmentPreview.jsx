// components/AttachmentPreview/AttachmentPreview.jsx
import {
  BiX,
  BiTrash,
  BiPlus,
  BiFile,
  BiHeadphone,
  BiPlay,
  BiCheck,
  BiError,
  BiUpload,
  BiSend,
} from "react-icons/bi";
import { useEffect, useMemo } from "react";
import { httpRSCap } from "@/utils/http";
const AttachmentPreview = ({
  attachments,
  typeFile,
  setTypeFile,
  onRemove,
  onClearAll,
  onAddFiles,
  inputRef,
  currentText,
  setCurrentText,
  isInputDisabled,
  onSend,
  uploadProgress,
  cancelAllUploads,
}) => {
  const first = attachments[0];
  const additional = attachments.slice(1);

  const progressMap = useMemo(() => {
    const map = new Map();
    uploadProgress.forEach((p) => map.set(p.id, p));
    return map;
  }, [uploadProgress]);

  const getProgress = (id) => progressMap.get(id) || null;

  const renderStatusOverlay = (media) => {
    const progress = getProgress(media.id);
    if (!progress) return null;

    const { status, progress: percent } = progress;

    if (status === "uploading") {
      return (
        <div className="upload-status uploading">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
        </div>
      );
    }

    if (status === "completed") {
      return (
        <div className="upload-status success">
          <BiCheck className="status-icon" />
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="upload-status error">
          <BiError className="status-icon" />
        </div>
      );
    }

    return null;
  };

  const handleCancelOrDelete = async () => {
    cancelAllUploads();

    const filesToDelete = uploadProgress
      .filter((p) => p.storage_name)
      .map((p) => ({
        url: p.url,
        storage_name: p.storage_name,
      }));

    onClearAll();

    // Удаляем файлы с сервера, если есть что удалять
    if (filesToDelete.length > 0) {
      try {
        const response = await httpRSCap(
          process.env.NEXT_PUBLIC_URL_API_MAIN + "/v2/ruset/chat/deleteFiles",
          {
            method: "POST",
            credentials: "include",
            headers: {
              Origin: "https://whilet.ru",
              Referer: "https://whilet.ru",
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ files: filesToDelete }),
          }
        );

        if (!response.ok) {
          console.error("Ошибка при удалении файлов с сервера");
        }
      } catch (err) {
        console.error("Ошибка при удалении файлов:", err);
      }
    }
  };

  return (
    <div className="mediaAttachments media-preview-box">
      <div
        className="media-preview-overlay"
        onClick={(e) => e.stopPropagation()}
      ></div>

      <div className="media-preview-container">
        {uploadProgress.length === 0 && (
          <button
            className="close-preview-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(first.id);
            }}
            aria-label="Удалить файл"
          >
            <BiX />
          </button>
        )}

        <div className="main-preview">
          {first.type === "photo" ? (
            <img src={first.url} alt="Main" />
          ) : first.type === "video" ? (
            <>
              <video src={first.url} className="preview-video" muted />
              <div className="preview-video-overlay">
                <BiPlay />
              </div>
            </>
          ) : (
            <div className="file-icon">
              {first.type === "audio" ? (
                <BiHeadphone size={40} />
              ) : (
                <BiFile size={40} />
              )}
            </div>
          )}
          {attachments.length > 1 && (
            <div className="attachment-count">+{attachments.length - 1}</div>
          )}
          {renderStatusOverlay(first)}
        </div>

        {additional.length > 0 && (
          <div className="additional-previews">
            {additional.map((media) => {
              const isUploading = uploadProgress.length !== 0;
              return (
                <div
                  className={`thumb ${isUploading ? "uploading" : ""}`}
                  key={media.id}
                  onClick={() => {
                    if (!isUploading) {
                      onRemove(media.id);
                    }
                  }}
                >
                  {media.type === "photo" && (
                    <img src={media.url} alt="thumb" />
                  )}
                  {media.type === "video" && <video src={media.url} muted />}
                  {["audio", "file"].includes(media.type) && (
                    <div className="file-icon">
                      {media.type === "audio" ? <BiHeadphone /> : <BiFile />}
                    </div>
                  )}
                  {!isUploading && (
                    <div className="remove-overlay">
                      <BiX />
                    </div>
                  )}
                  {renderStatusOverlay(media)}
                </div>
              );
            })}
          </div>
        )}

        {uploadProgress.length === 0 ? (
          <>
            <label className="setting">
              <input
                type="checkbox"
                checked={typeFile}
                onChange={(e) => setTypeFile(e.target.checked)}
              />{" "}
              Отправить как файлы
            </label>

            <div className="attachment-controls">
              <button className="control-btn clear-btn" onClick={onClearAll}>
                <BiTrash />
                <span>Очистить все</span>
              </button>
              <button className="control-btn add-btn" onClick={onAddFiles}>
                <BiPlus />
                <span>Добавить файлы</span>
              </button>
            </div>

            <div className="FormBottom">
              <textarea
                placeholder="Написать подпись…"
                ref={inputRef}
                value={currentText}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onChange={(e) => setCurrentText(e.target.value)}
                className="message-input"
                disabled={isInputDisabled}
              />
              <span
                className={`send-icon ${isInputDisabled ? "disabled" : ""}`}
                onClick={!isInputDisabled ? onSend : undefined}
              >
                <BiSend />
              </span>
            </div>
          </>
        ) : (
          <div className="attachment-controls">
            <button
              className="control-btn clear-btn"
              onClick={handleCancelOrDelete}
            >
              <BiTrash /> <span>Отменить загрузку</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentPreview;
