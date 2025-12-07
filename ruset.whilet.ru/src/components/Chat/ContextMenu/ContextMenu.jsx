import { useRef, useEffect, memo } from "react";
import "./ContextMenu.scss";
import MenuItems from "./components/MenuItems/MenuItems";
import ReactionSection from "./components/ReactionSection/ReactionSection";
import { useContextMenuLogic } from "./hooks/useContextMenuLogic";

export const ContextMenu = memo(function ContextMenu({
  contextMenu,
  setContextMenu,
  selectedMessageRef,
  messages,
  setMessages,
  updateScrollInfo,
  setEditingMessageId,
  messagesContainerRef,
  setEditText,
  setSelectionMode,
  setSelectedMessages,
  onReply,
  onPinMessage,
  toggleReaction,
  showReactionPicker,
  currentUser,
  chatData,
}) {
  const contextMenuRef = useRef(null);

  const {
    currentMessage,
    hasMediaContent,
    handleCopyText,
    handleEditMessage,
    handleReply,
    handlePinMessage,
    handleSelectMessage,
    handleDeleteMessage,
    handleDownloadMedia,
    handleReactionClick,
    handleShowMoreReactions,
    getCurrentUserReactions,
    quickReactions,
  } = useContextMenuLogic({
    contextMenu,
    messages,
    currentUser,
    chatData,
    setMessages,
    setEditingMessageId,
    setEditText,
    setSelectionMode,
    setSelectedMessages,
    onReply,
    onPinMessage,
    toggleReaction,
    showReactionPicker,
    messagesContainerRef,
    updateScrollInfo,
    closeContextMenu: () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    },
  });

  const currentUserReactions = getCurrentUserReactions();

  useEffect(() => {
    if (!contextMenu.visible) return;
    const handler = (e) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target)
      ) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu.visible, setContextMenu]);

  useEffect(() => {
    if (!contextMenu.visible || !contextMenuRef.current) return;
    const el = contextMenuRef.current;
    const rect = el.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const padding = contextMenu.isMobile ? 16 : 10;

    let newX = contextMenu.x;
    let newY = contextMenu.y;

    if (newX + rect.width + padding > innerWidth)
      newX = innerWidth - rect.width - padding;
    if (newX < padding) newX = padding;
    if (newY + rect.height + padding > innerHeight)
      newY = innerHeight - rect.height - padding;
    if (newY < padding) newY = padding;

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;
  }, [contextMenu.visible, contextMenu.x, contextMenu.y, contextMenu.isMobile]);

  useEffect(() => {
    const messageEl = contextMenu.messageId
      ? document.querySelector(`[data-message-id="${contextMenu.messageId}"]`)
      : null;

    if (contextMenu.visible && messageEl) {
      if (
        selectedMessageRef.current &&
        selectedMessageRef.current !== messageEl
      ) {
        selectedMessageRef.current.classList.remove("is-selected");
      }
      messageEl.classList.add("is-selected");
      selectedMessageRef.current = messageEl;
    } else if (selectedMessageRef.current) {
      // Если меню закрыто или сообщение не найдено — снимаем выделение
      selectedMessageRef.current.classList.remove("is-selected");
      selectedMessageRef.current = null;
    }

    return () => {
      if (selectedMessageRef.current) {
        selectedMessageRef.current.classList.remove("is-selected");
        selectedMessageRef.current = null;
      }
    };
  }, [contextMenu.visible, contextMenu.messageId, selectedMessageRef]);

  if (!contextMenu.visible || !contextMenu.messageId) return null;

  return (
    <div className="ContextMenu is-active">
      <div
        ref={contextMenuRef}
        className={`contextMenuContainer is-active ${
          contextMenu.isMobile ? "is-constrained" : ""
        }`}
        style={{ position: "fixed", zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItems
          canEdit={contextMenu.canEdit}
          canDelete={contextMenu.canDelete}
          hasText={!!currentMessage?.text}
          hasMedia={hasMediaContent}
          onReply={handleReply}
          onEdit={handleEditMessage}
          onCopy={handleCopyText}
          onPin={handlePinMessage}
          onSelect={handleSelectMessage}
          onDelete={handleDeleteMessage}
          onDownload={handleDownloadMedia}
          isPinned={currentMessage?.is_pinned}
        />

        <ReactionSection
          reactions={quickReactions}
          currentUserReactions={currentUserReactions}
          onReactionClick={handleReactionClick}
          onShowMore={showReactionPicker ? handleShowMoreReactions : null}
        />
      </div>
    </div>
  );
});
