import React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { saveChatToCache, deleteChatFromCache } from "@/lib/chatDB";
import SelectionHeader from "./components/SelectionHeader/SelectionHeader";
import DefaultHeader from "./components/DefaultHeader/DefaultHeader";
import PinnedMessageBanner from "./components/PinnedMessageBanner/PinnedMessageBanner";
import "./Header.scss";
import { httpRSCap } from "@/utils/http";
import { walert } from "@/utils/miniModal";

export function Header({
  selectionMode,
  selectedCount,
  onForward,
  onDelete,
  onExitSelection,
  searchMode,
  setSearchMode,
  pinnedMessages,
  onScrollToPinned,
  currentPinnedIndex,
  onNextPinned,
  onPrevPinned,
  showPinnedBanner,
  onClosePinnedBanner,
  setSelectedChat,
  chatInfo,
  currentUser,
  setUserProfile,
  setMessages,
  chatData,
  chatLoadingStatus,
  isOnline,
}) {
  const [showPinnedDropdown, setShowPinnedDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  const getStatusText = () => {
    if (!isOnline) return "Ожидание подключения...";

    switch (chatLoadingStatus) {
      case "loading":
        return "Загрузка...";
      case "updating":
        return "Обновление...";
      case "connected":
        return null; // Скрываем статус при успешном подключении
      case "disconnected":
        return "Ожидание подключения...";
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  // Обработчик клика вне dropdown
  useEffect(() => {
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPinnedDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Перейти к закреплённому сообщению
  const handlePinnedClick = useCallback(
    (messageId) => {
      onScrollToPinned(messageId);
      setShowPinnedDropdown(false);
    },
    [onScrollToPinned]
  );

  // Удаление всего чата
  const deleteAllChat = useCallback(async () => {
    if (
      !confirm(
        "Вы уверены, что хотите удалить весь чат? Весь контент будет безвозвратно удален!"
      )
    )
      return;

    try {
      setMessages((prev) =>
        prev.map((msg) => (msg.id ? { ...msg, sendingStatus: "loading" } : msg))
      );

      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN +
          `/v2/ruset/chat/deleteChat/${chatData.login}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Origin: "https://whilet.ru",
            Referer: "https://whilet.ru",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id ? { ...msg, sendingStatus: "failed" } : msg
          )
        );
        walert(data.status, data.message);
        return;
      }

      setMessages([]);
      router.replace("/");
      setSelectedChat(null);
      await saveChatToCache(chatData.login, []);
      deleteChatFromCache(chatData.login);
    } catch (error) {
      console.error("Ошибка при удалении чата:", error);
      walert(403, "Ошибка при удалении чата", error);
    }
  }, [chatData.login, setMessages, router, setSelectedChat]);

  return (
    <>
      <div className={`Header ${selectionMode ? "selection-mode" : ""}`}>
        {selectionMode ? (
          <SelectionHeader
            selectedCount={selectedCount}
            onForward={onForward}
            onDelete={onDelete}
            onExitSelection={onExitSelection}
          />
        ) : (
          <DefaultHeader
            chatInfo={chatInfo}
            currentUser={currentUser}
            setUserProfile={setUserProfile}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            pinnedMessages={pinnedMessages}
            showPinnedDropdown={showPinnedDropdown}
            setShowPinnedDropdown={setShowPinnedDropdown}
            dropdownRef={dropdownRef}
            handlePinnedClick={handlePinnedClick}
            deleteAllChat={deleteAllChat}
            setSelectedChat={setSelectedChat}
            statusText={statusText}
          />
        )}
      </div>

      {showPinnedBanner && pinnedMessages.length > 0 && (
        <PinnedMessageBanner
          currentPinnedMessage={pinnedMessages[currentPinnedIndex]}
          currentPinnedIndex={currentPinnedIndex}
          pinnedMessages={pinnedMessages}
          onScrollToPinned={onScrollToPinned}
          onNextPinned={onNextPinned}
          onPrevPinned={onPrevPinned}
          onClosePinnedBanner={onClosePinnedBanner}
        />
      )}
    </>
  );
}
