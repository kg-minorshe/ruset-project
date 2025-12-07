import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import "./MessagesContainer.scss";
import MessagesList from "./MessagesList";
import EmptyState from "./EmptyState";

const MessagesContainer = memo(
  ({
    messages,
    setMessages,
    scrollPositionRef,
    setContextMenu,
    contextMenu,
    messagesContainerRef,
    editingMessageId,
    setEditingMessageId,
    selectedMessageRef,
    editText,
    setEditText,
    updateScrollInfo,
    selectedMessages,
    selectionMode,
    toggleMessageSelection,
    setSelectionMode,
    onScrollToMessage,
    hasDragMoved,
    enterSelectionMode,
    chatInfo,
    currentUser,
    canDeleteMessage,
    canEditMessage,
    toggleReaction,
    showReactionPicker,
    onReply,
    setFullscreenData,
    chatMessagesLoading,
    onLoadMore,
    hasMore,
    loadingOlder,
    setUserProfile,
    showLoadMoreButton,
    totalMessagesCount,
    loadedMessagesCount,
  }) => {
    const longPressTimeoutRef = useRef(null);
    const touchMoveRef = useRef(false);
    const messageEndRef = useRef(null);
    const touchStartTimeRef = useRef(null);
    const touchStartElementRef = useRef(null);

    const isMobileDevice = useCallback(() => {
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth <= 768
      );
    }, []);

    const handleReactionClick = useCallback(
      (messageId, emoji) => {
        toggleReaction(messageId, emoji);
      },
      [toggleReaction]
    );

    const handleShowReactionPicker = useCallback(
      (e, messageId) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        showReactionPicker(messageId, rect.left, rect.top - 60);
      },
      [showReactionPicker]
    );

    const handleContextMenu = useCallback(
      (e, messageId, messageElement) => {
        e.preventDefault();
        e.stopPropagation();

        if (selectionMode) return;

        const isMediaElement =
          e.target.closest(".photo-media") ||
          e.target.closest(".audio-player") ||
          e.target.closest(".video-wrapper") ||
          e.target.closest(".file-container") ||
          e.target.closest(".media-group-container");

        if (isMediaElement) return;

        if (selectedMessageRef.current) {
          selectedMessageRef.current.classList.remove("is-selected");
        }
        messageElement.classList.add("is-selected");
        selectedMessageRef.current = messageElement;

        const message = messages.find((msg) => msg.id === messageId);
        const mobile = isMobileDevice();

        setContextMenu({
          visible: true,
          messageId,
          isMobile: mobile,
          isMe: message.sender === "me",
          canEdit: canEditMessage(message),
          canDelete: canDeleteMessage(message),
          x:
            e.pageX + 245 >= messagesContainerRef.current.scrollWidth
              ? e.pageX - 245
              : e.pageX,
          y: e.pageY,
        });
      },
      [
        messages,
        selectionMode,
        selectedMessageRef,
        isMobileDevice,
        messagesContainerRef,
        setContextMenu,
        canEditMessage,
        canDeleteMessage,
      ]
    );

    const showMobileContextMenu = useCallback(
      (messageId, touch, messageElement) => {
        if (!messageElement) return;

        const message = messages.find((msg) => msg.id === messageId);
        if (!message) return;

        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        if (selectedMessageRef.current) {
          selectedMessageRef.current.classList.remove("is-selected");
        }
        messageElement.classList.add("is-selected");
        selectedMessageRef.current = messageElement;

        const containerRect =
          messagesContainerRef.current?.getBoundingClientRect();

        setContextMenu({
          visible: true,
          messageId,
          isMobile: true,
          isMe: message.sender === "me",
          canEdit: canEditMessage(message),
          canDelete: canDeleteMessage(message),
          x: touch.clientX,
          y: touch.clientY,
          containerRect,
          touchPoint: {
            pageX: touch.pageX,
            pageY: touch.pageY,
            clientX: touch.clientX,
            clientY: touch.clientY,
          },
        });
      },
      [
        messages,
        selectedMessageRef,
        messagesContainerRef,
        setContextMenu,
        canEditMessage,
        canDeleteMessage,
      ]
    );

    const isInteractiveElement = useCallback((element) => {
      return (
        element.closest(".reply_to") ||
        element.closest(".reaction-button") ||
        element.closest(".add-reaction-button") ||
        element.closest(".photo-media") ||
        element.closest(".audio-player") ||
        element.closest(".video-wrapper") ||
        element.closest(".file-container") ||
        element.closest(".media-group-container")
      );
    }, []);

    const handleTouchStart = useCallback(
      (e, messageId) => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }

        touchMoveRef.current = false;
        touchStartTimeRef.current = Date.now();
        touchStartElementRef.current = e.currentTarget;

        const touch = e.touches[0];
        const clickedElement = e.target;
        const isInteractive = isInteractiveElement(clickedElement);

        if (!isInteractive) {
          longPressTimeoutRef.current = setTimeout(() => {
            if (!touchMoveRef.current && touchStartElementRef.current) {
              const currentTouch = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                pageX: touch.pageX,
                pageY: touch.pageY,
              };
              showMobileContextMenu(
                messageId,
                currentTouch,
                touchStartElementRef.current
              );
            }
          }, 500);
        }
      },
      [isInteractiveElement, showMobileContextMenu]
    );

    const handleTouchMove = useCallback(() => {
      touchMoveRef.current = true;
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }, []);

    const handleTouchEnd = useCallback(
      (e, messageId) => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }

        const touchDuration = Date.now() - (touchStartTimeRef.current || 0);
        const wasQuickTap = touchDuration < 500 && !touchMoveRef.current;

        if (wasQuickTap && selectionMode && touchStartElementRef.current) {
          toggleMessageSelection(messageId);
        }

        touchStartElementRef.current = null;
      },
      [selectionMode, toggleMessageSelection]
    );

    const handleMessageClick = useCallback(
      (e, messageId) => {
        const messageElement = e.currentTarget;

        const isMobile = isMobileDevice();

        const forbidden = e.target.closest(
          ".audio-content, .file-content, .rs-video, .rs-photo"
        );
        if (forbidden) return;

        if (selectionMode) {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => {
            toggleMessageSelection(messageId);
          }, 0);
          return;
        }

        if (isMobile) {
          e.preventDefault();
          e.stopPropagation();
          handleContextMenu(e, messageId, messageElement);
          return;
        }
      },
      [isMobileDevice, selectionMode, toggleMessageSelection, handleContextMenu]
    );

    const handleMouseDown = useCallback(
      (e, messageId) => {
        if (!isMobileDevice()) {
          const selection = window.getSelection();
          if (selection.toString().length === 0 && !selectionMode) {
            e.preventDefault();
          }
        }
      },
      [isMobileDevice, selectionMode]
    );

    const handleScroll = useCallback(async () => {
      if (!messagesContainerRef.current) return;

      const prevTop = messagesContainerRef.current.scrollTop;
      scrollPositionRef.current.scrollTop = prevTop;

      if (prevTop <= 500 && !loadingOlder && typeof onLoadMore === "function") {
        await onLoadMore();
      }

      updateScrollInfo();
    }, [
      messagesContainerRef,
      scrollPositionRef,
      hasMore,
      loadingOlder,
      onLoadMore,
      updateScrollInfo,
    ]);

    useEffect(() => {
      return () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (
        messagesContainerRef.current &&
        messagesContainerRef.current.scrollHeight >
          scrollPositionRef.current.scrollHeight
      ) {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (messagesContainerRef.current) {
        const diff =
          messagesContainerRef.current.scrollHeight -
          scrollPositionRef.current.scrollHeight;
        messagesContainerRef.current.scrollTop =
          scrollPositionRef.current.scrollTop + diff;
      }

      if (messagesContainerRef.current) {
        scrollPositionRef.current = {
          scrollTop: messagesContainerRef.current.scrollTop,
          scrollHeight: messagesContainerRef.current.scrollHeight,
        };
      }
    }, [messages, messagesContainerRef, scrollPositionRef]);

    if (!messages) {
      return (
        <div className="MessagesContainer">
          <div className="is-no-info">
            <p>Загружаем чат...</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="MessagesContainer"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {loadingOlder && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Загрузка сообщений...</span>
          </div>
        )}

        {messages.length > 0 ? (
          <MessagesList
            messages={messages}
            chatInfo={chatInfo}
            currentUser={currentUser}
            selectedMessages={selectedMessages}
            selectionMode={selectionMode}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMessageClick={handleMessageClick}
            onMouseDown={handleMouseDown}
            onScrollToMessage={onScrollToMessage}
            onReactionClick={handleReactionClick}
            onShowReactionPicker={handleShowReactionPicker}
            setFullscreenData={setFullscreenData}
            setUserProfile={setUserProfile}
          />
        ) : (
          <EmptyState
            chatMessagesLoading={chatMessagesLoading}
            currentUser={currentUser}
          />
        )}
        <div ref={messageEndRef}></div>
      </div>
    );
  }
);

MessagesContainer.displayName = "MessagesContainer";

export { MessagesContainer };
