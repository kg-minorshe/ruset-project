import React from "react";
import { useState, useCallback } from "react";
import {
  BiPin,
  BiSearch,
  BiTrash,
  BiBlock,
  BiDotsHorizontalRounded,
  BiArrowBack,
} from "react-icons/bi";
import { formatCount } from "@/utils/formatting";
import { getOnlineStatus } from "@/utils/chat";

const DefaultHeader = ({
  chatInfo,
  currentUser,
  setUserProfile,
  searchMode,
  setSearchMode,
  pinnedMessages,
  showPinnedDropdown,
  setShowPinnedDropdown,
  dropdownRef,
  handlePinnedClick,
  deleteAllChat,
  setSelectedChat,
  statusText,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const closeMenu = () => setIsMenuOpen(false);

  const getUsername = (msg) => {
    if (currentUser.id === msg.user_id) return "Вы";
    const participant = chatInfo?.participants.find(
      (p) => p.id === msg.user_id
    );
    return participant?.username || "Неизвестный";
  };

  const handleProfileClick = () => {
    if (chatInfo?.username) {
      setUserProfile({
        username: chatInfo?.username,
        login: chatInfo?.login,
        avatar: chatInfo?.avatar,
        description: chatInfo?.description,
        participants_count: chatInfo?.participants_count,
      });
    }
  };

  // Загрузка аватара
  const handleImageLoad = useCallback(() => {
    setImgLoaded(true);
    setImgError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImgError(true);
    setImgLoaded(false);
  }, []);

  return (
    <>
      <div className="backAccountBox">
        <div className="back" onClick={() => setSelectedChat(null)}>
          <BiArrowBack />
        </div>

        <div className="account" onClick={handleProfileClick}>
          <div className="left">
            <div className="ico">
              <img
                src={
                  imgError
                    ? "/assets/images/default-avatar.png"
                    : chatInfo?.avatar
                }
                style={{ opacity: imgLoaded ? 1 : 0 }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                alt=""
              />
            </div>
          </div>
          <div className="right">
            <div className="name">
              {chatInfo?.username}
              {chatInfo?.verification && (
                <img
                  src="/assets/images/miniIco/blueCheck.png"
                  title="Аккаунт верифицированный"
                  alt=""
                />
              )}
            </div>
            <div className="timeStatus">
              {statusText
                ? statusText
                : chatInfo?.type === "private"
                ? chatInfo.isOnline
                  ? "в сети"
                  : getOnlineStatus(chatInfo)
                : formatCount(chatInfo?.participants_count, chatInfo?.type)}
            </div>
          </div>
        </div>
      </div>

      <div className="otherButtons">
        <div className="pinned-dropdown" ref={dropdownRef}>
          {pinnedMessages.length > 0 && (
            <div
              className={`pinned-toggle has-pinned ${
                showPinnedDropdown ? "open" : ""
              }`}
              onClick={() => setShowPinnedDropdown((prev) => !prev)}
            >
              <BiPin />
              <span className="pinned-count">{pinnedMessages.length}</span>
            </div>
          )}

          {showPinnedDropdown && (
            <div className="pinned-messages-dropdown">
              {pinnedMessages.length > 0 ? (
                pinnedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="pinned-message-item"
                    onClick={() => handlePinnedClick(msg.id)}
                  >
                    <div className="pinned-message-header">
                      <BiPin className="pin-icon" />
                      <div className="pinned-message-author">
                        {msg.sender === "me" ? "Вы" : getUsername(msg)}
                      </div>
                    </div>
                    <div className="pinned-message-text">
                      {msg.text?.length > 60
                        ? `${msg.text.slice(0, 60)}...`
                        : msg.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-pinned">Нет закрепленных сообщений</div>
              )}
            </div>
          )}
        </div>

        <div className={`is-dotted-menu ${isMenuOpen ? "is-active" : ""}`}>
          <span
            onClick={() => {
              setSearchMode(!searchMode);
              closeMenu();
            }}
          >
            <BiSearch />
          </span>
          <span
            onClick={() => {
              deleteAllChat();
              closeMenu();
            }}
          >
            <BiTrash />
          </span>
          <span
            onClick={() => {
              console.log("Пользователь заблокирован");
              closeMenu();
            }}
          >
            <BiBlock />
          </span>
        </div>

        <span className="is-dots" onClick={toggleMenu}>
          <BiDotsHorizontalRounded />
        </span>
      </div>
    </>
  );
};

export default React.memo(DefaultHeader);
