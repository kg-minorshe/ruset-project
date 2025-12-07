"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./NewChats.scss";
import {
  BiUser,
  BiGroup,
  BiBroadcast,
  BiBot,
  BiCheck,
  BiCheckDouble,
  BiPin,
  BiVolumeMute,
  BiSearch,
  BiMenu,
  BiArrowBack,
  BiEditAlt,
  BiPhone,
  BiRefresh,
  BiCog,
  BiSearchAlt,
  BiQr,
  BiX,
  BiFilter,
  BiSort,
  BiUserPlus,
  BiHistory,
  BiBookmark,
  BiError,
  BiPlus,
  BiShare,
  BiCopy,
  BiLink,
} from "react-icons/bi";

// Импорт модалок
import CreateGroupModal from "./modals/CreateGroupModal";
import CreateChannelModal from "./modals/CreateChannelModal";
import SearchModal from "./modals/SearchModal";
import QRCodeModal from "./modals/QRCodeModal";
import InviteFriendsModal from "./modals/InviteFriendsModal";
import { httpRSCap } from "@/utils/http";
import { walert } from "@/utils/miniModal";
let Capacitor = null;
let Contacts = null;

if (typeof window !== "undefined") {
  try {
    const capacitorModule = require("@capacitor/core");
    const contactsModule = require("@capacitor-community/contacts");
    Capacitor = capacitorModule.Capacitor;
    Contacts = contactsModule.Contacts;
  } catch (error) {
    console.log("Capacitor не доступен в этой среде");
  }
}

