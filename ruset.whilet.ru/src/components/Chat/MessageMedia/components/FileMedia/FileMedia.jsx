import React, { useState } from "react";
import {
  BiDownload,
  BiFile,
  BiSpreadsheet,
  BiArchive,
  BiImage,
  BiMoviePlay,
  BiMusic,
  BiFileBlank,
} from "react-icons/bi";
import { formatFileSize } from "@/utils/formatting";

export function FileMedia({ media, isMe }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const getFileIconComponent = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <BiFile size={32} />;
      case "doc":
      case "docx":
        return <BiFile size={32} />;
      case "xls":
      case "xlsx":
        return <BiSpreadsheet size={32} />;
      case "ppt":
      case "pptx":
        return <BiMoviePlay size={32} />;
      case "zip":
      case "rar":
      case "7z":
        return <BiArchive size={32} />;
      case "txt":
        return <BiFileBlank size={32} />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <BiImage size={32} />;
      case "mp4":
      case "avi":
      case "mov":
        return <BiMoviePlay size={32} />;
      case "mp3":
      case "wav":
        return <BiMusic size={32} />;
      default:
        return <BiFile size={32} />;
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
    <div className="rs-file">
      <div className="file-content">
        <div className="file-icon">
          {getFileIconComponent(media.name)}
          <div className="bg"></div>
        </div>
        <div className="file-info">
          <div className="file-name">{media.name}</div>
          <div className="file-details">
            <span className="file-size">{formatFileSize(media.size || 0)}</span>
            <span className="file-ext">
              {media.name.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          className={`file-download-btn ${isDownloading ? "downloading" : ""}`}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <div className="download-spinner" />
          ) : (
            <BiDownload size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
