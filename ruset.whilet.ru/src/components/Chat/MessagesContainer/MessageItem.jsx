import React, { memo, useCallback, useEffect, useRef } from "react";
import {
  BiPin,
  BiCheck,
  BiCheckDouble,
  BiReply,
  BiTimeFive,
  BiX,
} from "react-icons/bi";
import { BsEye } from "react-icons/bs";
import { MessageMedia } from "@/components/Chat/MessageMedia/MessageMedia";

const MessageItem = memo(
  ({
    message,
    chatInfo,
    currentUser,
    selectedMessages,
    selectionMode,
    messages,
    onContextMenu,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onMessageClick,
    onMouseDown,
    onScrollToMessage,
    onReactionClick,
    onShowReactionPicker,
    setFullscreenData,
    setUserProfile,
  }) => {
    const touchStartTimeRef = useRef(null);

    const getTextReplyTo = useCallback(
      (ms) => {
        const msg = messages.find((e) => e.id === ms.reply_to);
        return msg?.text?.trim() || "(сообщение не найдено)";
      },
      [messages]
    );

    const getUserInfo = useCallback(
      (userId) => {
        if (!chatInfo) return null;

        if (currentUser?.id === userId) {
          return {
            id: currentUser.id,
            username: currentUser.username || "Вы",
            avatar: currentUser.avatar || null,
            role: "you",
            login: currentUser.login || null,
          };
        }

        const participant =
          chatInfo?.participants &&
          chatInfo?.participants.find(
            (p) => p.id === userId || p.user_id === userId
          );

        if (participant) {
          return {
            id: participant.id,
            username:
              participant.username || participant.login || "Пользователь",
            avatar: participant.avatar || null,
            role: participant.role || null,
            login: participant.login || null,
          };
        }

        if (chatInfo?.user_id === userId) {
          return {
            id: chatInfo?.user_id,
            username: chatInfo?.username || "Пользователь",
            avatar: chatInfo?.avatar || null,
            role: "owner",
            login: chatInfo?.login || null,
          };
        }

        return {
          id: userId,
          username: "Неизвестно",
          avatar: null,
          role: null,
          login: null,
        };
      },
      [chatInfo, currentUser]
    );
    const getUsernameById = useCallback(
      (ms) => {
        const msg = messages.find((e) => e.id === ms.reply_to);
        if (!msg) return "Неизвестно";

        if (currentUser.id === msg.user_id) {
          return "Вы";
        }

        const participant = chatInfo?.participants.find(
          (p) => p.id === msg.user_id
        );
        return participant?.username || "Пользователь";
      },
      [messages, chatInfo?.participants, currentUser.id]
    );

    const getRoleBadge = useCallback((role, chatType) => {
      if (chatType === "private") return null;

      switch (role) {
        case "owner":
          return <span className="role-badge owner">Владелец</span>;
        case "admin":
          return <span className="role-badge admin">Админ</span>;
        default:
          return null;
      }
    }, []);

    const formatTime = useCallback((timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }, []);

    const formatViews = useCallback((views) => {
      if (views < 1000) return views;
      if (views < 1000000) return `${(views / 1000).toFixed(1)}K`;
      return `${(views / 1000000).toFixed(1)}M`;
    }, []);

    const renderReactions = useCallback(() => {
      const reactions = message.reactions || {};
      const reactionEntries = Object.entries(reactions).filter(
        ([emoji, data]) => data.count > 0
      );

      if (reactionEntries.length === 0) return null;

      return (
        <div className="message-reactions">
          {reactionEntries.map(([emoji, data]) => (
            <button
              key={emoji}
              className={`reaction-button ${
                data.hasReacted ? "has-reacted" : ""
              }`}
              onClick={() => onReactionClick(message.id, emoji)}
              title={`${data.count} ${
                data.count === 1 ? "реакция" : "реакций"
              }`}
            >
              <span className="reaction-emoji">{emoji}</span>
              <span className="reaction-count">{data.count}</span>
            </button>
          ))}
          <button
            className="add-reaction-button"
            onClick={(e) => onShowReactionPicker(e, message.id)}
            title="Добавить реакцию"
          >
            +
          </button>
        </div>
      );
    }, [message.reactions, message.id, onReactionClick, onShowReactionPicker]);

    const renderMediaContent = useCallback(() => {
      if (!message.media) return null;

      return (
        <MessageMedia
          media={message.media}
          isMe={message.sender === "me"}
          setFullscreenData={setFullscreenData}
        />
      );
    }, [message.media, message.sender, setFullscreenData]);

    const handleContextMenu = useCallback(
      (e) => {
        onContextMenu(e, message.id, e.currentTarget);
      },
      [onContextMenu, message.id]
    );

    const handleTouchStart = useCallback(
      (e) => {
        onTouchStart(e, message.id);
      },
      [onTouchStart, message.id]
    );

    const handleMessageClick = useCallback(
      (e) => {
        onMessageClick(e, message.id);
      },
      [onMessageClick, message.id]
    );

    const handleMouseDown = useCallback(
      (e) => {
        onMouseDown(e, message.id);
      },
      [onMouseDown, message.id]
    );

    const handleReplyClick = useCallback(() => {
      onScrollToMessage(message.reply_to);
    }, [onScrollToMessage, message.reply_to]);

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return bytes + " B";
      else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
      else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
      else return (bytes / 1073741824).toFixed(1) + " GB";
    };

    const renderUploadProgress = (message) => {
      if (!message.isUploading || !message.uploadProgress) return null;

      const totalFiles = message.uploadProgress.length;
      const completedFiles = message.uploadProgress.filter(
        (p) => p.status === "completed"
      ).length;
      const currentUploading = message.uploadProgress.find(
        (p) => p.status === "uploading"
      );

      return (
        <div className="message-upload-progress">
          <div className="upload-progress-header">
            <span className="upload-status-text">
              {completedFiles === totalFiles
                ? "Загрузка завершена"
                : "Загрузка файлов..."}
            </span>
            <span className="upload-files-count">
              {completedFiles}/{totalFiles}
            </span>
          </div>

          {currentUploading && (
            <div className="current-upload-info">
              <div className="current-file-name">
                {currentUploading.name.length > 30
                  ? currentUploading.name.substring(0, 30) + "..."
                  : currentUploading.name}
              </div>
              <div className="current-file-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${currentUploading.progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {currentUploading.progress}% •{" "}
                  {formatFileSize(currentUploading.loaded)} /{" "}
                  {formatFileSize(currentUploading.size)}
                </span>
              </div>
            </div>
          )}

          {totalFiles > 1 && (
            <div className="total-progress">
              <div className="total-progress-bar">
                <div
                  className="total-progress-fill"
                  style={{ width: `${(completedFiles / totalFiles) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      );
    };

    const renderSendingStatus = (message) => {
      if (message.sendingStatus === "uploading") {
        return (
          <span className="message-status uploading" title="Загрузка файлов...">
            <BiTimeFive />
          </span>
        );
      }

      if (
        message.sendingStatus === "sending" ||
        message.sendingStatus === "loading"
      ) {
        return (
          <span className="message-status sending" title="Отправка...">
            <BiTimeFive />
          </span>
        );
      }

      if (message.sendingStatus === "failed") {
        return (
          <span className="message-status failed" title="Не удалось отправить">
            <BiX />
          </span>
        );
      }
      if (chatInfo?.type === "channel") return null;
      if (message.is_read) {
        return (
          <span className="message-status read" title="Прочитано">
            <BiCheckDouble />
          </span>
        );
      }

      if (message.sender !== "me") return null;
      return (
        <span className="message-status sent" title="Отправлено">
          <BiCheck />
        </span>
      );
    };

    return (
      <div
        key={message.id}
        data-message-id={message.id}
        id={`message-${message.id}`}
        className={`messageWrapper ${
          message.sender === "me" && chatInfo?.type !== "channel"
            ? "is-me"
            : "is-user"
        } ${
          selectedMessages && selectedMessages.includes(message.id)
            ? "is-selected"
            : ""
        } ${message.is_pinned ? "is-pinned" : ""} ${
          chatInfo?.type === "group" ? "is-group" : ""
        } ${chatInfo?.type === "channel" ? "is-channel" : ""} `}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onClick={handleMessageClick}
        onMouseDown={handleMouseDown}
      >
        <div className="boxMessage">
          {chatInfo?.type === "group" && message.sender !== "me" && (
            <div className="message-avatar">
              <img
                src={
                  getUserInfo(message.user_id).avatar ||
                  "/assets/images/6319443853.jpg"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setUserProfile(getUserInfo(message.user_id));
                }}
                onError={(e) => {
                  e.target.style.opacity = "0";
                }}
              />
            </div>
          )}

          <div className="message">
            {(chatInfo?.type === "group" || chatInfo?.type === "channel") && (
              <div className="message-header">
                <span className="username">
                  {chatInfo?.type === "channel"
                    ? chatInfo?.name
                    : message.sender !== "me"
                    ? getUserInfo(message.user_id).username
                    : null}
                </span>
                {getRoleBadge(message.role, chatInfo?.type)}
              </div>
            )}

            {message.reply_to && (
              <div className="reply_to" onClick={handleReplyClick}>
                <div className="reply-author">
                  <b>{getUsernameById(message)}</b>
                </div>
                <div className="reply-text">
                  {(() => {
                    const text = getTextReplyTo(message);
                    return text.length > 70 ? `${text.slice(0, 70)}...` : text;
                  })()}
                </div>
              </div>
            )}
            <div className="columnContent">
              {renderMediaContent()}
              {message.text && <div className="text">{message.text}</div>}
            </div>

            {renderUploadProgress(message)}
            {renderReactions()}

            <div className="footer">
              {message.is_edited ? (
                <span className="edited-indicator">
                  <i>(изм.)</i>
                </span>
              ) : null}
              {chatInfo?.type === "channel" && message.views !== undefined ? (
                <span className="views">
                  <BsEye /> {formatViews(message.views)}
                </span>
              ) : null}
              {message.is_pinned ? (
                <span>
                  <BiPin />
                </span>
              ) : null}
              <span>
                {message.is_edited
                  ? formatTime(message.updated_at)
                  : formatTime(message.created_at)}
              </span>
              {renderSendingStatus(message)}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MessageItem.displayName = "MessageItem";

export default MessageItem;
