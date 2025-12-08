// FormBottom.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./FormBottom.scss";
import MessageInput from "./components/MessageInput/MessageInput";
import AttachmentPreview from "./components/AttachmentPreview/AttachmentPreview";
import VoiceRecorder from "./components/VoiceRecorder/VoiceRecorder";
import EmojiButton from "./components/EmojiButton/EmojiButton";
import FileMenu from "./components/FileMenu/FileMenu";
import CameraCapture from "./components/FileMenu/CameraCapture";
import { EmojiPicker } from "./components/EmojiPicker/EmojiPicker";
import { SlowModeIndicator } from "./components/SlowModeIndicator/SlowModeIndicator";

import { useSlowMode } from "./hooks/useSlowMode";
import { useAttachmentManager } from "./hooks/useAttachmentManager";
import { useInputHandler } from "./hooks/useInputHandler";
import { useMessageSender } from "./hooks/useMessageSender";
import useMediaRecorder from "./hooks/useMediaRecorder";
import { useFileUpload } from "./hooks/useFileUpload";
import {
  getEmojiImageUrl,
  hasMessageContent,
  sanitizeMessageHtml,
} from "@/utils/emoji";
import {
  placeCaretAtEnd,
  restoreSelection,
  saveSelection,
} from "@/utils/contentEditableSelection";

import { BiSend, BiPaperclip } from "react-icons/bi";

