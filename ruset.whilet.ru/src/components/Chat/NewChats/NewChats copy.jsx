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
} from "react-icons/bi";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  const [chatsOfficial] = useState([
    {
      id: 1,
      username: "Кирилл Гуляев",
      login: "kirill_guliaev",
      description: "Ген. директор проекта ВАЙЛТ™",
      avatar:
        "https://mfs.whilet.ru/u?path=/jul_avatar - 24.12.23 - 1703444914 - 369613.jpg&size=150x150",
      lastSeen: "2024-11-06T17:39:45.000000Z",
    },
    {
      id: 2,
      username: "W.BOTUS",
      login: "w_botus",
      description: "Бот помощник",
      avatar:
        "https://mfs.whilet.ru/u?path=/jul_avatar - 24.12.23 - 1703444914 - 369613.jpg&size=150x150",
      lastSeen: "2024-11-06T17:39:45.000000Z",
    },
    {
      id: 3,
      username: "W.TECH",
      login: "w_tech",
      description: "Техническая поддержка. На связи 24.7!",
      avatar:
        "https://mfs.whilet.ru/u?path=/jul_avatar - 24.12.23 - 1703444914 - 369613.jpg&size=150x150",
      lastSeen: "2024-11-06T17:39:45.000000Z",
    },
    {
      id: 4,
      username: "ВАЙЛТ™",
      login: "whilet_ru",
      description: "Канал проекта ВАЙЛТ™",
      avatar:
        "https://mfs.whilet.ru/u?path=/jul_avatar - 24.12.23 - 1703444914 - 369613.jpg&size=150x150",
      lastSeen: "2024-11-06T17:39:45.000000Z",
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

  const fetchContacts = useCallback(async () => {
    // Ensure Capacitor and Contacts are available and it's a native platform
    if (!Contacts || !Capacitor || !Capacitor.isNativePlatform()) {
      console.log("Плагин контактов не доступен или не на нативной платформе");
      // Optionally, set a state to inform the UI that contacts aren't available on web
      // setIsContactsAvailable(false);
      return;
    }

    setIsLoading(true);
    setPermissionsRequested(true);

    try {
      let currentStatus;
      try {
        // Try to check permissions
        currentStatus = await Contacts.checkPermissions();
        setPermissionStatus(currentStatus.contacts);
      } catch (checkError) {
        // Catch specific "Not implemented" error or let it bubble up
        if (
          checkError.message &&
          checkError.message.includes("Not implemented on web")
        ) {
          console.warn(
            "Проверка разрешений не поддерживается в этой среде (web).",
            checkError
          );
          // Treat as if we can't determine permission, maybe skip requesting?
          // Or assume denied for web context if appropriate
          setPermissionStatus("denied");
          setIsLoading(false);
          return;
        } else {
          throw checkError; // Re-throw if it's a different error
        }
      }

      if (currentStatus.contacts === "denied") {
        console.log("Доступ к контактам запрещен пользователем");
        setIsLoading(false);
        return;
      }

      let permission;
      try {
        // Try to request permissions
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
          // Treat as denied or unavailable
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
        // Try to get contacts
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

      // Process the contacts if successfully retrieved
      if (result && Array.isArray(result.contacts)) {
        const formattedContacts = result.contacts.map((contact, index) => ({
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
            : null, // Use null or a default image URL
          lastSeen: new Date().toISOString(),
          isContact: true,
        }));

        setContacts(formattedContacts);
      } else {
        console.warn(
          "Неожиданный формат результата от Contacts.getContacts",
          result
        );
      }
    } catch (error) {
      // Handle any other unexpected errors during the process
      console.error("Ошибка при получении контактов:", error);
      // Optionally, show an error message to the user
    } finally {
      setIsLoading(false);
    }
  }, [Contacts, Capacitor]);

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
            console.log(
              "Проверка разрешений недоступна в web (ожидаемо, если isNativePlatform не сработал корректно)."
            );
            setPermissionStatus("denied"); // Or 'unavailable'
          } else {
            console.error("Ошибка при проверке разрешений:", error);
          }
        }
      } else {
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

  // Фильтрация чатов
  useEffect(() => {
    const allChats = [...chatsOfficial, ...contacts];

    if (searchQuery.trim() === "") {
      setFilteredChats(allChats);
    } else {
      const filtered = allChats.filter(
        (chat) =>
          (chat?.login?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (chat?.username &&
              chat?.username
                .toLowerCase()
                .includes(searchQuery.toLowerCase()))) &&
          chat
      );
      setFilteredChats(filtered);
    }
  }, [searchQuery, contacts, chatsOfficial]);

  // Форматирование времени
  const formatTime = useCallback((timestamp) => {
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
  }, []);

  // Открытие настроек приложения
  const openAppSettings = useCallback(async () => {
    if (Capacitor && Capacitor.isPluginAvailable("App")) {
      const { App } = require("@capacitor/app");
      await App.openUrl("app-settings:");
    }
  }, []);

  if (isMobile && selectedChatId) {
    return null;
  }

  return (
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
              e.target.parentNode.classList.add("is-active");
            }}
          />
          <input
            type="text"
            placeholder="Поиск контактов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            onBlur={(e) => {
              if (e.target.parentElement?.classList.contains("is-active")) {
                e.target.parentElement.classList.remove("is-active");
              }
            }}
          />
        </div>
      </div>

      <div className="is-line">
        <BiGroup /> Новая группа
      </div>
      <div className="is-line">
        <BiBroadcast /> Новый канал
      </div>
      <div className="is-line">
        <BiSearchAlt /> Найти по номеру или логину
      </div>
      <div className="is-line">
        <BiQr /> Пригласить по QR коду
      </div>

      {isNativeApp && Contacts && (
        <div className="contact-permission-section">
          {permissionStatus === "denied" ? (
            <div className="permission-denied" onClick={openAppSettings}>
              <BiCog /> Доступ к контактам запрещен. Нажмите, чтобы открыть
              настройки
            </div>
          ) : isLoading ? (
            <div className="is-line">
              <BiRefresh /> Загрузка контактов...
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

      <div className="chat-list-container is-0">
        <h4>Официальные аккаунты</h4>
        {chatsOfficial.length > 0 ? (
          chatsOfficial.map((chat) => (
            <div
              key={chat?.id}
              className={`chat-item`}
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
                    <span className={`chat-name`}>{chat?.username}</span>
                    {chat?.is_pinned && <BiPin className="pinned-icon" />}
                    {chat?.is_muted && <BiVolumeMute className="muted-icon" />}
                  </div>
                </div>

                <div className="chat-footer">
                  <div className="last-message">
                    {chat?.description || formatTime(chat?.lastSeen)}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="is-no-chats">
            {searchQuery ? "Чаты не найдены" : "У вас пока нет чатов..."}
          </div>
        )}
      </div>

      <div className="chat-list-container">
        {isNativeApp && <h4>Контакты</h4>}
        {isLoading ? (
          <div className="is-no-chats">Загрузка контактов...</div>
        ) : filteredChats.length > 0 ? (
          filteredChats
            .filter(
              (chat) =>
                !chatsOfficial.some((official) => official.id === chat.id)
            )
            .map((chat) => (
              <div
                key={chat?.id}
                className={`chat-item`}
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
                      <span className={`chat-name`}>{chat?.username}</span>
                      {chat?.is_pinned && <BiPin className="pinned-icon" />}
                      {chat?.is_muted && (
                        <BiVolumeMute className="muted-icon" />
                      )}
                    </div>
                  </div>

                  <div className="chat-footer">
                    <div className="last-message">
                      {chat?.description || formatTime(chat?.lastSeen)}
                    </div>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="is-no-chats">
            {searchQuery
              ? "Ничего не найдено..."
              : isNativeApp
              ? permissionStatus === "granted"
                ? "Контакты не найдены"
                : "Разрешите доступ к контактам"
              : "Контакты доступны только в мобильном приложении"}
          </div>
        )}
      </div>
    </div>
  );
}
