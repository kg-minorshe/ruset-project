// hooks/useAttachmentManager.js
import { useState } from "react";

export const useAttachmentManager = () => {
  const [mediaAttachments, setMediaAttachments] = useState([]);
  const [typeFile, setTypeFile] = useState(false);

  const handleFilesSelected = (files) => {
    if (files.length > 0) {
      const processedFiles = files.map((file) => {
        const isVoiceMessage = file.name === "Голосовое сообщение";
        const id = file.id || Date.now() + Math.random();
        const name = isVoiceMessage ? `voice-message-${id}.ogg` : file.name;
        const url = isVoiceMessage ? URL.createObjectURL(file) : file.url;

        const baseItem = {
          id,
          name,
          size: file.size,
          type: isVoiceMessage ? "audio" : file.type,
          url,
          sendAsFile: file.sendAsFile || false,
        };

        if (isVoiceMessage) {
          baseItem.file = file;
        } else {
          baseItem.file = file.file || file;
        }

        return baseItem;
      });

      setMediaAttachments((prev) => [...prev, ...processedFiles]);
      setTypeFile(files.some((f) => f.sendAsFile));
    }
  };

  const removeAttachment = (id) => {
    setMediaAttachments((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      const removedItem = prev.find((item) => item.id === id);
      if (removedItem?.url) URL.revokeObjectURL(removedItem.url);
      return updated;
    });
  };

  const clearAllAttachments = (setNewMessage, fileInputRef) => {
    mediaAttachments.forEach((item) => {
      if (item.url && item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
      }
    });
    setMediaAttachments([]);
    setTypeFile(false);
    if (setNewMessage) setNewMessage("");
    if (fileInputRef?.current) fileInputRef.current.value = "";
  };

  return {
    mediaAttachments,
    setMediaAttachments,
    typeFile,
    setTypeFile,
    handleFilesSelected,
    removeAttachment,
    clearAllAttachments,
  };
};