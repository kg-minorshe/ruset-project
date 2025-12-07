import React, { memo, useCallback } from "react";
import MessageItem from "./MessageItem";

const MessagesList = memo(
  ({
    messages,
    chatInfo,
    currentUser,
    selectedMessages,
    selectionMode,
    onContextMenu,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMessageClick,
    onMouseDown,
    onScrollToMessage,
    onReactionClick,
    onShowReactionPicker,
    setFullscreenData,
    setUserProfile,
  }) => {
    const handleTouchEnd = useCallback(
      (e, messageId) => {
        onTouchEnd(e, messageId);
      },
      [onTouchEnd]
    );

    const handleTouchCancel = useCallback(
      (e, messageId) => {
        onTouchEnd(e, messageId);
      },
      [onTouchEnd]
    );

    return (
      <>
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            messages={messages}
            chatInfo={chatInfo}
            currentUser={currentUser}
            selectedMessages={selectedMessages}
            selectionMode={selectionMode}
            onContextMenu={onContextMenu}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onMessageClick={onMessageClick}
            onMouseDown={onMouseDown}
            onScrollToMessage={onScrollToMessage}
            onReactionClick={onReactionClick}
            onShowReactionPicker={onShowReactionPicker}
            setFullscreenData={setFullscreenData}
            setUserProfile={setUserProfile}
          />
        ))}
      </>
    );
  }
);

MessagesList.displayName = "MessagesList";

export default MessagesList;
