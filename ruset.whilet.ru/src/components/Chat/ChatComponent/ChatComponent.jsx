"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import "./ChatComponent.scss";
import { Header } from "@/components/Chat/Header/Header";
import { ContextMenu } from "@/components/Chat/ContextMenu/ContextMenu";
import { ReplyBox } from "@/components/Chat/ReplyBox/ReplyBox";
import { EditBox } from "@/components/Chat/EditBox/EditBox";
import { FormBottom } from "@/components/Chat/FormBottom/FormBottom";
import { MessagesContainer } from "@/components/Chat/MessagesContainer/MessagesContainer";
import { SearchBox } from "@/components/Chat/SearchBox/SearchBox";
import { ReactionPicker } from "@/components/Chat/ReactionPicker/ReactionPicker";
import { useRouter, usePathname } from "next/navigation";
import {
  getCachedChat,
  saveChatToCache,
  cleanupOldCache,
  getLastMessageId,
} from "@/lib/chatDB";
import { httpRSCap } from "@/utils/http";
import { walert } from "@/utils/miniModal";

export function ChatComponent({
  isExpandedMenu,
  setIsExpandedMenu,
  isExpandedChat,
  setIsExpandedChat,
  chatId,
  chatData,
  setSelectedChat,
  CHAT_TYPES,
  USER_ROLES,
  setUserProfile,
  setFullscreenData,
  currentUser,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(true);
  const PAGE_SIZE = 333;
  const [isChatReady, setIsChatReady] = useState(false);

  const currentChatLoginRef = useRef(chatData.login);
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const hasLoadedFromCacheRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const lastSenderRef = useRef(null);

  const [chatInfo, setChatInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    messageId: null,
    isMobile: false,
    x: 0,
    y: 0,
    canEdit: false,
    canDelete: false,
  });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [reactionPicker, setReactionPicker] = useState({
    visible: false,
    messageId: null,
    x: 0,
    y: 0,
  });

  // SSE состояния
  const [sseConnected, setSseConnected] = useState(false);
  const [connectionId, setConnectionId] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Новые состояния для статуса загрузки
  const [chatLoadingStatus, setChatLoadingStatus] = useState("loading");
  const [isOnline, setIsOnline] = useState(true);

  // Новые состояния для непрочитанных сообщений
  const [unreadCount, setUnreadCount] = useState(0);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState(null);
  const [showUnreadBadge, setShowUnreadBadge] = useState(false);
  const viewCheckRafRef = useRef(null);
  const pendingViewIdsRef = useRef(new Set());
  const flushViewsTimeoutRef = useRef(null);

  const messagesContainerRef = useRef(null);
  const selectedMessageRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const scrollPositionRef = useRef({
    scrollTop: 0,
    scrollHeight: 0,
  });
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  const [totalMessagesCount, setTotalMessagesCount] = useState(0);
  const [loadedMessagesCount, setLoadedMessagesCount] = useState(0);
  const loadedMessagesCountRef = useRef(0);

  // Проверка онлайн статуса
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (chatLoadingStatus === "disconnected") {
        setChatLoadingStatus("updating");
        connectSSE();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setChatLoadingStatus("disconnected");
      closeSSE();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [chatLoadingStatus]);

  const markMessagesAsViewed = useCallback(
    async (messageIds = []) => {
      if (!connectionId || !chatInfo?.id) return;

      const uniqueIds = [...new Set(messageIds)];
      if (uniqueIds.length === 0) return;

      try {
        const response = await httpRSCap(
          process.env.NEXT_PUBLIC_URL_API_NODE +
            "/sse/ruset/chat/mark-many-viewed",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              connectionId: connectionId,
              chat_id: chatInfo.id,
              message_ids: uniqueIds,
            }),
          }
        );

        if (!response.ok) {
          console.warn("Не удалось отметить сообщения как прочитанные");
        }
      } catch (error) {
        console.error("Ошибка отметки сообщений как просмотренных:", error);
      }
    },
    [connectionId, chatInfo?.id]
  );

  const flushQueuedViews = useCallback(() => {
    if (flushViewsTimeoutRef.current) {
      clearTimeout(flushViewsTimeoutRef.current);
      flushViewsTimeoutRef.current = null;
    }

    const ids = Array.from(pendingViewIdsRef.current);
    pendingViewIdsRef.current.clear();

    if (ids.length === 0) return;

    setMessages((prev) =>
      prev.map((m) =>
        ids.includes(m.id) ? { ...m, is_read: true } : m
      )
    );

    markMessagesAsViewed(ids);
  }, [markMessagesAsViewed]);

  const queueViewedMessages = useCallback(
    (messageIds) => {
      if (!messageIds || messageIds.length === 0) return;

      messageIds.forEach((id) => pendingViewIdsRef.current.add(id));

      if (!flushViewsTimeoutRef.current) {
        flushViewsTimeoutRef.current = setTimeout(() => {
          flushQueuedViews();
        }, 150);
      }
    },
    [flushQueuedViews]
  );

  const collectVisibleUnread = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (document.hidden || !document.hasFocus()) return;

    const containerRect = container.getBoundingClientRect();
    const unreadMessages = messages.filter(
      (msg) => !msg.is_read && msg.user_id !== currentUser.id
    );

    const visibleUnreadIds = [];

    unreadMessages.forEach((msg) => {
      const el = document.getElementById(`message-${msg.id}`);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;

      const visibleHeight =
        Math.min(rect.bottom, containerRect.bottom) -
        Math.max(rect.top, containerRect.top);

      const visibility = visibleHeight / rect.height;

      if (visibility >= 0.6) {
        visibleUnreadIds.push(msg.id);
      }
    });

    if (visibleUnreadIds.length > 0) {
      queueViewedMessages(visibleUnreadIds);
    }
  }, [messages, currentUser?.id, queueViewedMessages]);

  const scheduleVisibleCollection = useCallback(() => {
    if (viewCheckRafRef.current) {
      cancelAnimationFrame(viewCheckRafRef.current);
    }

    viewCheckRafRef.current = requestAnimationFrame(() => {
      viewCheckRafRef.current = null;
      collectVisibleUnread();
    });
  }, [collectVisibleUnread]);

  const updateUnreadCount = useCallback(() => {
    if (!messagesContainerRef.current) {
      setUnreadCount(0);
      setShowUnreadBadge(false);
      setFirstUnreadMessageId(null);
      return;
    }

    const container = messagesContainerRef.current;
    const scrollBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    const unreadMessages = messages.filter(
      (msg) => !msg.is_read && msg.user_id !== currentUser.id
    );

    setUnreadCount(unreadMessages.length);
    setShowUnreadBadge(unreadMessages.length > 0 && scrollBottom > 100);
    setFirstUnreadMessageId(unreadMessages.length ? unreadMessages[0].id : null);
  }, [messages, currentUser?.id]);

  useEffect(() => {
    scheduleVisibleCollection();
    updateUnreadCount();
  }, [messages, scheduleVisibleCollection, updateUnreadCount]);

  // Функция для прокрутки к непрочитанным сообщениям
  const scrollToUnread = useCallback(() => {
    if (firstUnreadMessageId) {
      const messageElement = document.getElementById(
        `message-${firstUnreadMessageId}`
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setShowUnreadBadge(false);
      }
    } else {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
        setShowUnreadBadge(false);
        setUnreadCount(0);
      }
    }
  }, [firstUnreadMessageId]);

  // Отслеживание прокрутки для обновления счетчика
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateUnreadCount();
      scheduleVisibleCollection();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [updateUnreadCount, scheduleVisibleCollection]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleVisibleCollection();
        updateUnreadCount();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [scheduleVisibleCollection, updateUnreadCount]);

  const shouldScrollToBottom = useCallback(
    (newMessage) => {
      if (!messagesContainerRef.current) return false;

      const container = messagesContainerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      return (
        isNearBottom &&
        (newMessage.sender === "me" || newMessage.user_id === currentUser.id)
      );
    },
    [currentUser?.id]
  );

  const scrollToBottomIfNeeded = useCallback(
    (newMessage) => {
      if (shouldScrollToBottom(newMessage)) {
        setTimeout(() => {
          if (messagesContainerRef.current && isMountedRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight;
            scheduleVisibleCollection();
          }
        }, 50);
      } else {
        if (newMessage.user_id !== currentUser.id) {
          updateUnreadCount();
        }
      }
    },
    [
      shouldScrollToBottom,
      scheduleVisibleCollection,
      updateUnreadCount,
      currentUser?.id,
    ]
  );

  const closeSSE = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        console.error("Ошибка закрытия SSE:", e);
      }
      eventSourceRef.current = null;
      setSseConnected(false);
      setConnectionId(null);
    }
  }, []);

  useEffect(() => {
    if (currentChatLoginRef.current !== chatData.login) {
      closeSSE();

      setMessages([]);
      setChatInfo(null);
      setEditingMessageId(null);
      setEditText("");
      setReplyingTo(null);
      setContextMenu({
        visible: false,
        messageId: null,
        isMobile: false,
        x: 0,
        y: 0,
        canEdit: false,
        canDelete: false,
      });
      setSelectedMessages([]);
      setSelectionMode(false);
      setIsDragging(false);
      setDragStart(null);
      setHasDragMoved(false);
      setSearchMode(false);
      setSearchQuery("");
      setSearchResults([]);
      setCurrentSearchIndex(0);
      setReactionPicker({
        visible: false,
        messageId: null,
        x: 0,
        y: 0,
      });

      setHasMore(true);
      setLoadingOlder(false);
      setChatMessagesLoading(true);
      setShowLoadMoreButton(false);
      setTotalMessagesCount(0);
      setLoadedMessagesCount(0);
      isLoadingRef.current = false;
      hasLoadedFromCacheRef.current = false;
      reconnectAttemptsRef.current = 0;
      lastSenderRef.current = null;

      setUnreadCount(0);
      setFirstUnreadMessageId(null);
      setShowUnreadBadge(false);
      pendingViewIdsRef.current.clear();
      if (viewCheckRafRef.current) {
        cancelAnimationFrame(viewCheckRafRef.current);
        viewCheckRafRef.current = null;
      }
      if (flushViewsTimeoutRef.current) {
        clearTimeout(flushViewsTimeoutRef.current);
        flushViewsTimeoutRef.current = null;
      }
      setChatLoadingStatus("loading");

      if (selectedMessageRef.current) {
        selectedMessageRef.current.classList.remove("is-selected");
        selectedMessageRef.current = null;
      }

      currentChatLoginRef.current = chatData.login;
    }
  }, [chatData.login, closeSSE]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      closeSSE();

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      if (viewCheckRafRef.current) {
        cancelAnimationFrame(viewCheckRafRef.current);
      }

      if (flushViewsTimeoutRef.current) {
        clearTimeout(flushViewsTimeoutRef.current);
      }
    };
  }, [closeSSE]);

  const getLastMessageIdFromDB = useCallback(async () => {
    try {
      const lastId = await getLastMessageId(chatData.login);
      return lastId || 0;
    } catch (error) {
      console.error("Ошибка получения последнего ID сообщения:", error);
      return 0;
    }
  }, [chatData.login]);

  const handleSSEMessage = useCallback(
    (event, data) => {
      if (
        !isMountedRef.current ||
        currentChatLoginRef.current !== chatData.login
      ) {
        return;
      }

      switch (event) {
        case "connected":
          setConnectionId(data.connectionId);
          reconnectAttemptsRef.current = 0;
          setChatLoadingStatus("connected");
          break;

        case "joined_chat":
          console.log("✅ Успешно присоединились к чату");
          break;

        case "initial_messages":
          setMessages((prev) => {
            if (hasLoadedFromCacheRef.current && prev.length > 0) {
              const newMessages = data.messages.map((msg) => {
                return {
                  ...msg,
                  sender:
                    msg?.user_id === currentUser.id ||
                    msg?.login === currentUser.login
                      ? "me"
                      : "user",
                };
              });

              const existingIds = new Set(prev.map((m) => m.id));
              const uniqueNew = newMessages.filter(
                (m) => !existingIds.has(m.id)
              );

              const combined = [...prev, ...uniqueNew].sort(
                (a, b) => a.id - b.id
              );
              const latestMessages = combined.slice(-PAGE_SIZE);

              return latestMessages;
            } else {
              const newMessages = data.messages.map((msg) => ({
                ...msg,
                sender:
                  msg?.user_id === currentUser.id ||
                  msg?.login === currentUser.login
                    ? "me"
                    : "user",
              }));

              return newMessages.sort((a, b) => a.id - b.id);
            }
          });

          setHasMore(data.hasMore);
          setTotalMessagesCount(data.totalMessages || 0);

          if (hasLoadedFromCacheRef.current) {
            const currentCount = messages.length;
            setLoadedMessagesCount(currentCount);
            loadedMessagesCountRef.current = currentCount;
          } else {
            setLoadedMessagesCount(data.loadedCount || 0);
            loadedMessagesCountRef.current = data.loadedCount || 0;
          }

          setShowLoadMoreButton(
            data.hasMore && (data.loadedCount || 0) >= 1000
          );
          setChatMessagesLoading(false);
          setIsChatReady(true);
          setChatLoadingStatus("connected");

          if (!hasLoadedFromCacheRef.current) {
            setTimeout(() => {
              if (messagesContainerRef.current && isMountedRef.current) {
                messagesContainerRef.current.scrollTop =
                  messagesContainerRef.current.scrollHeight;
              }
            }, 300);
          }

          break;

        case "older_messages":
          setMessages((prev) => {
            const newMessages = data.messages.map((msg) => ({
              ...msg,
              sender:
                msg?.user_id === currentUser.id ||
                msg?.login === currentUser.login
                  ? "me"
                  : "user",
            }));

            const existingIds = new Set(prev.map((m) => m.id));
            const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id));

            return [...uniqueNew, ...prev].sort((a, b) => a.id - b.id);
          });

          setHasMore(data.hasMore);
          setLoadedMessagesCount((prev) => prev + (data.messages?.length || 0));
          loadedMessagesCountRef.current += data.messages?.length || 0;
          setShowLoadMoreButton(data.hasMore);
          setLoadingOlder(false);
          break;

        case "new_message":
          if (data.data && data.data.chat_id === chatInfo?.id) {
            const newMessage = {
              ...data.data,
              sender:
                data.data.user_id === currentUser.id ||
                data.data.login === currentUser.login
                  ? "me"
                  : "user",
            };

            const currentTime = new Date().getTime();
            const threeMinute = 180 * 1000;

            setMessages((prev) => {
              const existsById = prev.some((msg) => msg?.id === newMessage.id);

              if (existsById) {
                return prev.map((msg) =>
                  msg?.id === newMessage.id ? { ...msg, ...newMessage } : msg
                );
              }

              const existsRecentMe = prev.some(
                (msg) =>
                  (msg?.sender === "me" || msg?.login === currentUser.login) &&
                  new Date(msg?.created_at).getTime() >=
                    currentTime - threeMinute
              );

              if (
                (newMessage.sender === "me" ||
                  newMessage?.login === currentUser.login) &&
                new Date(newMessage.created_at).getTime() >=
                  currentTime - threeMinute &&
                existsRecentMe
              ) {
                return prev;
              }

              const updatedMessages = prev
                .map((msg) =>
                  msg?.temp_id && msg?.temp_id === newMessage.temp_id
                    ? { ...newMessage, sendingStatus: "sent" }
                    : msg
                )
                .concat(existsById ? [] : [newMessage]);

              scrollToBottomIfNeeded(newMessage);
              lastSenderRef.current = newMessage.sender;

              return updatedMessages;
            });
          }
          break;

        case "reaction_update":
          // ✅ ИСПРАВЛЕНО: Правильное обновление реакций
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== data.message_id) return msg;

              // Полностью заменяем реакции на актуальные с сервера
              return {
                ...msg,
                reactions: data.reactions || {},
              };
            })
          );
          console.log(
            `✅ Обновлены реакции для сообщения ${data.message_id}`,
            data.reactions
          );
          break;

        case "view_update":
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.message_id
                ? {
                    ...msg,
                    is_read: data.is_read,
                    views: {
                      count: data.view_count,
                      users: data.viewed_by,
                    },
                  }
                : msg
            )
          );
          console.log(
            `✅ Обновлены просмотры для сообщения ${data.message_id}`
          );
          break;

        case "message_edited":
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.message_id
                ? {
                    ...msg,
                    text: data.text,
                    is_edited: true,
                    updated_at: data.updated_at,
                  }
                : msg
            )
          );
          break;

        case "message_deleted":
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== data.message_id)
          );
          break;

        case "heartbeat":
          break;

        case "error":
          walert(500, data.message || "Ошибка SSE");
          break;
      }
    },
    [
      currentUser?.id,
      chatInfo?.id,
      chatData.login,
      scrollToBottomIfNeeded,
      messages.length,
      currentUser?.login,
    ]
  );

  const toggleReaction = useCallback(
    (messageId, emoji, action = "toggle") => {
      // Оптимистичное обновление UI
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.id !== messageId) return message;

          const reactions = { ...message.reactions };
          const currentReaction = reactions[emoji] || {
            count: 0,
            users: [],
            hasReacted: false,
          };

          let shouldAdd = false;

          if (action === "add") {
            shouldAdd = true;
          } else if (action === "remove") {
            shouldAdd = false;
          } else {
            shouldAdd = !currentReaction.hasReacted;
          }

          if (shouldAdd) {
            reactions[emoji] = {
              count: currentReaction.count + 1,
              users: [...(currentReaction.users || []), currentUser.id],
              hasReacted: true,
            };
          } else {
            const newCount = Math.max(0, currentReaction.count - 1);
            if (newCount === 0) {
              delete reactions[emoji];
            } else {
              reactions[emoji] = {
                count: newCount,
                users: (currentReaction.users || []).filter(
                  (id) => id !== currentUser.id
                ),
                hasReacted: false,
              };
            }
          }

          return {
            ...message,
            reactions,
          };
        })
      );

      // Отправляем запрос на сервер (реальное обновление придет через SSE)
      toggleReactionhttpRSCap(messageId, emoji);
    },
    [currentUser?.id]
  );
  const connectSSE = useCallback(async () => {
    if (!currentUser || !isMountedRef.current) {
      return;
    }

    if (currentChatLoginRef.current !== chatData.login) {
      return;
    }

    if (eventSourceRef.current) {
      return;
    }

    const chat_id = chatData.id || chatInfo?.id;

    if (!chat_id) {
      console.warn("⚠️ chat_id не найден, ждем загрузки chatInfo");
      return;
    }

    if (!isOnline) {
      setChatLoadingStatus("disconnected");
      return;
    }

    setChatLoadingStatus("updating");

    const lastMessageId = await getLastMessageIdFromDB();

    try {
      const url =
        process.env.NEXT_PUBLIC_URL_API_NODE +
        `/sse/ruset/chat/connect?chat_id=${chat_id}&last_message_id=${lastMessageId}`;

      const eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.addEventListener("connected", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("connected", data);
        } catch (error) {
          console.error("Ошибка парсинга connected:", error);
        }
      });

      eventSource.addEventListener("joined_chat", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("joined_chat", data);
        } catch (error) {
          console.error("Ошибка парсинга joined_chat:", error);
        }
      });

      eventSource.addEventListener("initial_messages", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("initial_messages", data);
        } catch (error) {
          console.error("Ошибка парсинга initial_messages:", error);
        }
      });

      eventSource.addEventListener("older_messages", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("older_messages", data);
        } catch (error) {
          console.error("Ошибка парсинга older_messages:", error);
        }
      });

      eventSource.addEventListener("new_message", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("new_message", data);
        } catch (error) {
          console.error("Ошибка парсинга new_message:", error);
        }
      });

      eventSource.addEventListener("reaction_update", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("reaction_update", data);
        } catch (error) {
          console.error("Ошибка парсинга reaction_update:", error);
        }
      });

      eventSource.addEventListener("view_update", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("view_update", data);
        } catch (error) {
          console.error("Ошибка парсинга view_update:", error);
        }
      });

      eventSource.addEventListener("message_edited", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("message_edited", data);
        } catch (error) {
          console.error("Ошибка парсинга message_edited:", error);
        }
      });

      eventSource.addEventListener("message_deleted", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("message_deleted", data);
        } catch (error) {
          console.error("Ошибка парсинга message_deleted:", error);
        }
      });

      eventSource.addEventListener("heartbeat", (e) => {
        // Heartbeat
      });

      eventSource.addEventListener("error", (e) => {
        try {
          const data = JSON.parse(e.data);
          handleSSEMessage("error", data);
        } catch (error) {
          // Игнорируем
        }
      });

      eventSource.onerror = (error) => {
        console.error("❌ Ошибка SSE:", error);
        setSseConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        if (!isOnline) {
          setChatLoadingStatus("disconnected");
          return;
        }

        setChatLoadingStatus("updating");

        if (
          isMountedRef.current &&
          currentChatLoginRef.current === chatData.login &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              currentChatLoginRef.current === chatData.login
            ) {
              connectSSE();
            }
          }, delay);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error("Ошибка создания SSE соединения:", error);
      setChatLoadingStatus("disconnected");
    }
  }, [
    currentUser,
    chatData.login,
    chatData.id,
    handleSSEMessage,
    chatInfo?.id,
    getLastMessageIdFromDB,
    isOnline,
  ]);

  useEffect(() => {
    if (
      currentUser &&
      currentChatLoginRef.current === chatData.login &&
      chatInfo?.id &&
      !eventSourceRef.current
    ) {
      connectSSE();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [currentUser, connectSSE, chatData.login, chatInfo?.id]);

  useEffect(() => {
    cleanupOldCache();
  }, []);

  useEffect(() => {
    if (
      currentUser &&
      chatData?.login &&
      messages.length > 0 &&
      chatInfo &&
      currentChatLoginRef.current === chatData.login
    ) {
      const timeoutId = setTimeout(() => {
        if (currentChatLoginRef.current === chatData.login) {
          saveChatToCache(chatData.login, messages, chatInfo);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, chatInfo, currentUser, chatData?.login]);

  const getChatInfo = useCallback(async () => {
    const requestChatLogin = chatData.login;

    try {
      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN +
          "/v2/ruset/chat/getChatInfo/" +
          requestChatLogin,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Origin: "https://whilet.ru",
            Referer: "https://whilet.ru",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (
        !isMountedRef.current ||
        currentChatLoginRef.current !== requestChatLogin
      ) {
        return null;
      }

      const data = await response.json();

      if (response.ok) {
        return data.data;
      } else {
        walert(data.status, data.message);
        router.replace("/");
        return null;
      }
    } catch (error) {
      console.error("Ошибка получения информации о чате:", error);
      return null;
    }
  }, [chatData.login, router]);

  const canDeleteMessage = useCallback(
    (message) => {
      if (!currentUser || !message) return false;
      if (message.user_id === currentUser.id) return true;
      if (["owner", "admin"].includes(currentUser.role)) return true;
      if (
        currentUser.role === "moderator" &&
        chatInfo?.settings?.canMembersDeleteMessages
      )
        return true;
      return false;
    },
    [currentUser, chatInfo?.settings]
  );

  const canEditMessage = useCallback(
    (message) => {
      if (!currentUser || !message) return false;
      return message.user_id === currentUser.id;
    },
    [currentUser]
  );

  const canPinMessage = useCallback(() => {
    if (chatInfo?.type === "channel" || chatInfo?.type === "group") {
      return ["owner", "admin"].includes(currentUser?.role);
    }
    return true;
  }, [currentUser?.role, chatInfo?.type]);

  const canForwardMessages = useCallback(() => {
    if (chatInfo?.type === "private") return true;
    return false;
  }, [chatInfo?.type]);

  async function toggleReactionhttpRSCap(mid, emoji) {
    try {
      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN +
          "/v2/ruset/chat/toggleReaction/" +
          mid,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Origin: "https://whilet.ru",
            Referer: "https://whilet.ru",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emoji: emoji,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Реакция ${emoji} обновлена для сообщения ${mid}`);
        // Обновление придет через SSE событие reaction_update
      }
    } catch (error) {
      walert(500, "Не удалось поставить реакцию");
    }
  }

  const showReactionPicker = useCallback(
    (messageId, x, y, currentUserReactions, isPremium) => {
      setReactionPicker({
        visible: true,
        messageId,
        x,
        y,
        currentUserReactions:
          currentUserReactions || getCurrentUserReactions(messageId),
        isPremium: isPremium || currentUser?.isPremium || false,
      });
    },
    [currentUser?.isPremium]
  );

  const getCurrentUserReactions = useCallback(
    (messageId) => {
      const message = messages.find((msg) => msg?.id === messageId);
      if (!message || !message.reactions) return [];

      return Object.entries(message.reactions)
        .filter(
          ([emoji, data]) => data.users && data.users.includes(currentUser?.id)
        )
        .map(([emoji]) => emoji);
    },
    [messages, currentUser?.id]
  );

  const addReaction = useCallback(
    (messageId, emoji) => {
      toggleReaction(messageId, emoji);
    },
    [toggleReaction]
  );

  async function sendPinMessage(mid) {
    try {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg?.id === mid
            ? {
                ...msg,
                sendingStatus: "loading",
              }
            : msg
        )
      );

      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN +
          "/v2/ruset/chat/pinMessage/" +
          chatData.login +
          "/" +
          mid,
        {
          method: "POST",
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
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg?.id === mid
              ? {
                  ...msg,
                  sendingStatus: "failed",
                }
              : msg
          )
        );
        walert(data.status, data.message);
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg?.id === mid
            ? { ...msg, is_pinned: !msg?.is_pinned, sendingStatus: "completed" }
            : msg
        )
      );
    } catch (error) {
      walert(500, "Ошибка при закреплении/откреплении сообщения");
    }
  }

  const handlePinMessage = useCallback(
    (messageId) => {
      if (!canPinMessage()) {
        walert(403, "У вас нет прав для закрепления сообщений");
        return;
      }
      sendPinMessage(messageId);
    },
    [canPinMessage]
  );

  const scrollToMessage = useCallback((messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.classList.add("reply-highlight");
      setTimeout(() => {
        messageElement.classList.remove("reply-highlight");
      }, 2000);
    }
  }, []);

  const enterSelectionMode = useCallback((messageId) => {
    setSelectionMode(true);
    if (messageId) {
      setSelectedMessages([messageId]);
    }
  }, []);

  const handleReply = useCallback(
    (messageId) => {
      const message = messages.find((msg) => msg?.id === messageId);
      setReplyingTo(message);
    },
    [messages]
  );

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const updateScrollInfo = useCallback(() => {
    if (messagesContainerRef.current) {
      scrollPositionRef.current = {
        scrollTop: messagesContainerRef.current.scrollTop,
        scrollHeight: messagesContainerRef.current.scrollHeight,
      };
    }
  }, []);

  const toggleMessageSelection = useCallback(
    (messageId) => {
      setSelectedMessages((prev) => {
        const isCurrentlySelected = prev.includes(messageId);

        if (isCurrentlySelected) {
          const newSelected = prev.filter((id) => id !== messageId);

          if (newSelected.length === 0) {
            setSelectionMode(false);
            if (selectedMessageRef.current) {
              selectedMessageRef.current.classList.remove("is-selected");
              selectedMessageRef.current = null;
            }
          }
          return newSelected;
        } else {
          if (!selectionMode) {
            setSelectionMode(true);
          }

          return [...prev, messageId];
        }
      });
    },
    [selectionMode]
  );

  const hideReactionPicker = useCallback(() => {
    setReactionPicker({
      visible: false,
      messageId: null,
      x: 0,
      y: 0,
    });
  }, []);

  const searchMessages = useCallback(
    (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const results = messages.filter((msg) =>
        msg?.text?.toLowerCase()?.includes(query?.toLowerCase())
      );
      setSearchResults(results);
      setCurrentSearchIndex(0);
    },
    [messages]
  );

  const navigateToSearchResult = useCallback(
    (index) => {
      if (searchResults.length === 0) return;

      const messageId = searchResults[index].id;
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        messageElement.classList.add("search-highlight");
        setTimeout(() => {
          messageElement.classList.remove("search-highlight");
        }, 2000);
      }
    },
    [searchResults]
  );

  const nextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    navigateToSearchResult(nextIndex);
  }, [searchResults.length, currentSearchIndex, navigateToSearchResult]);

  const prevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIndex =
      currentSearchIndex === 0
        ? searchResults.length - 1
        : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    navigateToSearchResult(prevIndex);
  }, [searchResults.length, currentSearchIndex, navigateToSearchResult]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setHasDragMoved(false);
  }, []);

  const saveEditedMessage = useCallback(() => {
    if (editText.trim() === "") return;

    setMessages(
      messages.map((msg) =>
        msg?.id === editingMessageId
          ? {
              ...msg,
              text: editText,
              is_edited: true,
              editedAt: new Date().toISOString(),
            }
          : msg
      )
    );

    setEditingMessageId(null);
    setEditText("");
  }, [editText, messages, editingMessageId]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditText("");
  }, []);

  const getEditingMessage = useCallback(() => {
    return messages.find((msg) => msg?.id === editingMessageId);
  }, [messages, editingMessageId]);

  const forwardSelectedMessages = useCallback(() => {
    if (!canForwardMessages()) {
      walert(403, "У вас нет прав для пересылки сообщений");
      return;
    }

    const messagesToForward = messages.filter((msg) =>
      selectedMessages.includes(msg?.id)
    );
    exitSelectionMode();
  }, [canForwardMessages, messages, selectedMessages]);

  const deleteSelectedMessages = useCallback(() => {
    updateScrollInfo();
    deleteMessages(selectedMessages);
    exitSelectionMode();
  }, [selectedMessages, updateScrollInfo]);

  async function deleteMessages(arrayId) {
    try {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          selectedMessages.includes(msg?.id)
            ? {
                ...msg,
                sendingStatus: "loading",
              }
            : msg
        )
      );

      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN +
          "/v2/ruset/chat/deleteMessages/" +
          chatData.login,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Origin: "https://whilet.ru",
            Referer: "https://whilet.ru",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mids: selectedMessages,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            selectedMessages.includes(msg?.id)
              ? {
                  ...msg,
                  sendingStatus: "failed",
                }
              : msg
          )
        );
        walert(data.status, data.message);
        return;
      }

      setMessages((prev) =>
        prev.filter((msg) => !selectedMessages.includes(msg?.id))
      );
    } catch (error) {
      walert(500, "Ошибка при удалении сообщений");
    }
  }

  const exitSelectionMode = useCallback(() => {
    setSelectedMessages([]);
    setSelectionMode(false);
    setIsDragging(false);
    setDragStart(null);
    setHasDragMoved(false);
    if (selectedMessageRef.current) {
      selectedMessageRef.current.classList.remove("is-selected");
      selectedMessageRef.current = null;
    }
  }, []);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current && isChatReady) {
      const lastMessage = messages[messages.length - 1];

      if (
        lastMessage.sender === "me" ||
        lastMessage.login === currentUser.login
      ) {
        const container = messagesContainerRef.current;

        if (chatMessagesLoading) {
          setTimeout(() => {
            if (container && isMountedRef.current) {
              container.scrollTop = container.scrollHeight;
            }
          }, 100);
          return;
        }
      }
    }
  }, [messages, isChatReady, chatMessagesLoading, currentUser?.login]);

  const loadOlderMessages = useCallback(async () => {
    const container = messagesContainerRef.current;

    if (
      !container ||
      loadingOlder ||
      messages.length === 0 ||
      chatMessagesLoading ||
      !connectionId ||
      !chatInfo?.id ||
      !hasMore
    ) {
      return;
    }

    const scrollTopBefore = container.scrollTop;
    const scrollHeightBefore = container.scrollHeight;

    const firstMessageId = messages[0]?.id;

    if (!firstMessageId) {
      console.warn("⚠️ Нет первого сообщения для загрузки старых");
      return;
    }

    const firstMessageElement = document.getElementById(
      `message-${firstMessageId}`
    );
    const firstMessageRect = firstMessageElement?.getBoundingClientRect();
    const firstMessageOffsetBefore = firstMessageRect
      ? firstMessageRect.top -
        container.getBoundingClientRect().top +
        container.scrollTop
      : 0;

    setLoadingOlder(true);

    try {
      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_NODE +
          "/sse/ruset/chat/load-older-messages",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Origin: "https://whilet.ru",
            Referer: "https://whilet.ru",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            connectionId: connectionId,
            chat_id: chatInfo.id,
            before_id: firstMessageId,
            limit: PAGE_SIZE,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setLoadingOlder(false);
        walert(data.status || 500, data.message || "Ошибка загрузки сообщений");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const scrollHeightAfter = container.scrollHeight;

      if (firstMessageElement) {
        const newFirstMessageRect = firstMessageElement.getBoundingClientRect();
        const newFirstMessageOffset =
          newFirstMessageRect.top -
          container.getBoundingClientRect().top +
          container.scrollTop;
        container.scrollTop =
          scrollTopBefore + (newFirstMessageOffset - firstMessageOffsetBefore);
      } else {
        const heightDiff = scrollHeightAfter - scrollHeightBefore;
        container.scrollTop = heightDiff;
      }
    } catch (e) {
      console.error("Ошибка загрузки старых сообщений:", e);
      setLoadingOlder(false);
    }
  }, [
    loadingOlder,
    hasMore,
    messages,
    PAGE_SIZE,
    chatMessagesLoading,
    chatData.login,
    connectionId,
    chatInfo?.id,
  ]);

  useEffect(() => {
    if (currentUser && chatData?.login && !isLoadingRef.current) {
      isLoadingRef.current = true;

      const loadChat = async () => {
        const requestChatLogin = chatData.login;

        setChatLoadingStatus("loading");

        const cached = await getCachedChat(requestChatLogin);
        const isFresh =
          cached && Date.now() - cached.timestamp < 31 * 24 * 60 * 60 * 1000;

        if (
          !isMountedRef.current ||
          currentChatLoginRef.current !== requestChatLogin
        ) {
          isLoadingRef.current = false;
          return;
        }

        if (isFresh && cached.messages) {
          const cachedMessages = cached.messages;
          const messagesToShow = cachedMessages.slice(-PAGE_SIZE);

          setMessages(messagesToShow);
          setChatMessagesLoading(false);
          hasLoadedFromCacheRef.current = true;

          const loadedCount = messagesToShow.length;
          setLoadedMessagesCount(loadedCount);
          loadedMessagesCountRef.current = loadedCount;

          const hasMoreMessages = cachedMessages.length > PAGE_SIZE;
          setHasMore(hasMoreMessages);
          setShowLoadMoreButton(hasMoreMessages);

          setTotalMessagesCount(cachedMessages.length);

          setTimeout(() => {
            if (messagesContainerRef.current && isMountedRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            }
          }, 200);

          setChatLoadingStatus("updating");
        }

        try {
          const fetchedChatInfo = await getChatInfo();
          if (!fetchedChatInfo) {
            isLoadingRef.current = false;
            setChatLoadingStatus("disconnected");
            return;
          }

          if (
            !isMountedRef.current ||
            currentChatLoginRef.current !== requestChatLogin
          ) {
            isLoadingRef.current = false;
            return;
          }

          setChatInfo(fetchedChatInfo);

          if (!isFresh) {
            setChatMessagesLoading(false);
          }
        } catch (error) {
          console.error("Ошибка загрузки информации о чате:", error);
          setChatMessagesLoading(false);
          setChatLoadingStatus("disconnected");
        }

        isLoadingRef.current = false;
      };

      loadChat();
    }
  }, [currentUser, chatData?.login, getChatInfo, PAGE_SIZE]);

  return (
    <div
      className={`chatContainer ${isExpandedMenu ? "is-active" : ""} ${
        !isMobile ? (!isExpandedChat ? "is-active-2" : "") : ""
      }`}
    >
      <Header
        setSelectedChat={setSelectedChat}
        selectionMode={selectionMode}
        selectedCount={selectedMessages?.length}
        onForward={forwardSelectedMessages}
        onDelete={deleteSelectedMessages}
        onExitSelection={exitSelectionMode}
        isExpandedMenu={isExpandedMenu}
        setIsExpandedMenu={setIsExpandedMenu}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        pinnedMessages={messages.filter((msg) => msg?.is_pinned)}
        onScrollToPinned={scrollToMessage}
        chatInfo={chatInfo}
        currentUser={currentUser}
        CHAT_TYPES={CHAT_TYPES}
        setUserProfile={setUserProfile}
        setMessages={setMessages}
        messages={messages}
        chatData={chatData}
        wsConnected={sseConnected}
        chatLoadingStatus={chatLoadingStatus}
        isOnline={isOnline}
      />

      {searchMode && (
        <SearchBox
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={searchMessages}
          searchResults={searchResults}
          currentIndex={currentSearchIndex}
          onNext={nextSearchResult}
          onPrev={prevSearchResult}
          onClose={() => {
            setSearchMode(false);
            setSearchQuery("");
            setSearchResults([]);
          }}
        />
      )}

      <MessagesContainer
        messages={messages}
        setMessages={setMessages}
        scrollPositionRef={scrollPositionRef}
        setContextMenu={setContextMenu}
        contextMenu={contextMenu}
        setUserProfile={setUserProfile}
        messagesContainerRef={messagesContainerRef}
        editingMessageId={editingMessageId}
        setEditingMessageId={setEditingMessageId}
        selectedMessageRef={selectedMessageRef}
        editText={editText}
        setEditText={setEditText}
        updateScrollInfo={updateScrollInfo}
        selectedMessages={selectedMessages}
        selectionMode={selectionMode}
        toggleMessageSelection={toggleMessageSelection}
        setSelectionMode={setSelectionMode}
        onScrollToMessage={scrollToMessage}
        hasDragMoved={hasDragMoved}
        enterSelectionMode={enterSelectionMode}
        chatInfo={chatInfo}
        currentUser={currentUser}
        canDeleteMessage={canDeleteMessage}
        canEditMessage={canEditMessage}
        toggleReaction={toggleReaction}
        showReactionPicker={showReactionPicker}
        onReply={handleReply}
        chatMessagesLoading={chatMessagesLoading}
        setFullscreenData={setFullscreenData}
        onLoadMore={loadOlderMessages}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        showLoadMoreButton={showLoadMoreButton}
        totalMessagesCount={totalMessagesCount}
        loadedMessagesCount={loadedMessagesCountRef.current}
      />

      {contextMenu.visible && (
        <ContextMenu
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          selectedMessageRef={selectedMessageRef}
          setMessages={setMessages}
          messages={messages}
          updateScrollInfo={updateScrollInfo}
          setEditingMessageId={setEditingMessageId}
          messagesContainerRef={messagesContainerRef}
          setEditText={setEditText}
          setSelectionMode={setSelectionMode}
          setSelectedMessages={setSelectedMessages}
          onReply={handleReply}
          onPinMessage={handlePinMessage}
          toggleReaction={toggleReaction}
          showReactionPicker={showReactionPicker}
          currentUser={currentUser}
          chatData={chatData}
        />
      )}

      {reactionPicker.visible && (
        <ReactionPicker
          visible={reactionPicker.visible}
          messageId={reactionPicker.messageId}
          x={reactionPicker.x}
          y={reactionPicker.y}
          onReactionSelect={addReaction}
          onClose={hideReactionPicker}
        />
      )}

      {!editingMessageId && (
        <ReplyBox
          reply_to={replyingTo}
          chatInfo={chatInfo}
          onCancelReply={cancelReply}
        />
      )}

      <EditBox
        message={getEditingMessage()}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEditedMessage}
        editText={editText}
        setEditText={setEditText}
      />

      {showUnreadBadge && (
        <button className="unread-messages-badge" onClick={scrollToUnread}>
          <span className="unread-count">{unreadCount}</span>
          <span className="unread-text">
            {unreadCount === 1
              ? "непрочитанное сообщение"
              : unreadCount < 5
              ? "непрочитанных сообщения"
              : "непрочитанных сообщений"}
          </span>
        </button>
      )}

      <FormBottom
        setMessages={setMessages}
        messages={messages}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        editingMessageId={editingMessageId}
        setEditingMessageId={setEditingMessageId}
        editText={editText}
        setEditText={setEditText}
        chatInfo={chatInfo}
        currentUser={currentUser}
        chatData={chatData}
        connectionId={connectionId}
        sseConnected={sseConnected}
      />
    </div>
  );
}
