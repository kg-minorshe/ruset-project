import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useNavigation } from "./useNavigation";
import { useTheme } from "./useTheme";
import { useServiceWorker } from "./useServiceWorker";
import { Capacitor } from "@capacitor/core";
import { useCapacitorAuth } from "./useCapacitorAuth";

export const useChatContainer = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [fullscreenData, setFullscreenData] = useState(null);
  const [currentUser, setCurrentUser] = useState();
  const [chatKey, setChatKey] = useState(0);
  
  const isMountedRef = useRef(true);
  const initializedRef = useRef(false);

  const { getCurrentUser } = useAuth({ setCurrentUser, isMountedRef });
  const navigationState = useNavigation();
  const { initializeTheme } = useTheme();
  const { registerServiceWorker } = useServiceWorker();
  const { initializeCapacitorAuth } = useCapacitorAuth({ 
    getCurrentUser 
  });

  useEffect(() => {
    if (initializedRef.current) return;
    
    isMountedRef.current = true;
    initializeTheme();
    registerServiceWorker();
    
    getCurrentUser();
    
    if (Capacitor.isNativePlatform()) {
      initializeCapacitorAuth();
    }

    initializedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onChatSelect = useCallback((chat) => {
    if (!chat?.login) {
      console.error("Invalid chat data:", chat);
      return;
    }

    setSelectedChat((prevChat) => {
      if (prevChat?.login === chat.login) return prevChat;
      setChatKey(Date.now());
      return chat;
    });

    if (isMobile) {
      navigationState.setIsExpandedMenu(false);
    }
  }, [isMobile, navigationState]);

  const constants = {
    CHAT_TYPES: {
      PRIVATE: "private",
      GROUP: "group",
      CHANNEL: "channel",
      BOT: "bot",
    },
    USER_ROLES: {
      OWNER: "owner",
      ADMIN: "admin",
      MODERATOR: "moderator",
      MEMBER: "member",
      SUBSCRIBER: "subscriber",
    }
  };

  return {
    state: {
      selectedChat,
      isMobile,
      fullscreenData,
      currentUser,
      chatKey,
      ...navigationState
    },
    actions: {
      setSelectedChat,
      setIsMobile,
      setFullscreenData,
      setCurrentUser,
      setChatKey,
      onChatSelect,
      getCurrentUser,
      ...navigationState
    },
    constants
  };
};