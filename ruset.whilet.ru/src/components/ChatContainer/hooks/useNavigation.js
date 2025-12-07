import { useState } from "react";

export const useNavigation = () => {
  const [isExpandedMenu, setIsExpandedMenu] = useState(false);
  const [isExpandedChat, setIsExpandedChat] = useState(true);
  const [isExpandedProfile, setIsExpandedProfile] = useState(false);
  const [isExpandedNewChats, setIsExpandedNewChats] = useState(false);
  const [isExpandedGift, setIsExpandedGift] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const toggleMenuNewChats = () => {
    setIsExpandedNewChats(!isExpandedNewChats);
  };

  return {
    isExpandedMenu,
    setIsExpandedMenu,
    isExpandedChat,
    setIsExpandedChat,
    isExpandedProfile,
    setIsExpandedProfile,
    isExpandedNewChats,
    setIsExpandedNewChats,
    isExpandedGift,
    setIsExpandedGift,
    userProfile,
    setUserProfile,
    toggleMenuNewChats
  };
};