export function NewChats({
  isExpandedNewChats,
  setIsExpandedNewChats,
  selectedChatId,
  isExpandedMenu,
  onChatSelect,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [filteredChats, setFilteredChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [filterBy, setFilterBy] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Состояния модалок
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);

  const [chatsOfficial] = useState([
    {
      id: 1,
      username: "Кирилл Гуляев",
      login: "kirill_guliaev",
      description: "Ген. директор проекта ВАЙЛТ™",
      avatar: "https://mfs.whilet.ru/s?path=/images/regular/default_ico.png",
      lastSeen: "2024-11-06T17:39:45.000000Z",
      isOnline: true,
      type: "official",
    },
    {
      id: 2,
      username: "W.BOTUS",
      login: "w_botus.b",
      description: "Бот помощник",
      avatar: "https://mfs.whilet.ru/s?path=/images/regular/default_ico.png",
      lastSeen: "2024-11-06T17:39:45.000000Z",
      isOnline: true,
      type: "bot",
    },
    {
      id: 3,
      username: "W.TECH",
      login: "w_tech",
      description: "Техническая поддержка. На связи 24.7!",
      avatar: "https://mfs.whilet.ru/s?path=/images/regular/default_ico.png",
      lastSeen: "2024-11-06T17:39:45.000000Z",
      isOnline: true,
      type: "support",
    },
    {
      id: 4,
      username: "ВАЙЛТ™",
      login: "whilet_ru.c",
      description: "Канал проекта ВАЙЛТ™",
      avatar: "https://mfs.whilet.ru/s?path=/images/regular/default_ico.png",
      lastSeen: "2024-11-06T17:39:45.000000Z",
      isOnline: false,
      type: "channel",
    },
  ]);

  // Проверка типа приложения
  const checkAppType = useCallback(() => {
    if (typeof window === "undefined") return false;

    if (Capacitor) {
      return Capacitor.isNativePlatform();
    }

    const isCapacitor = !!window.Capacitor;
    const isCordova = !!window.cordova;
    const isElectron =
      !!window.process &&
      !!window.process.versions &&
      !!window.process.versions.electron;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    return isCapacitor || isCordova || isElectron || isStandalone;
  }, []);

  const toggleMenu = useCallback(() => {
    setIsExpandedNewChats((prev) => !prev);
  }, [setIsExpandedNewChats]);

  // Сохранение поискового запроса в историю
  const saveSearchQuery = useCallback(
    (query) => {
      if (query.trim() && !recentSearches.includes(query.trim())) {
        const newSearches = [query.trim(), ...recentSearches.slice(0, 4)];
        setRecentSearches(newSearches);
        localStorage.setItem("recentSearches", JSON.stringify(newSearches));
      }
    },
    [recentSearches]
  );

  // Загрузка истории поиска
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Очистка истории поиска
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!Contacts || !Capacitor || !Capacitor.isNativePlatform()) {
      console.log("Плагин контактов не доступен или не на нативной платформе");
      return;
    }

    setIsLoading(true);
    setPermissionsRequested(true);
    setError(null);

    try {
      let currentStatus;
      try {
        currentStatus = await Contacts.checkPermissions();
        setPermissionStatus(currentStatus.contacts);
      } catch (checkError) {
        if (
          checkError.message &&
          checkError.message.includes("Not implemented on web")
        ) {
          console.warn(
            "Проверка разрешений не поддерживается в этой среде (web).",
            checkError
          );
          setPermissionStatus("denied");
          setIsLoading(false);
          return;
        } else {
          throw checkError;
        }
      }

      if (currentStatus.contacts === "denied") {
        console.log("Доступ к контактам запрещен пользователем");
        setIsLoading(false);
        return;
      }

      let permission;
      try {
        permission = await Contacts.requestPermissions();
        setPermissionStatus(permission.contacts);
      } catch (requestError) {
        if (
          requestError.message &&
          requestError.message.includes("Not implemented on web")
        ) {
          console.warn(
            "Запрос разрешений не поддерживается в этой среде (web).",
            requestError
          );
          setPermissionStatus("denied");
          setIsLoading(false);
          return;
        } else {
          throw requestError;
        }
      }

      if (permission.contacts !== "granted") {
        console.log(
          "Пользователь отказал в доступе к контактам или доступ не предоставлен"
        );
        setIsLoading(false);
        return;
      }

      let result;
      try {
        result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
            emails: true,
            image: true,
          },
        });
      } catch (getContactsError) {
        if (
          getContactsError.message &&
          getContactsError.message.includes("Not implemented on web")
        ) {
          console.warn(
            "Получение контактов не поддерживается в этой среде (web).",
            getContactsError
          );
          setIsLoading(false);
          return;
        } else {
          throw getContactsError;
        }
      }

      if (result && Array.isArray(result.contacts)) {
        const formattedContacts = result.contacts
          .filter((contact) => contact.name?.display)
          .map((contact, index) => ({
            id: `contact_${index}`,
            username: contact.name?.display || "Без имени",
            login:
              contact.phones?.[0]?.number || contact.emails?.[0]?.address || "",
            description:
              contact.phones?.[0]?.number ||
              contact.emails?.[0]?.address ||
              "Нет контактов",
            avatar: contact.image?.base64String
              ? `data:image/jpeg;base64,${contact.image.base64String}`
              : null,
            lastSeen: new Date().toISOString(),
            isContact: true,
            isOnline: Math.random() > 0.7,
            type: "contact",
          }))
          .sort((a, b) => a.username.localeCompare(b.username));

        setContacts(formattedContacts);
        setRetryCount(0);
      } else {
        console.warn(
          "Неожиданный формат результата от Contacts.getContacts",
          result
        );
        setError("Неожиданный формат данных контактов");
      }
    } catch (error) {
      console.error("Ошибка при получении контактов:", error);
      setError("Ошибка при загрузке контактов");
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  }, [Contacts, Capacitor, retryCount]);

  // Повторная попытка загрузки контактов
  const retryFetchContacts = useCallback(() => {
    if (retryCount < 3) {
      fetchContacts();
    }
  }, [fetchContacts, retryCount]);

  // Проверка разрешений при загрузке
  useEffect(() => {
    const checkPermissions = async () => {
      if (Contacts && Capacitor && Capacitor.isNativePlatform()) {
        try {
          const status = await Contacts.checkPermissions();
          setPermissionStatus(status.contacts);
        } catch (error) {
          if (
            error.message &&
            error.message.includes("Not implemented on web")
          ) {
            console.log("Проверка разрешений недоступна в web");
            setPermissionStatus("denied");
          } else {
            console.error("Ошибка при проверке разрешений:", error);
          }
        }
      }
    };

    checkPermissions();
  }, [Contacts, Capacitor]);

  // Проверка типа приложения и мобильного устройства
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 1150);
    };

    const appType = checkAppType();
    setIsNativeApp(appType);

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, [checkAppType]);

  // Улучшенная фильтрация и сортировка чатов
  const processedChats = useMemo(() => {
    let allChats = [...chatsOfficial, ...contacts];

    // Фильтрация по типу
    if (filterBy !== "all") {
      allChats = allChats.filter((chat) => {
        switch (filterBy) {
          case "online":
            return chat.isOnline;
          case "contacts":
            return chat.isContact;
          case "official":
            return !chat.isContact;
          default:
            return true;
        }
      });
    }

    // Поиск
    if (searchQuery.trim()) {
      allChats = allChats.filter(
        (chat) =>
          chat?.login?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat?.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Сортировка
    allChats.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.username.localeCompare(b.username);
        case "recent":
          return new Date(b.lastSeen) - new Date(a.lastSeen);
        case "online":
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return a.username.localeCompare(b.username);
        default:
          return 0;
      }
    });

    return allChats;
  }, [chatsOfficial, contacts, searchQuery, sortBy, filterBy]);

  // Форматирование времени
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;

    if (diffInHours < 1) {
      return "сейчас";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    }
  }, []);

  // Открытие настроек приложения
  const openAppSettings = useCallback(async () => {
    if (Capacitor && Capacitor.isPluginAvailable("App")) {
      const { App } = require("@capacitor/app");
      await App.openUrl("app-settings:");
    }
  }, []);

  // Обработка поиска
  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      if (query.trim()) {
        saveSearchQuery(query);
      }
    },
    [saveSearchQuery]
  );

  // Получение иконки для типа чата
  const getChatTypeIcon = useCallback((chat) => {
    if (chat.type === "bot") return <BiBot className="chat-type-icon" />;
    if (chat.type === "channel")
      return <BiBroadcast className="chat-type-icon" />;
    if (chat.type === "support") return <BiCog className="chat-type-icon" />;
    return null;
  }, []);

  // Обработчики создания чатов
  const handleCreateGroup = useCallback(async (groupData) => {
    try {
      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN + "/v2/ruset/new/createGroup",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Origin: "https://whilet.ru",
            Referer: "https://whilet.ru",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(groupData),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        walert(data.status, "Не удалось создать группу", data.message);
      }
    } catch (error) {
      console.error("Не удалось создать группу:", error);
      walert(500, "Не удалось создать группу", error);
    }
    setShowCreateGroupModal(false);
  }, []);

  const handleCreateChannel = useCallback(async (channelData) => {
    try {
      const response = await httpRSCap(
        process.env.NEXT_PUBLIC_URL_API_MAIN + "/v2/ruset/new/createChannel",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Origin: "https://whilet.ru",
            Referer: "https://whilet.ru",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(channelData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        walert(data.status, "Не удалось создать канал", data.message);
      }
    } catch (error) {
      console.error("Не удалось создать канал:", error);
      walert(500, "Не удалось создать канал", error);
    }
    setShowCreateChannelModal(false);
  }, []);

  const handleSearchUser = useCallback((searchData) => {
    console.log("Поиск пользователя:", searchData);
    // Здесь будет API вызов для поиска
    setShowSearchModal(false);
  }, []);

  const handleInviteFriends = useCallback((inviteData) => {
    console.log("Приглашение друзей:", inviteData);
    // Здесь будет логика приглашения
    setShowInviteFriendsModal(false);
  }, []);

  if (isMobile && selectedChatId) {
    return null;
  }

  return (
    <>
      <div
        className={`NewChats ${isExpandedNewChats ? "is-active" : ""} ${
          isExpandedMenu ? "is-width" : ""
        }`}
      >
        <div className="chat-list-header">
          <button className="mobile-menu-button" onClick={toggleMenu}>
            <BiArrowBack />
          </button>
          <div className="search-container">
            <BiSearch
              className="search-icon"
              onClick={(e) => {
                e.currentTarget.parentNode.classList.add("is-active");
              }}
            />
            <input
              type="text"
              placeholder="Поиск контактов..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
              onBlur={(e) => {
                if (
                  e.target.parentElement?.classList.contains("is-active") &&
                  !searchQuery
                ) {
                  e.target.parentElement.classList.remove("is-active");
                }
              }}
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={(e) => {
                  setSearchQuery("");
                  e.currentTarget.parentNode.classList.remove("is-active");
                }}
              >
                <BiX />
              </button>
            )}
          </div>
          <button
            className="filter-button"
            onClick={() => setShowFilters(!showFilters)}
            title="Фильтры и сортировка"
          >
            <BiFilter />
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>Сортировка:</label>
              <div className="select">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">По имени</option>
                  <option value="recent">По активности</option>
                  <option value="online">Сначала онлайн</option>
                </select>
              </div>
            </div>
            <div className="filter-group">
              <label>Фильтр:</label>
              <div className="select">
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                >
                  <option value="all">Все</option>
                  <option value="online">Только онлайн</option>
                  <option value="contacts">Контакты</option>
                  <option value="official">Официальные</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="action-buttons">
          <div
            className="is-line"
            onClick={() => setShowCreateGroupModal(true)}
          >
            <BiGroup /> Новая группа
          </div>
          <div
            className="is-line"
            onClick={() => setShowCreateChannelModal(true)}
          >
            <BiBroadcast /> Новый канал
          </div>
          <div className="is-line" onClick={() => setShowSearchModal(true)}>
            <BiSearchAlt /> Найти по номеру или логину
          </div>
          <div className="is-line" onClick={() => setShowQRCodeModal(true)}>
            <BiQr /> Пригласить по QR коду
          </div>
          <div
            className="is-line"
            onClick={() => setShowInviteFriendsModal(true)}
          >
            <BiUserPlus /> Пригласить друзей
          </div>
        </div>

        {isNativeApp && Contacts && (
          <div className="contact-permission-section">
            {error && (
              <div className="error-message">
                <BiError />
                <span>{error}</span>
                {retryCount < 3 && (
                  <button onClick={retryFetchContacts} className="retry-button">
                    <BiRefresh />
                  </button>
                )}
              </div>
            )}
            {permissionStatus === "denied" ? (
              <div className="permission-denied" onClick={openAppSettings}>
                <BiCog /> Доступ к контактам запрещен. Нажмите, чтобы открыть
                настройки
              </div>
            ) : isLoading ? (
              <div className="is-line">
                <BiRefresh className="spinning" /> Загрузка контактов...
              </div>
            ) : (
              <div
                className="is-line"
                onClick={fetchContacts}
                style={{ cursor: "pointer" }}
              >
                <BiUser />{" "}
                {permissionsRequested
                  ? "Обновить контакты"
                  : "Загрузить контакты"}
              </div>
            )}
          </div>
        )}

        <div className="chat-list-container">
          {processedChats.length > 0 ? (
            <>
              {/* Официальные аккаунты */}
              {processedChats.some((chat) => !chat.isContact) && (
                <>
                  <h4>
                    Официальные аккаунты (
                    {processedChats.filter((chat) => !chat.isContact).length})
                  </h4>
                  {processedChats
                    .filter((chat) => !chat.isContact)
                    .map((chat) => (
                      <div
                        key={chat?.id}
                        className={`chat-item ${
                          selectedChatId === chat?.id ? "selected" : ""
                        }`}
                        onClick={() => onChatSelect?.(chat)}
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
                          {chat?.isOnline && <div className="online-dot"></div>}
                        </div>

                        <div className="chat-content">
                          <div className="chat-header">
                            <div className="chat-name-container">
                              <span className="chat-name">
                                {chat?.username}
                              </span>
                              {getChatTypeIcon(chat)}
                              {chat?.is_pinned && (
                                <BiPin className="pinned-icon" />
                              )}
                              {chat?.is_muted && (
                                <BiVolumeMute className="muted-icon" />
                              )}
                            </div>
                            <div className="chat-time">
                              {formatTime(chat?.lastSeen)}
                            </div>
                          </div>

                          <div className="chat-footer">
                            <div className="last-message">
                              {chat?.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </>
              )}

              {/* Контакты */}
              {processedChats.some((chat) => chat.isContact) && (
                <>
                  <h4>
                    Контакты (
                    {processedChats.filter((chat) => chat.isContact).length})
                  </h4>
                  {processedChats
                    .filter((chat) => chat.isContact)
                    .map((chat) => (
                      <div
                        key={chat?.id}
                        className={`chat-item ${
                          selectedChatId === chat?.id ? "selected" : ""
                        }`}
                        onClick={() => onChatSelect?.(chat)}
                      >
                        <div className="chat-avatar">
                          <div className="ico">
                            {chat?.avatar ? (
                              <img
                                src={chat?.avatar}
                                alt=""
                                onError={(e) => {
                                  e.target.style.opacity = "0";
                                }}
                              />
                            ) : (
                              <div className="default-avatar">
                                <BiUser />
                              </div>
                            )}
                          </div>
                          {chat?.isOnline && <div className="online-dot"></div>}
                        </div>

                        <div className="chat-content">
                          <div className="chat-header">
                            <div className="chat-name-container">
                              <span className="chat-name">
                                {chat?.username}
                              </span>
                              {chat?.is_pinned && (
                                <BiPin className="pinned-icon" />
                              )}
                              {chat?.is_muted && (
                                <BiVolumeMute className="muted-icon" />
                              )}
                            </div>
                            <div className="chat-time">
                              {formatTime(chat?.lastSeen)}
                            </div>
                          </div>

                          <div className="chat-footer">
                            <div className="last-message">
                              {chat?.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </>
          ) : (
            <div className="is-no-chats">
              {isLoading ? (
                "Загрузка..."
              ) : searchQuery ? (
                <>
                  <BiSearch />
                  <p>Ничего не найдено по запросу "{searchQuery}"</p>
                  <small>Попробуйте изменить запрос или очистить фильтры</small>
                </>
              ) : (
                <>
                  {isNativeApp
                    ? permissionStatus === "granted"
                      ? "Контакты не найдены"
                      : "Разрешите доступ к контактам"
                    : "Контакты доступны только в мобильном приложении"}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onSubmit={handleCreateGroup}
          contacts={isNativeApp ? contacts : chatsOfficial}
        />
      )}

      {showCreateChannelModal && (
        <CreateChannelModal
          isOpen={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
          onSubmit={handleCreateChannel}
        />
      )}

      {showSearchModal && (
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSubmit={handleSearchUser}
          onChatSelect={onChatSelect}
        />
      )}

      {showQRCodeModal && (
        <QRCodeModal
          isOpen={showQRCodeModal}
          onClose={() => setShowQRCodeModal(false)}
        />
      )}

      {showInviteFriendsModal && (
        <InviteFriendsModal
          isOpen={showInviteFriendsModal}
          onClose={() => setShowInviteFriendsModal(false)}
          onSubmit={handleInviteFriends}
        />
      )}
    </>
  );
}