export const FormBottom = ({
  setMessages,
  messages,
  replyingTo,
  setReplyingTo,
  editingMessageId,
  setEditingMessageId,
  editText,
  setEditText,
  chatInfo,
  currentUser,
  chatData,
  onMessageSent,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 700 : false
  );

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectionRef = useRef(null);

  const { canSendMessages, canSendNow, getSlowModeTimeLeft } = useSlowMode(
    chatInfo,
    currentUser
  );
  const {
    isUploading,
    uploadProgress,
    uploadFiles: uploadFilesToServer,
    cancelAllUploads,
    clearUploadProgress,
  } = useFileUpload();
  const {
    mediaAttachments,
    setMediaAttachments,
    typeFile,
    setTypeFile,
    handleFilesSelected,
    removeAttachment,
    clearAllAttachments,
  } = useAttachmentManager();

  const { sendMessage, editMessage } = useMessageSender({
    messages,
    setMessages,
    chatData,
    chatInfo,
    currentUser,
    onMessageSent,
    uploadFiles: uploadFilesToServer,
  });

  const {
    isRecording,
    recordingTime,
    formatTime,
    startRecording: startRecordingHook,
    stopRecording: stopRecordingHook,
  } = useMediaRecorder({
    onAudioReady: (file) => {
      const voiceFile = new File([file], "Голосовое сообщение", {
        type: "audio/webm",
      });
      handleFilesSelected([Object.assign(voiceFile, { isVoiceNote: true })]);
    },
  });

  const currentText = editingMessageId ? editText || "" : newMessage;
  const setCurrentText = editingMessageId ? setEditText : setNewMessage;

  const isInputDisabled =
    !canSendMessages() ||
    (getSlowModeTimeLeft() > 0 &&
      !["owner", "admin", "moderator"].includes(currentUser?.role));

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => setIsMobile(window.innerWidth < 700);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    const safeText = sanitizeMessageHtml(currentText);

    if (!hasMessageContent(safeText) && mediaAttachments.length === 0) return;

    if (!canSendMessages()) return;
    if (!canSendNow()) return;

    setNewMessage("");
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.innerHTML = "";
        inputRef.current.style.height = "auto";
        inputRef.current.style.height =
          Math.min(inputRef.current.scrollHeight, 200) + "px";
      }
    }, 0);

    if (editingMessageId) {
      await editMessage({
        editingMessageId,
        currentText: safeText,
        setEditingMessageId,
        setEditText,
      });
    } else {
      await sendMessage({
        currentText: safeText,
        mediaAttachments,
        setMediaAttachments,
        replyingTo,
        setReplyingTo,
        inputRef,
        fileInputRef,
        setNewMessage,
        typeFile,
      });
    }
    clearUploadProgress();
  };

  const { handleKeyDown, resizeInput } = useInputHandler(
    isMobile,
    isInputDisabled,
    handleSendMessage
  );
  const handleInputChange = (e) => {
    const cleanHtml = sanitizeMessageHtml(e.currentTarget.innerHTML);
    setCurrentText(cleanHtml);
    resizeInput(e.currentTarget);
    selectionRef.current = saveSelection(inputRef.current);
  };

  const captureSelection = () => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    selectionRef.current = saveSelection(inputEl);
  };

  useEffect(() => {
    const handleSelectionChange = () => captureSelection();
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  useLayoutEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    if (!selectionRef.current) return;

    const restored = restoreSelection(inputEl, selectionRef.current);
    if (!restored) {
      const fallback = placeCaretAtEnd(inputEl);
      selectionRef.current = saveSelection(inputEl);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(fallback);
      }
    }
  }, [currentText]);

  const getWorkingRange = () => {
    const inputEl = inputRef.current;
    if (!inputEl) return null;

    const restored = restoreSelection(inputEl, selectionRef.current);
    if (restored) return restored;

    const selectionRange = document.createRange();
    selectionRange.selectNodeContents(inputEl);
    selectionRange.collapse(false);
    return selectionRange;
  };

  const insertHtmlAtCursor = (html) => {
    const inputEl = inputRef.current;
    const safeHtml = sanitizeMessageHtml(html);

    if (!inputEl) {
      setCurrentText((prev) => sanitizeMessageHtml((prev || "") + safeHtml));
      return;
    }

    inputEl.focus();
    let range = getWorkingRange();
    if (!range) return;

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    range.deleteContents();
    const fragment = range.createContextualFragment(safeHtml);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
    }

    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const snapshot = saveSelection(inputEl);
    const cleanHtml = sanitizeMessageHtml(inputEl.innerHTML);
    if (cleanHtml !== inputEl.innerHTML) {
      inputEl.innerHTML = cleanHtml;
      restoreSelection(inputEl, snapshot) || placeCaretAtEnd(inputEl);
    }

    selectionRef.current = saveSelection(inputEl);
    setCurrentText(cleanHtml);
    resizeInput(inputEl);
  };

  const handleEmojiSelect = (char, svg) => {
    const imageUrl = svg || getEmojiImageUrl(char);
    const emoji = imageUrl
      ? `<img src="${imageUrl}" alt="${char}" class="message-emoji" draggable="false" />`
      : char;
    insertHtmlAtCursor(emoji);
  };

  useEffect(() => {
    if (inputRef.current) {
      resizeInput(inputRef.current);
    }
  }, [currentText, resizeInput]);

  const getPlaceholderText = () => {
    if (editingMessageId) return "Редактирование сообщения...";
    if (!canSendMessages()) {
      if (chatInfo?.type === "channel")
        return "Только администраторы могут отправлять сообщения";
      return "У вас нет прав для отправки сообщений";
    }
    const timeLeft = getSlowModeTimeLeft();
    if (timeLeft > 0) return `Подождите ${Math.ceil(timeLeft)} сек...`;
    return "Напишите сообщение...";
  };

  return (
    <>
      {mediaAttachments.length > 0 && (
        <AttachmentPreview
          attachments={mediaAttachments}
          typeFile={typeFile}
          setTypeFile={setTypeFile}
          onRemove={removeAttachment}
          onClearAll={() => clearAllAttachments(setNewMessage, fileInputRef)}
          onAddFiles={() => setShowFileMenu(true)}
          inputRef={inputRef}
          currentText={currentText}
          setCurrentText={setCurrentText}
          isInputDisabled={isInputDisabled}
          onSend={handleSendMessage}
          uploadProgress={uploadProgress}
          cancelAllUploads={cancelAllUploads}
        />
      )}

      <FileMenu
        isOpen={showFileMenu}
        onClose={() => setShowFileMenu(false)}
        onFilesSelected={handleFilesSelected}
        onCameraClick={() => {
          setShowCamera(true);
          setShowFileMenu(false);
        }}
        onVoiceClick={() => {
          startRecordingHook();
          setShowFileMenu(false);
        }}
        disabled={isInputDisabled}
      />

      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(capturedFiles) => {
          handleFilesSelected(capturedFiles);
          setShowCamera(false);
        }}
      />

      <div className="FormBottom">
        <span
          className={`attachment-icon ${
            isInputDisabled || isRecording ? "disabled" : ""
          }`}
          onClick={
            isInputDisabled || isRecording
              ? undefined
              : () => setShowFileMenu(true)
          }
          aria-label="Прикрепить файл"
        >
          <BiPaperclip />
        </span>
        <MessageInput
          ref={inputRef}
          value={currentText}
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          onKeyUp={captureSelection}
          onMouseUp={captureSelection}
          onFocus={captureSelection}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const files = [];
            for (let i = 0; i < items.length; i++) {
              if (items[i].kind === "file") {
                const file = items[i].getAsFile();
                if (file) files.push(file);
              }
            }
            if (files.length > 0) {
              e.preventDefault();
              handleFilesSelected(files);
            }
          }}
          placeholder={!isRecording ? getPlaceholderText() : ""}
          disabled={isInputDisabled || isRecording}
        />
        {!isRecording && (
          <EmojiButton
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isInputDisabled}
          />
        )}
        {showEmojiPicker && (
          <div className="emoji-picker-wrapper">
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
        {!currentText.trim() && (
          <VoiceRecorder
            isRecording={isRecording}
            recordingTime={recordingTime}
            formatTime={formatTime}
            onStart={startRecordingHook}
            onStop={stopRecordingHook}
            isDisabled={isInputDisabled}
          />
        )}
        {currentText.trim() && (
          <span
            className={`send-icon ${isInputDisabled ? "disabled" : ""}`}
            onClick={() => !isInputDisabled && handleSendMessage()}
            aria-label="Отправить"
          >
            <BiSend />
          </span>
        )}
        <SlowModeIndicator
          chatInfo={chatInfo}
          getSlowModeTimeLeft={getSlowModeTimeLeft}
        />
      </div>
    </>
  );
};
