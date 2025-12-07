"use client";
import { useMenuState, useDeviceDetection, useTheme } from "./hooks";
import {
  MenuToggleButton,
  MenuButton,
  ThemeToggleButton,
  Logo,
  BackgroundOverlay,
} from "./ui";
import { BiChat, BiUser, BiPlus, BiGift } from "react-icons/bi";
import { MENU_ITEMS } from "./constants";

export function LeftPanelContainer({
  setUserProfile,
  setSelectedChat,
  isExpandedMenu,
  setIsExpandedMenu,
  setIsExpandedNewChats,
  isExpandedNewChats,
  isExpandedChat,
  setIsExpandedChat,
  setIsExpandedProfile,
  isExpandedProfile,
  setIsExpandedGift,
  isExpandedGift,
  currentUser,
  onUserUpdate,
}) {
  const isMobile = useDeviceDetection();
  const { isDarkTheme, toggleTheme } = useTheme();

  const { updateMenuState, toggleMenuState } = useMenuState({
    isExpandedMenu,
    isExpandedChat,
    isExpandedProfile,
    isExpandedNewChats,
    isExpandedGift,
  });

  const handleChatClick = () => {
    const newChatState = !isExpandedChat;
    updateMenuState("isExpandedChat", newChatState);
    setIsExpandedChat(newChatState);
    updateMenuState("isExpandedNewChats", false);
    setIsExpandedNewChats(false);
  };

  const handleProfileClick = () => {
    const newProfileState = !isExpandedProfile;
    updateMenuState("isExpandedProfile", newProfileState);
    setIsExpandedProfile(newProfileState);

    if (newProfileState) {
      setTimeout(() => {
        setUserProfile?.(null);
      }, 100);
    }
  };

  const handleNewChatClick = () => {
    const newNewChatsState = !isExpandedNewChats;
    updateMenuState("isExpandedNewChats", newNewChatsState);
    setIsExpandedNewChats(newNewChatsState);
    setSelectedChat?.(false);
  };

  const handleGiftClick = () => {
    const newGiftState = !isExpandedGift;
    updateMenuState("isExpandedGift", newGiftState);
    setIsExpandedGift(newGiftState);
  };

  const handleMenuToggle = () => {
    const newMenuState = !isExpandedMenu;
    toggleMenuState("isExpandedMenu");
    setIsExpandedMenu(newMenuState);
  };

  const handleOverlayClick = () => {
    updateMenuState("isExpandedMenu", false);
    setIsExpandedMenu(false);
  };

  const menuItems = [
    {
      id: MENU_ITEMS.CHAT,
      component: !isMobile && (
        <MenuButton
          key={MENU_ITEMS.CHAT}
          onClick={handleChatClick}
          title="Чаты"
          icon={<BiChat />}
          text="Чаты"
          isActive={isExpandedChat}
          className="is-chat"
        />
      ),
    },
    {
      id: MENU_ITEMS.PROFILE,
      component: (
        <MenuButton
          key={MENU_ITEMS.PROFILE}
          onClick={handleProfileClick}
          title="Профиль"
          icon={<BiUser />}
          text="Профиль"
        />
      ),
    },
    {
      id: MENU_ITEMS.NEW_CHAT,
      component: (
        <MenuButton
          key={MENU_ITEMS.NEW_CHAT}
          onClick={handleNewChatClick}
          title="Создать чат"
          icon={<BiPlus />}
          text="Создать чат"
        />
      ),
    },
    {
      id: MENU_ITEMS.GIFT,
      component: (
        <MenuButton
          key={MENU_ITEMS.GIFT}
          onClick={handleGiftClick}
          title="Premium подписка"
          icon={<BiGift />}
          text="Premium подписка"
        />
      ),
    },
    {
      id: MENU_ITEMS.THEME,
      component: (
        <ThemeToggleButton
          key={MENU_ITEMS.THEME}
          isDarkTheme={isDarkTheme}
          onToggle={toggleTheme}
          isExpanded={isExpandedMenu}
        />
      ),
    },
    {
      id: MENU_ITEMS.SUPPORT,
      component: (
        <MenuButton
          key={MENU_ITEMS.SUPPORT}
          onClick={() => {}}
          title="Тех. поддержка"
          icon={<BiChat />}
          text="Тех. поддержка"
        />
      ),
    },
  ];

  return (
    <>
      <div className={`LeftPanel ${isExpandedMenu ? "is-width" : ""}`}>
        <ul>
          <MenuToggleButton
            isExpanded={isExpandedMenu}
            onToggle={handleMenuToggle}
          />

          {menuItems.map((item, index) => (
            <div key={item.id}>
              {item.component}
              {index ===
                menuItems.findIndex((item) => item.id === MENU_ITEMS.THEME) && (
                <hr />
              )}
            </div>
          ))}
        </ul>

        <Logo />
      </div>

      <BackgroundOverlay
        isActive={isExpandedMenu}
        onClick={handleOverlayClick}
      />
    </>
  );
}
