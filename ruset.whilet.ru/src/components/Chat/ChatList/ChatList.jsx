"use client";
import React, { useState, useEffect, useRef } from "react";
import "./ChatList.scss";
import {
  BiUser,
  BiGroup,
  BiBroadcast,
  BiBot,
  BiTimeFive,
  BiX,
  BiPin,
  BiVolumeMute,
  BiSearch,
  BiMenu,
  BiEditAlt,
  BiWifi,
  BiWifiOff,
  BiRefresh,
  BiError,
} from "react-icons/bi";
import { MdDone } from "react-icons/md";
import { httpRSCap } from "@/utils/http";
import { walert } from "@/utils/miniModal";
import {
  openChatDB,
  saveChatsToCache,
  getCachedChats,
  cleanupOldCache,
} from "@/lib/chatListDB";

export function ChatList({
  onChatSelect,
  selectedChatId,
  setIsExpandedMenu,
  isExpandedMenu,
  isExpandedChat,
  setIsExpandedChat,
  CHAT_TYPES,
  currentUser,
  toggleMenuNewChats,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [filteredChats, setFilteredChats] = useState([]);
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [sseConnectionId, setSseConnectionId] = useState(null);

  // Статусы подключения
  const [connectionStatus, setConnectionStatus] = useState("updating"); // updating, disconnected, error
  const [isOnline, setIsOnline] = useState(true);
  const [hasCachedData, setHasCachedData] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Используем ref для отслеживания загрузки
  const hasLoadedChatsRef = useRef(false);
  const isLoadingRef = useRef(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttemptsRef = useRef(10);
  const reconnectDelayRef = useRef(1000);

  const toggleMenu = () => {
    setIsExpandedMenu(!isExpandedMenu);
  };

  // Проверка онлайн статуса
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (connectionStatus === "disconnected") {
        setConnectionStatus("updating");
        setReconnectAttempt(0);
        reconnectDelayRef.current = 1000;
        initializeSSE();
        getChats(); // Перезагружаем данные при появлении интернета
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus("disconnected");
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [connectionStatus]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 1150);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Функция для сохранения чатов в кэш
  const saveChats = async (chatsData) => {
    try {
      await saveChatsToCache(chatsData);
    } catch (error) {
      console.error("Error saving chats to cache:", error);
    }
  };

  // Функция для загрузки чатов из кэша
  const loadCachedChats = async () => {
    try {
      const cachedChats = await getCachedChats();
      if (cachedChats && cachedChats.length > 0) {
        setChats(cachedChats);
        setHasCachedData(true);
        return true;
      }
      setHasCachedData(false);
      return false;
    } catch (error) {
      console.error("Error loading chats from cache:", error);
      setHasCachedData(false);
      return false;
    }
  };

  // Функция для переподключения с экспоненциальной задержкой
  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (reconnectAttempt >= maxReconnectAttemptsRef.current) {
      console.log("Достигнуто максимальное количество попыток переподключения");
      setConnectionStatus("error");
      return;
    }

    const delay = Math.min(
      reconnectDelayRef.current * Math.pow(1.5, reconnectAttempt),
      30000
    );

    console.log(
      `Попытка переподключения ${reconnectAttempt + 1} через ${delay}ms`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (currentUser?.id && isOnline) {
        setReconnectAttempt((prev) => prev + 1);
        initializeSSE();
      }
    }, delay);
  };

  // Инициализация SSE соединения
  const initializeSSE = () => {
    if (!currentUser?.id || !isOnline) {
      if (!isOnline) {
        setConnectionStatus("disconnected");
      }
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(
        process.env.NEXT_PUBLIC_URL_API_NODE +
          `/sse/ruset/chat/chat-list-monitor?user_id=${currentUser.id}&reconnectAttempt=${reconnectAttempt}`,
        {
          withCredentials: true,
        }
      );

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("SSE соединение установлено");
        setReconnectAttempt(0);
        reconnectDelayRef.current = 1000;
        // Не показываем обновление при подключении SSE
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
        } catch (error) {
          console.error("Ошибка парсинга SSE сообщения:", error);
        }
      };

      eventSource.addEventListener("connected", (event) => {
        try {
          const data = JSON.parse(event.data);
          setSseConnectionId(data.connectionId);
          // Скрываем статус при успешном подключении
          setConnectionStatus(null);
        } catch (error) {
          console.error("Ошибка обработки connected события:", error);
        }
      });

      eventSource.addEventListener("chat_list_update", (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.chats && Array.isArray(data.chats)) {
            setChats(data.chats);
            saveChats(data.chats);
          }
        } catch (error) {
          console.error("Ошибка обработки chat_list_update:", error);
        }
      });

      eventSource.addEventListener("new_chat", (event) => {
        try {
          const data = JSON.parse(event.data);

          setChats((prevChats) => {
            const existingChatIndex = prevChats.findIndex(
              (chat) => chat.id === data.data.id
            );
            if (existingChatIndex === -1) {
              return [data.data, ...prevChats];
            }
            return prevChats;
          });
        } catch (error) {
          console.error("Ошибка обработки new_chat:", error);
        }
      });

      eventSource.addEventListener("chat_updated", (event) => {
        try {
          const data = JSON.parse(event.data);

          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === data.data.id ? { ...chat, ...data.data } : chat
            )
          );
        } catch (error) {
          console.error("Ошибка обработки chat_updated:", error);
        }
      });

      eventSource.addEventListener("heartbeat", (event) => {
        // Подтверждение активности соединения
      });

      eventSource.onerror = (error) => {
        console.error("SSE ошибка:", error);

        if (!isOnline) {
          setConnectionStatus("disconnected");
          return;
        }

        setConnectionStatus("error");
        scheduleReconnect();
      };

      return eventSource;
    } catch (error) {
      console.error("Ошибка инициализации SSE:", error);
      setConnectionStatus("error");
      scheduleReconnect();
      return null;
    }
  };

  async function getChats() {
    if (!currentUser || isLoadingRef.current) return;

    // Сначала загружаем из кэша
    const hasCachedChats = await loadCachedChats();

    if (hasCachedChats) {
      setHasCachedData(true);
    }

    isLoadingRef.current = true;
    setLoadingChats(true);

    // Показываем обновление только в начале загрузки на 1 секунду
    setConnectionStatus("updating");
    const updateTimer = setTimeout(() => {
      if (connectionStatus === "updating") {
        setConnectionStatus(null);
      }
    }, 1000);

    try {
      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN + "/v2/ruset/getMyChats",
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

      const data = await response.json();

      if (!response.ok) {
        walert(data.status, data.message);
        if (!hasCachedChats) {
          setChats([]);
          setHasCachedData(false);
        }
        setConnectionStatus("error");
        return;
      }

      setChats(data.data);
      await saveChats(data.data);
      setHasCachedData(true);
      setConnectionStatus(null); // Скрываем статус при успешной загрузке
    } catch (error) {
      console.error("Error fetching chats:", error);
      if (!hasCachedChats) {
        setChats([]);
        setHasCachedData(false);
      }

      if (!isOnline) {
        setConnectionStatus("disconnected");
      } else {
        setConnectionStatus("error");
      }
    } finally {
      setLoadingChats(false);
      isLoadingRef.current = false;
      hasLoadedChatsRef.current = true;
      clearTimeout(updateTimer);
    }
  }

  useEffect(() => {
    cleanupOldCache();

    if (currentUser && !hasLoadedChatsRef.current) {
      getChats();
    }
  }, [currentUser]);

  // Инициализация SSE при загрузке
  useEffect(() => {
    if (currentUser?.id) {
      initializeSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(
        (chat) =>
          chat?.login?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (chat?.username &&
            chat?.username.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  // Функция для ручного переподключения
  const handleReconnect = () => {
    if (currentUser?.id && isOnline) {
      setReconnectAttempt(0);
      reconnectDelayRef.current = 1000;
      setConnectionStatus("updating");
      initializeSSE();
      getChats(); // Перезагружаем данные
    }
  };

  // Получение текста и иконки для статуса
  const getConnectionStatusInfo = () => {
    if (!connectionStatus) return null;

    switch (connectionStatus) {
      case "updating":
        return {
          text: "Обновление...",
          icon: <BiRefresh className="status-icon updating" />,
          className: "status-updating",
        };
      case "disconnected":
        return {
          text: "Ожидание сети...",
          icon: <BiWifiOff className="status-icon disconnected" />,
          className: "status-disconnected",
        };
      case "error":
        return {
          text: "Ошибка синхронизации",
          icon: <BiError className="status-icon error" />,
          className: "status-error",
        };
      default:
        return null;
    }
  };

  const statusInfo = getConnectionStatusInfo();

  // Поиск доступен когда нет статуса ошибки (скрытый статус = всё ок)
  const isSearchAvailable =
    connectionStatus === null || connectionStatus === "updating";

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    }
  };

  const getLastMessagePreview = (chat) => {
    if (!chat?.lastMessage || !chat.lastMessage.text) return "Нет сообщений";

    const { text, senderName } = chat.lastMessage;
    let preview = text;

    if (chat?.type === CHAT_TYPES.GROUP && senderName) {
      preview = `${senderName}: ${text}`;
    }

    if (preview.length > 50) {
      preview = `${preview.slice(0, 50)}...`;
    }

    return preview;
  };

  const getMessageViewsCount = (message) => {
    if (!message || message.views === undefined || message.views === null)
      return 0;
    if (typeof message.views === "object") {
      return message.views.count ?? 0;
    }
    return message.views;
  };

  const renderLastMessageStatus = (chat) => {
    const lastMessage = chat?.lastMessage;

    if (!lastMessage || chat?.type === CHAT_TYPES.CHANNEL) return null;
    if (lastMessage.user_id !== currentUser?.id) return null;

    if (
      lastMessage.sendingStatus === "uploading" ||
      lastMessage.sendingStatus === "sending" ||
      lastMessage.sendingStatus === "loading"
    ) {
      return (
        <span className="message-status sending" title="Отправка...">
          <BiTimeFive />
        </span>
      );
    }

    if (lastMessage.sendingStatus === "failed") {
      return (
        <span className="message-status failed" title="Не удалось отправить">
          <BiX />
        </span>
      );
    }

    const viewsCount = getMessageViewsCount(lastMessage);
    const isRead = Boolean(lastMessage.is_read);
    const hasDelivery = viewsCount > 0;

    if (!hasDelivery) {
      return (
        <span className="message-status telegram sent" title="Отправлено">
          <MdDone className="check first" />
        </span>
      );
    }

    return (
      <span
        className={`message-status telegram ${isRead ? "read" : "delivered"}`}
        title={isRead ? "Прочитано" : "Доставлено"}
      >
        <MdDone className="check first" />
        <MdDone className="check second" />
      </span>
    );
  };

  useEffect(() => {
    const handleLastMessageStatus = (event) => {
      const detail = event?.detail;
      if (!detail) return;

      const { chatId, messageId, isRead, viewsCount, sendingStatus } = detail;
      if (!chatId || !messageId) return;

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat?.id !== chatId) return chat;
          if (!chat.lastMessage || chat.lastMessage.id !== messageId) return chat;

          const currentViews = chat.lastMessage.views;
          const nextViews =
            viewsCount === undefined
              ? currentViews
              : typeof currentViews === "object"
              ? { ...currentViews, count: viewsCount }
              : { count: viewsCount };

          return {
            ...chat,
            lastMessage: {
              ...chat.lastMessage,
              is_read: isRead ?? chat.lastMessage.is_read,
              sendingStatus: sendingStatus ?? chat.lastMessage.sendingStatus,
              views: nextViews,
            },
          };
        })
      );
    };

    window.addEventListener("chat:lastMessageStatus", handleLastMessageStatus);

    return () =>
      window.removeEventListener(
        "chat:lastMessageStatus",
        handleLastMessageStatus
      );
  }, []);

  useEffect(() => {
    if (!selectedChatId) return;

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              unreadCount: 0,
              lastMessage: chat.lastMessage
                ? { ...chat.lastMessage, is_read: true }
                : chat.lastMessage,
            }
          : chat
      )
    );
  }, [selectedChatId]);

  // Сортировка чатов
  const sortedChats = (
    Array.isArray(filteredChats) ? [...filteredChats] : []
  ).sort((a, b) => {
    if (!a || !b) return 0;

    const aPinned = Boolean(a.is_pinned);
    const bPinned = Boolean(b.is_pinned);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    const aTime = a.lastMessage?.timestamp
      ? new Date(a.lastMessage.timestamp).getTime()
      : 0;
    const bTime = b.lastMessage?.timestamp
      ? new Date(b.lastMessage.timestamp).getTime()
      : 0;

    return bTime - aTime;
  });

  if (isMobile && selectedChatId) {
    return null;
  }

  return (
    <div
      className={`ChatList ${
        !isMobile && !isExpandedChat ? "is-no-active" : ""
      }`}
    >
      <div
        className="chat-list-header"
        onClick={() => {
          if (!isMobile && !isExpandedChat) {
            setIsExpandedChat(true);
            if (isSearchAvailable) {
              document.querySelector(".search-input").focus();
            }
          }
        }}
      >
        <button className="mobile-menu-button" onClick={toggleMenu}>
          <BiMenu />
        </button>
        {/* Блок статуса подключения - показываем только при ошибках */}
        {statusInfo && (
          <div
            className={`connection-status ${statusInfo.className} ${
              isSearchAvailable ? "is-search-available" : "is-search-disabled"
            }`}
            onClick={
              connectionStatus !== "updating" ? handleReconnect : undefined
            }
          >
            {statusInfo.icon}
            <span className="status-text">{statusInfo.text}</span>
            {(connectionStatus === "disconnected" ||
              connectionStatus === "error") && (
              <BiRefresh className="reconnect-icon" />
            )}
          </div>
        )}
        {!statusInfo && isSearchAvailable && (
          <div className="search-container">
            <BiSearch
              className="search-icon"
              onClick={(e) => {
                if (isSearchAvailable) {
                  e.target.parentNode.classList.add("is-active");
                }
              }}
            />
            <input
              type="text"
              placeholder={
                isSearchAvailable
                  ? "Поиск чатов..."
                  : "Поиск временно недоступен"
              }
              value={searchQuery}
              onChange={(e) => {
                if (isSearchAvailable) {
                  setSearchQuery(e.target.value);
                }
              }}
              className="search-input"
              disabled={!isSearchAvailable}
              onBlur={() => {
                document
                  .querySelector(".search-container")
                  .classList.contains("is-active") &&
                  document
                    .querySelector(".search-container")
                    .classList.remove("is-active");
              }}
            />
          </div>
        )}
      </div>

      <div className="chat-list-container">
        {sortedChats.length > 0 ? (
          sortedChats.map((chat) => (
            <div
              key={chat?.id}
              className={`chat-item ${
                selectedChatId === chat?.id ? "selected" : ""
              } ${chat?.is_pinned ? "is-pined" : ""}`}
              onClick={() => onChatSelect(chat)}
            >
              <div className="chat-avatar">
                <div className="ico">
                  <img
                    src={chat?.avatar}
                    alt=""
                    onError={(e) => {
                      e.target.style.opacity = "0";
                    }}
                  />
                </div>
                {chat?.type === CHAT_TYPES.PRIVATE && chat?.isOnline && (
                  <div className="online-dot"></div>
                )}
              </div>

              <div className="chat-content">
                <div className="chat-header">
                  <div className="chat-name-container">
                    <span className={`chat-name`}>{chat?.username}</span>
                    {chat?.is_pinned && <BiPin className="pinned-icon" />}
                    {chat?.is_muted && <BiVolumeMute className="muted-icon" />}
                  </div>
                  <div className="chat-time">
                    {chat?.lastMessage?.timestamp &&
                      formatTime(chat.lastMessage.timestamp)}
                  </div>
                  </div>

                  <div className="chat-footer">
                    <div className="last-message">
                      {getLastMessagePreview(chat)}
                    </div>
                    {chat?.unreadCount > 0 && (
                      <div className="unread-badge">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </div>
                    )}
                    <div className="chat-indicators">
                      {renderLastMessageStatus(chat)}
                    </div>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="is-no-chats">
            {searchQuery
              ? "Чаты не найдены"
              : loadingChats
              ? "Загрузка чатов..."
              : "У вас пока нет чатов..."}
          </div>
        )}
      </div>

      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (isSearchAvailable) {
            toggleMenuNewChats();
          }
        }}
        className={`newPeopleChat ${!isSearchAvailable ? "is-disabled" : ""}`}
      >
        <BiEditAlt></BiEditAlt>
      </a>
    </div>
  );
}
