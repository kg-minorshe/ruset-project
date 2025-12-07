"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { LeftPanel } from "@/components/LeftPanel/LeftPanel";
import { ChatComponent } from "@/components/Chat/ChatComponent/ChatComponent";
import { ChatList } from "@/components/Chat/ChatList/ChatList";
import { UserProfile } from "@/components/UserProfile/UserProfile";
import { FullscreenViewer } from "@/components/FullscreenViewer/FullscreenViewer";
import { App } from "@capacitor/app";
import "../page.scss";
import { httpRSCap } from "@/utils/http";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpandedMenu, setIsExpandedMenu] = useState(false);
  const [isExpandedChat, setIsExpandedChat] = useState(true);
  const [isExpandedProfile, setIsExpandedProfile] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [fullscreenData, setFullscreenData] = useState(null);
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState();

  const CHAT_TYPES = {
    PRIVATE: "private",
    GROUP: "group",
    CHANNEL: "channel",
    BOT: "bot",
  };

  const USER_ROLES = {
    OWNER: "owner",
    ADMIN: "admin",
    MODERATOR: "moderator",
    MEMBER: "member",
    SUBSCRIBER: "subscriber",
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  async function getCurrentUser() {
    const response = await httpRSCap(
      process.env.NEXT_PUBLIC_URL_API_MAIN + "/v2/ruset/chat/getCurrentUser",
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

    setCurrentUser(data.data);
  }

  useEffect(() => {
    const rootElement = document.documentElement;
    const savedTheme = localStorage.getItem("w|theme");

    if (savedTheme) {
      rootElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const defaultTheme = prefersDark ? "dark" : "light";

      rootElement.setAttribute("data-theme", defaultTheme);
      localStorage.setItem("w|theme", defaultTheme);
    }

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Обработка URL параметров для открытия чата
  useEffect(() => {
    const userParam = searchParams.get("user");

    if (userParam) {
      // Здесь должна быть логика поиска чата по логину
      // Пока используем моковые данные
      const mockChat = {
        id: 1,
        username: "Кирилл Гуляев",
        login: userParam,
        avatar: "/assets/images/6319443853.jpg",
        type: CHAT_TYPES.PRIVATE,
        lastMessage: "Hello there!",
        timestamp: new Date().toISOString(),
        unreadCount: 0,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };

      setSelectedChat(mockChat);

      if (isMobile) {
        setIsExpandedMenu(false);
      }
    }
  }, []);

  const onChatSelect = (chat) => {
    setSelectedChat(chat);
    const newUrl = `/c?user=${chat.login}`;
    router.replace(newUrl, undefined, { shallow: true });
    //  window.history.replaceState(null, "", newUrl);
    if (isMobile) {
      setIsExpandedMenu(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setIsExpandedProfile(true);
    }
  }, [userProfile]);

  useEffect(() => {
    let backButtonListener;

    const setupListener = async () => {
      backButtonListener = await App.addListener("backButton", (event) => {
        if (fullscreenData) {
          setFullscreenData(null);
          return;
        }
        if (isExpandedMenu) {
          setIsExpandedMenu(false);
          return;
        }
        if (isExpandedChat) {
          setIsExpandedChat(false);
          return;
        }
        if (isExpandedProfile) {
          setIsExpandedProfile(false);
          return;
        }
        if (userProfile) {
          setUserProfile(null);
          return;
        }
        if (selectedChat) {
          setSelectedChat(null);
          return;
        }

        if (event.canGoBack === false) {
          App.exitApp();
        }
      });
    };

    setupListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [
    isExpandedProfile,
    isExpandedMenu,
    isExpandedChat,
    selectedChat,
    userProfile,
    fullscreenData,
  ]);

  return (
    <>
      <div className="line">
        <a href="https://ruset.whilet.ru">RuSet</a>
      </div>
      <div className="FlexContainer">
        <LeftPanel
          isExpandedMenu={isExpandedMenu}
          setIsExpandedMenu={setIsExpandedMenu}
          isExpandedChat={isExpandedChat}
          setIsExpandedChat={setIsExpandedChat}
          setIsExpandedProfile={setIsExpandedProfile}
          isExpandedProfile={isExpandedProfile}
          setUserProfile={setUserProfile}
        />

        <UserProfile
          isExpandedProfile={isExpandedProfile}
          setIsExpandedProfile={setIsExpandedProfile}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />

        <ChatList
          onChatSelect={onChatSelect}
          selectedChatId={selectedChat?.id}
          currentUser={currentUser}
          isExpandedMenu={isExpandedMenu}
          setIsExpandedMenu={setIsExpandedMenu}
          isExpandedChat={isExpandedChat}
          setIsExpandedChat={setIsExpandedChat}
          CHAT_TYPES={CHAT_TYPES}
          setFullscreenData={setFullscreenData}
        />

        {selectedChat ? (
          <ChatComponent
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            isExpandedMenu={isExpandedMenu}
            setIsExpandedMenu={setIsExpandedMenu}
            chatData={selectedChat}
            setSelectedChat={setSelectedChat}
            isExpandedChat={isExpandedChat}
            setIsExpandedChat={setIsExpandedChat}
            CHAT_TYPES={CHAT_TYPES}
            USER_ROLES={USER_ROLES}
            setUserProfile={setUserProfile}
            setFullscreenData={setFullscreenData}
          />
        ) : (
          <div
            className={`no-chat-selected ${isExpandedMenu ? "is-active" : ""} ${
              !isMobile ? (!isExpandedChat ? "is-active-2" : "") : ""
            }`}
          >
            <div className="no-chat-content">
              <p>Выберите, кому хотели бы написать</p>
            </div>
          </div>
        )}

        {fullscreenData && (
          <FullscreenViewer
            media={fullscreenData.media}
            currentIndex={fullscreenData.currentIndex}
            setCurrentIndex={(newIndex) => {
              setFullscreenData({
                ...fullscreenData,
                currentIndex: newIndex,
              });
            }}
            onClose={() => setFullscreenData(null)}
            groupCaption={fullscreenData.groupCaption}
          />
        )}
        <div className="bg-image-pattern is-system"></div>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div></div>}>
      <ChatPageContent />
    </Suspense>
  );
}
