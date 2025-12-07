// FormBottom.jsx
import { useState, useRef, useEffect } from "react";
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
    if (!currentText.trim() && mediaAttachments.length === 0) return;

    if (!canSendMessages()) return;
    if (!canSendNow()) return;

    setNewMessage("");
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height =
          Math.min(inputRef.current.scrollHeight, 200) + "px";
      }
    }, 0);

    if (editingMessageId) {
      await editMessage({
        editingMessageId,
        currentText,
        setEditingMessageId,
        setEditText,
      });
    } else {
      await sendMessage({
        currentText,
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

  const { handleKeyDown, handleInput } = useInputHandler(
    isMobile,
    isInputDisabled,
    handleSendMessage
  );

  const handleEmojiSelect = (char, svg) => {
    const emoji = svg
      ? `<img src="${svg}" alt="emoji" class="message-emoji" />`
      : char;
    setCurrentText((prev) => prev + emoji);
  };

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
          onChange={(e) => setCurrentText(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
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
